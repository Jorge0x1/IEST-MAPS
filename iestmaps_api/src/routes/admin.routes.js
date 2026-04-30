import { Router } from 'express'
import db from '../config/db.js'

const router = Router()

async function resolveOficinaTextColumn() {
  const [columns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'oficina'
       AND COLUMN_NAME IN ('lugar', 'area')`,
  )

  const available = new Set(columns.map((column) => String(column.COLUMN_NAME).toLowerCase()))

  if (available.has('lugar')) {
    return 'lugar'
  }

  if (available.has('area')) {
    return 'area'
  }

  return null
}

router.get('/usuarios', async (req, res) => {
  try {
    const idPrefix = (req.query?.idPrefix || '').toString().trim()

    if (idPrefix) {
      const likeValue = `${idPrefix}%`
      const [usuarios] = await db.execute(
        `SELECT ID_IEST, nombre, usuario, rol, contrasena
         FROM usuarios
         WHERE CAST(ID_IEST AS CHAR) LIKE ?
         ORDER BY nombre`,
        [likeValue],
      )

      return res.json({ ok: true, usuarios })
    }

    const [usuarios] = await db.execute(
      `SELECT ID_IEST, nombre, usuario, rol, contrasena
       FROM usuarios
       ORDER BY nombre`,
    )

    return res.json({ ok: true, usuarios })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo cargar usuarios' })
  }
})

router.post('/usuarios', async (req, res) => {
  try {
    const nombre = (req.body?.nombre || '').toString().trim()
    const usuario = (req.body?.usuario || '').toString().trim()
    const rol = (req.body?.rol || '').toString().trim()
    const contrasena = (req.body?.contrasena || '').toString().trim()

    if (!nombre || !usuario || !rol || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Todos los campos son obligatorios' })
    }

    await db.execute(
      `INSERT INTO usuarios (nombre, usuario, rol, contrasena)
       VALUES (?, ?, ?, ?)`,
      [nombre, usuario, rol, contrasena],
    )

    return res.status(201).json({ ok: true, message: 'Usuario registrado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo crear el usuario' })
  }
})

router.put('/usuarios/:id', async (req, res) => {
  try {
    const idOriginal = Number(req.params.id)
    const idIest = Number(req.body?.idIest)
    const nombre = (req.body?.nombre || '').toString().trim()
    const usuario = (req.body?.usuario || '').toString().trim()
    const rol = (req.body?.rol || '').toString().trim()
    const contrasena = (req.body?.contrasena || '').toString().trim()

    if (!Number.isInteger(idOriginal) || idOriginal <= 0 || !Number.isInteger(idIest) || idIest <= 0) {
      return res.status(400).json({ ok: false, error: 'ID inválido' })
    }

    if (!nombre || !usuario || !rol || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Todos los campos son obligatorios' })
    }

    const [result] = await db.execute(
      `UPDATE usuarios
       SET ID_IEST = ?, nombre = ?, usuario = ?, rol = ?, contrasena = ?
       WHERE ID_IEST = ?`,
      [idIest, nombre, usuario, rol, contrasena, idOriginal],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    }

    return res.json({ ok: true, message: 'Usuario modificado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el usuario' })
  }
})

router.delete('/usuarios/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID inválido' })
    }

    const [result] = await db.execute('DELETE FROM usuarios WHERE ID_IEST = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    }

    return res.json({ ok: true, message: 'Usuario eliminado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar el usuario' })
  }
})

router.post('/maestros', async (req, res) => {
  try {
    const idIest = Number(req.body?.idIest)
    const nombre = (req.body?.nombre || '').toString().trim()
    const usuario = (req.body?.usuario || '').toString().trim()
    const area = (req.body?.area || '').toString().trim()
    const idOficina = Number(req.body?.idOficina)
    const contrasena = (req.body?.contrasena || '').toString().trim()

    if (!Number.isInteger(idIest) || idIest <= 0 || !Number.isInteger(idOficina) || idOficina <= 0) {
      return res.status(400).json({ ok: false, error: 'ID inválido' })
    }

    if (!nombre || !usuario || !area || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Todos los campos son obligatorios' })
    }

    await db.execute(
      `INSERT INTO maestros_base (ID_IEST, nombre, usuario, area, ID_oficina, contrasena)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idIest, nombre, usuario, area, idOficina, contrasena],
    )

    return res.status(201).json({ ok: true, message: 'Maestro base registrado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo crear el maestro base' })
  }
})

router.put('/maestros/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const area = (req.body?.area || '').toString().trim()
    const idOficina = Number(req.body?.idOficina)

    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(idOficina) || idOficina <= 0) {
      return res.status(400).json({ ok: false, error: 'ID inválido' })
    }

    if (!area) {
      return res.status(400).json({ ok: false, error: 'Área es obligatoria' })
    }

    const [result] = await db.execute(
      `UPDATE maestros_base
       SET area = ?, ID_oficina = ?
       WHERE ID_IEST = ?`,
      [area, idOficina, id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Maestro base no encontrado' })
    }

    return res.json({ ok: true, message: 'Maestro base modificado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el maestro base' })
  }
})

router.delete('/maestros/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID inválido' })
    }

    const [result] = await db.execute('DELETE FROM maestros_base WHERE ID_IEST = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Maestro base no encontrado' })
    }

    return res.json({ ok: true, message: 'Maestro base eliminado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar el maestro base' })
  }
})

