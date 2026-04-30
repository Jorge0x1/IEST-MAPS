import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../config/db.js'

const router = Router()
const allowedRedirectUriRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/auth\/google\/callback$/i
const allowedTunnelRedirectUriRegex = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/auth\/google\/callback$/i

async function passwordMatches(plainPassword, storedPassword) {
  if (!storedPassword) return false

  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return bcrypt.compare(plainPassword, storedPassword)
  }

  return plainPassword === storedPassword
}

function getAllowedGoogleDomains() {
  const rawValue = (process.env.GOOGLE_ALLOWED_DOMAINS || 'iest.edu.mx').trim()
  if (!rawValue) return []

  return rawValue
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
}

function isSchoolEmailAllowed(email) {
  const atIndex = email.lastIndexOf('@')
  if (atIndex < 0) return false

  const emailDomain = email.slice(atIndex + 1).toLowerCase()
  const allowedDomains = getAllowedGoogleDomains()
  if (allowedDomains.length === 0) return true

  return allowedDomains.includes(emailDomain)
}

function resolveGoogleRedirectUri(redirectUriCandidate) {
  const normalizedCandidate = (redirectUriCandidate || '').toString().trim()
  if (
    normalizedCandidate &&
    (allowedRedirectUriRegex.test(normalizedCandidate) || allowedTunnelRedirectUriRegex.test(normalizedCandidate))
  ) {
    return normalizedCandidate
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  return process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/auth/google/callback`
}

async function exchangeGoogleCodeForUserData(code, redirectUriCandidate) {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const redirectUri = resolveGoogleRedirectUri(redirectUriCandidate)

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Falta configurar GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI')
  }

  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams,
  })

  const tokenData = await tokenResponse.json()
  if (!tokenResponse.ok || !tokenData?.access_token) {
    const tokenError = tokenData?.error || ''
    const tokenDescription = tokenData?.error_description || ''
    const message = [tokenError, tokenDescription].filter(Boolean).join(': ') || 'No se pudo obtener access_token de Google'
    throw new Error(message)
  }

  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })

  const userData = await userResponse.json()
  if (!userResponse.ok || !userData?.email) {
    const message = userData?.error?.message || 'No se pudo obtener información del usuario de Google'
    throw new Error(message)
  }

  return userData
}

router.post('/login', async (req, res) => {
  try {
    const { usuario = '', contrasena = '' } = req.body || {}

    if (!usuario.trim() || !contrasena.trim()) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son obligatorios' })
    }

    // Primero, buscar en tabla usuarios (guardia, administrador, etc.)
    const [usuariosDb] = await db.execute(
      'SELECT usuario, nombre, rol, contrasena FROM usuarios WHERE usuario = ? LIMIT 1',
      [usuario],
    )

    if (usuariosDb.length > 0) {
      const usuarioDb = usuariosDb[0]
      const isValidUser = await passwordMatches(contrasena, usuarioDb.contrasena)

      if (isValidUser) {
        // Devolver el rol exacto de la tabla, normalizado a minúsculas
        const rolNormalizado = (usuarioDb.rol || 'usuario').toLowerCase()

        // Determinar redirección según el rol
        let redirectTo = '/inicio'
        if (rolNormalizado === 'administrador') {
          redirectTo = '/admin/usuarios'
        } else if (rolNormalizado === 'guardia') {
          redirectTo = '/guardia'
        }

        const token = jwt.sign(
          { usuario: usuarioDb.nombre || usuario, rol: rolNormalizado },
          process.env.JWT_SECRET || 'change_this_secret',
          { expiresIn: '8h' },
        )

        return res.json({
          ok: true,
          usuario: usuarioDb.nombre || usuario,
          rol: rolNormalizado,
          redirectTo,
          token,
        })
      }
    }

    // Luego, buscar en registro_visitante como fallback
    const [visitantes] = await db.execute(
      `SELECT id, nombre, contrasena, destino
       FROM registro_visitante
       WHERE usuario_visitante = ?
       ORDER BY id DESC
       LIMIT 1`,
      [usuario],
    )

    if (visitantes.length > 0) {
      const visitante = visitantes[0]
      const isValidVisitante = await passwordMatches(contrasena, visitante.contrasena)

      if (isValidVisitante) {
        const token = jwt.sign(
          { usuario: visitante.nombre, rol: 'visitante' },
          process.env.JWT_SECRET || 'change_this_secret',
          { expiresIn: '8h' },
        )

        return res.json({
          ok: true,
          usuario: visitante.nombre,
          rol: 'visitante',
          redirectTo: '/visitante',
          visitanteRegistroId: Number(visitante.id),
          visitanteDestino: visitante.destino,
          visitanteOrigen: 'Entrada Principal',
          token,
        })
      }
    }

    return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' })
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

router.post('/google', async (req, res) => {
  try {
    const code = (req.body?.code || '').toString().trim()
    const redirectUri = (req.body?.redirectUri || '').toString().trim()
    if (!code) {
      return res.status(400).json({ ok: false, error: 'Falta el código de autenticación de Google' })
    }

    const userData = await exchangeGoogleCodeForUserData(code, redirectUri)
    const email = String(userData.email || '').trim().toLowerCase()
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Google no devolvió un correo válido' })
    }

    if (!isSchoolEmailAllowed(email)) {
      return res.status(403).json({ ok: false, error: 'Solo se permite iniciar sesión con correo institucional' })
    }

    const nombreVisual = email.split('@')[0]

    const [existingUsers] = await db.execute('SELECT ID_IEST FROM usuarios WHERE usuario = ? LIMIT 1', [email])

    if (existingUsers.length === 0) {
      await db.execute(
        `INSERT INTO usuarios (nombre, usuario, rol, contrasena)
         VALUES (?, ?, ?, ?)`,
        [nombreVisual, email, 'Alumno', ''],
      )
    }

    const token = jwt.sign(
      {
        usuario: nombreVisual,
        email,
        rol: 'usuario',
      },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '8h' },
    )

    return res.json({
      ok: true,
      usuario: nombreVisual,
      rol: 'usuario',
      redirectTo: '/inicio',
      token,
    })
  } catch (error) {
    const message = (error && typeof error.message === 'string' && error.message.trim())
      ? error.message
      : 'No se pudo iniciar sesión con Google'

    const normalizedMessage = message.toLowerCase()
    if (normalizedMessage.includes('invalid_grant') || normalizedMessage === 'bad request') {
      return res.status(400).json({ ok: false, error: 'El código de Google expiró o ya fue usado. Intenta de nuevo.' })
    }

    return res.status(500).json({ ok: false, error: message })
  }
})

router.post('/visitante-qr-login', async (req, res) => {
  try {
    const qrToken = (req.body?.token || '').toString().trim()
    if (!qrToken) {
      return res.status(400).json({ ok: false, error: 'Token QR requerido' })
    }

    let payload
    try {
      payload = jwt.verify(qrToken, process.env.JWT_SECRET || 'change_this_secret')
    } catch {
      return res.status(401).json({ ok: false, error: 'Token QR invalido o expirado' })
    }

    const registroId = Number(payload?.registroId)
    const tipo = String(payload?.tipo || '')
    if (!Number.isInteger(registroId) || registroId <= 0 || tipo !== 'visitante_qr') {
      return res.status(400).json({ ok: false, error: 'Token QR no valido para acceso visitante' })
    }

    const [visitantes] = await db.execute(
      `SELECT id, nombre, destino
       FROM registro_visitante
       WHERE id = ?
       LIMIT 1`,
      [registroId],
    )

    if (visitantes.length === 0) {
      return res.status(404).json({ ok: false, error: 'No se encontro el visitante asociado al QR' })
    }

    const visitante = visitantes[0]
    const token = jwt.sign(
      { usuario: visitante.nombre, rol: 'visitante' },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '8h' },
    )

    return res.json({
      ok: true,
      usuario: visitante.nombre,
      rol: 'visitante',
      redirectTo: '/visitante',
      visitanteRegistroId: Number(visitante.id),
      visitanteDestino: visitante.destino,
      visitanteOrigen: 'Entrada Principal',
      token,
    })
  } catch {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

export default router
