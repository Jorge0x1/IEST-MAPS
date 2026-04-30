import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import db, { checkDbConnection } from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import rutaRoutes from './routes/ruta.routes.js'
import visitantesRoutes from './routes/visitantes.routes.js'
import adminRoutes from './routes/admin.routes.js'

const app = express()
const port = Number(process.env.PORT || 3000)
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
const tryCloudflareOriginRegex = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i

const allowedOrigins = new Set([
  frontendUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
])

function isAllowedFrontendOrigin(origin) {
  if (!origin || typeof origin !== 'string') {
    return false
  }

  return allowedOrigins.has(origin) || tryCloudflareOriginRegex.test(origin)
}

function resolveGoogleRedirectUri(req) {
  const requestOrigin = (req.headers.origin || '').toString().trim()
  if (isAllowedFrontendOrigin(requestOrigin)) {
    return `${requestOrigin}/auth/google/callback`
  }

  return process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/auth/google/callback`
}

app.use(
  cors({
    origin(origin, callback) {
      const isTryCloudflareOrigin = typeof origin === 'string' && tryCloudflareOriginRegex.test(origin)

      if (!origin || allowedOrigins.has(origin) || isTryCloudflareOrigin) {
        callback(null, true)
        return
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    return res.json({ status: 'ok', message: 'Conexión a BD exitosa' })
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'BD no disponible' })
  }
})

app.get('/api/google-auth-url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const redirectUri = resolveGoogleRedirectUri(req)
  const allowedDomain = (process.env.GOOGLE_ALLOWED_DOMAINS || '').split(',')[0]?.trim()

  if (!clientId || !redirectUri) {
    return res.status(500).json({ ok: false, error: 'Falta configurar GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI' })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'select_account consent',
  })

  if (allowedDomain) {
    params.set('hd', allowedDomain)
  }

  return res.json({
    ok: true,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/ruta', rutaRoutes)
app.use('/api/visitantes', visitantesRoutes)
app.use('/api/admin', adminRoutes)

app.listen(port, async () => {
  try {
    await checkDbConnection()
    console.log(`✅ API corriendo en puerto ${port}`)
    console.log('✅ Conectado a MySQL')
  } catch (error) {
    console.error('❌ API iniciada, pero no se pudo conectar a MySQL')
  }
})