router.get('/salones-oficinas', async (_req, res) => {
  try {
    const oficinaTextColumn = await resolveOficinaTextColumn()
    if (!oficinaTextColumn) {
      return res.status(500).json({ ok: false, error: 'La tabla oficina no tiene columna lugar/area' })
    }

    const [salones] = await db.execute(
      `SELECT numero_salon, edificio, piso, uso
       FROM salones
       ORDER BY numero_salon`,
    )

    const [oficinas] = await db.execute(
      `SELECT ID_oficina, edificio, piso, ${oficinaTextColumn} AS lugar
       FROM oficina
       ORDER BY ${oficinaTextColumn}`,
    )

    return res.json({ ok: true, salones, oficinas })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo cargar salones y oficinas' })
  }
})

router.post('/salones', async (req, res) => {
  try {
    const numeroSalon = Number(req.body?.numeroSalon)
    const edificio = Number(req.body?.edificio)
    const piso = Number(req.body?.piso)
    const uso = (req.body?.uso || '').toString().trim()

    if (!Number.isInteger(numeroSalon) || !Number.isInteger(edificio) || !Number.isInteger(piso) || !uso) {
      return res.status(400).json({ ok: false, error: 'Datos inválidos para salón' })
    }

    await db.execute(
      `INSERT INTO salones (numero_salon, edificio, piso, uso)
       VALUES (?, ?, ?, ?)`,
      [numeroSalon, edificio, piso, uso],
    )

    return res.status(201).json({ ok: true, message: 'Salón creado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo crear el salón' })
  }
})

router.put('/salones/:numero', async (req, res) => {
  try {
    const numeroOriginal = Number(req.params.numero)
    const numeroSalon = Number(req.body?.numeroSalon)
    const edificio = Number(req.body?.edificio)
    const piso = Number(req.body?.piso)
    const uso = (req.body?.uso || '').toString().trim()

    if (
      !Number.isInteger(numeroOriginal) ||
      !Number.isInteger(numeroSalon) ||
      !Number.isInteger(edificio) ||
      !Number.isInteger(piso) ||
      !uso
    ) {
      return res.status(400).json({ ok: false, error: 'Datos inválidos para salón' })
    }

    const [result] = await db.execute(
      `UPDATE salones
       SET numero_salon = ?, edificio = ?, piso = ?, uso = ?
       WHERE numero_salon = ?`,
      [numeroSalon, edificio, piso, uso, numeroOriginal],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Salón no encontrado' })
    }

    return res.json({ ok: true, message: 'Salón modificado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el salón' })
  }
})

router.delete('/salones/:numero', async (req, res) => {
  try {
    const numero = Number(req.params.numero)
    if (!Number.isInteger(numero)) {
      return res.status(400).json({ ok: false, error: 'Número de salón inválido' })
    }

    const [result] = await db.execute('DELETE FROM salones WHERE numero_salon = ?', [numero])
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Salón no encontrado' })
    }

    return res.json({ ok: true, message: 'Salón eliminado con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar el salón' })
  }
})

router.post('/oficinas', async (req, res) => {
  try {
    const oficinaTextColumn = await resolveOficinaTextColumn()
    if (!oficinaTextColumn) {
      return res.status(500).json({ ok: false, error: 'La tabla oficina no tiene columna lugar/area' })
    }

    const idOficina = Number(req.body?.idOficina)
    const edificio = Number(req.body?.edificio)
    const piso = Number(req.body?.piso)
    const lugar = (req.body?.lugar || req.body?.area || '').toString().trim()

    if (!Number.isInteger(idOficina) || !Number.isInteger(edificio) || !Number.isInteger(piso) || !lugar) {
      return res.status(400).json({ ok: false, error: 'Datos inválidos para oficina' })
    }

    await db.execute(
      `INSERT INTO oficina (ID_oficina, edificio, piso, ${oficinaTextColumn})
       VALUES (?, ?, ?, ?)`,
      [idOficina, edificio, piso, lugar],
    )

    return res.status(201).json({ ok: true, message: 'Oficina creada con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo crear la oficina' })
  }
})

router.put('/oficinas/:id', async (req, res) => {
  try {
    const oficinaTextColumn = await resolveOficinaTextColumn()
    if (!oficinaTextColumn) {
      return res.status(500).json({ ok: false, error: 'La tabla oficina no tiene columna lugar/area' })
    }

    const idOriginal = Number(req.params.id)
    const idOficina = Number(req.body?.idOficina)
    const edificio = Number(req.body?.edificio)
    const piso = Number(req.body?.piso)
    const lugar = (req.body?.lugar || req.body?.area || '').toString().trim()

    if (
      !Number.isInteger(idOriginal) ||
      !Number.isInteger(idOficina) ||
      !Number.isInteger(edificio) ||
      !Number.isInteger(piso) ||
      !lugar
    ) {
      return res.status(400).json({ ok: false, error: 'Datos inválidos para oficina' })
    }

    const [result] = await db.execute(
      `UPDATE oficina
       SET ID_oficina = ?, edificio = ?, piso = ?, ${oficinaTextColumn} = ?
       WHERE ID_oficina = ?`,
      [idOficina, edificio, piso, lugar, idOriginal],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Oficina no encontrada' })
    }

    return res.json({ ok: true, message: 'Oficina modificada con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar la oficina' })
  }
})

router.delete('/oficinas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: 'ID de oficina inválido' })
    }

    const [result] = await db.execute('DELETE FROM oficina WHERE ID_oficina = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Oficina no encontrada' })
    }

    return res.json({ ok: true, message: 'Oficina eliminada con éxito' })
  } catch {
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar la oficina' })
  }
})

export default router
