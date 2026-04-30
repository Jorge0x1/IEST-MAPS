import { Router } from 'express'
import db from '../config/db.js'

const router = Router()

router.post('/lookup', async (req, res) => {
  try {
    const numeroSalon = (req.body?.numero_salon || '').toString().trim()

    if (!numeroSalon) {
      return res.status(400).json({ ok: false, error: 'Debes enviar numero_salon' })
    }

    const [salones] = await db.execute('SELECT ruta FROM salones WHERE numero_salon = ? LIMIT 1', [numeroSalon])

    if (salones.length > 0) {
      return res.json({ ok: true, ruta: Number(salones[0].ruta) })
    }

    const [oficinas] = await db.execute('SELECT ruta FROM oficina WHERE LOWER(lugar) = LOWER(?) LIMIT 1', [numeroSalon])

    if (oficinas.length > 0) {
      return res.json({ ok: true, ruta: Number(oficinas[0].ruta) })
    }

    return res.status(404).json({ ok: false, error: 'Lugar no encontrado' })
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

export default router
