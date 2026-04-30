const fs = require('fs/promises')
const path = require('path')
const dotenv = require('dotenv')
const mysql = require('mysql2/promise')

const rootDir = path.resolve(__dirname, '..')
const envFiles = [path.join(rootDir, 'iestmaps_api', '.env'), path.join(rootDir, '.env')]
const sqlPath = path.join(rootDir, 'iestmaps_react', 'iest_maps_db.sql')

dotenv.config({ path: envFiles[1], override: false })
dotenv.config({ path: envFiles[0], override: true })

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iest_maps',
}

async function ensureDatabaseExists() {
  const serverConnection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  })

  try {
    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`,
    )
  } finally {
    await serverConnection.end()
  }
}

async function databaseHasTables() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    multipleStatements: true,
  })

  try {
    const [tables] = await connection.query('SHOW TABLES')
    return Array.isArray(tables) && tables.length > 0
  } finally {
    await connection.end()
  }
}

async function importSqlDump() {
  const sql = await fs.readFile(sqlPath, 'utf8')
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    multipleStatements: true,
  })

  try {
    await connection.query(sql)
  } finally {
    await connection.end()
  }
}

async function main() {
  console.log('==> Preparando base de datos...')
  await ensureDatabaseExists()

  const hasTables = await databaseHasTables()
  if (hasTables) {
    console.log(`==> La base de datos ${dbConfig.database} ya tiene tablas. No se vuelve a importar.`)
    return
  }

  console.log(`==> Importando ${path.relative(rootDir, sqlPath)}...`)
  await importSqlDump()
  console.log('==> Base de datos lista.')
}

main().catch((error) => {
  console.error('==> No se pudo preparar la base de datos.')
  console.error(error?.message || error)
  process.exit(1)
})