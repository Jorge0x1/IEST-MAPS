import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db from '../config/db.js'

const router = Router()

function normalizeForUser(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function buildVisitorUsernameBase(fullName) {
  const parts = normalizeForUser(fullName)
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'visitante.usuario'
  }

  const firstName = parts[0]
  const lastName = parts.length > 1 ? parts[parts.length - 1] : 'usuario'
  return `${firstName}.${lastName}`
}

function buildTemporaryPassword() {
  const suffix = Math.floor(100000 + Math.random() * 900000)
  return `Visitante${suffix}`
}

router.get('/', async (req, res) => {
  try {
    const search = (req.query?.q || '').toString().trim()

    if (search) {
      const likeValue = `%${search}%`
      const [rows] = await db.execute(
        `SELECT id, nombre, usuario_visitante, motivo, destino, telefono, hora_entrada, hora_salida
         FROM registro_visitante
         WHERE nombre LIKE ? OR usuario_visitante LIKE ? OR destino LIKE ?
         ORDER BY id DESC
         LIMIT 200`,
        [likeValue, likeValue, likeValue],
      )

      return res.json({ ok: true, data: rows })
    }

    const [rows] = await db.execute(
      `SELECT id, nombre, usuario_visitante, motivo, destino, telefono, hora_entrada, hora_salida
       FROM registro_visitante
       ORDER BY id DESC
       LIMIT 200`,
    )

    return res.json({ ok: true, data: rows })
  } catch (_error) {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

router.post('/', async (req, res) => {
  try {
    const nombre = (req.body?.nombre || '').toString().trim()
    const incomingUsuarioVisitante = (req.body?.usuario || '').toString().trim()
    const incomingContrasena = (req.body?.contrasena || '').toString().trim()
    const motivo = (req.body?.motivo || '').toString().trim()
    const destino = (req.body?.destino || '').toString().trim()
    const telefono = (req.body?.telefono || '').toString().trim()

    if (!nombre || !motivo || !destino || !telefono) {
      return res.status(400).json({ ok: false, error: 'Nombre, telefono, motivo y destino son obligatorios' })
    }

    let usuarioVisitante = incomingUsuarioVisitante || `${buildVisitorUsernameBase(nombre)}.tmp`
    const contrasena = incomingContrasena || buildTemporaryPassword()

    const [result] = await db.execute(
      `INSERT INTO registro_visitante
      (nombre, usuario_visitante, contrasena, motivo, destino, telefono)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, usuarioVisitante, contrasena, motivo, destino, telefono],
    )

    if (!incomingUsuarioVisitante) {
      usuarioVisitante = `${buildVisitorUsernameBase(nombre)}.${result.insertId}`
      await db.execute(
        `UPDATE registro_visitante
         SET usuario_visitante = ?
         WHERE id = ?`,
        [usuarioVisitante, result.insertId],
      )
    }

    return res.status(201).json({
      ok: true,
      message: 'Visitante registrado con éxito',
      id: result.insertId,
      usuario: usuarioVisitante,
      contrasena,
      qrToken: jwt.sign(
        { registroId: Number(result.insertId), tipo: 'visitante_qr' },
        process.env.JWT_SECRET || 'change_this_secret',
        { expiresIn: '45m' },
      ),
    })
  } catch (_error) {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

router.post('/finalizar', async (req, res) => {
  try {
    const registroId = Number(req.body?.registroId)

    if (!Number.isInteger(registroId) || registroId <= 0) {
      return res.status(400).json({ ok: false, error: 'registroId inválido' })
    }

    const [result] = await db.execute(
      `UPDATE registro_visitante
       SET hora_salida = NOW()
       WHERE id = ? AND hora_salida IS NULL`,
      [registroId],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'No se encontró un viaje activo para finalizar' })
    }

    return res.json({ ok: true, message: 'Viaje finalizado con éxito' })
  } catch (_error) {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

export default router
