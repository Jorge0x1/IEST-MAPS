const fs = require('fs/promises')
const path = require('path')
const { spawnSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const envFiles = [path.join(rootDir, 'iestmaps_api', '.env'), path.join(rootDir, '.env')]
const sqlPath = path.join(rootDir, 'iestmaps_react', 'iest_maps_db.sql')

function parseEnvFile(filePath) {
  try {
    const content = require('fs').readFileSync(filePath, 'utf8')
    const parsed = {}

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const separatorIndex = line.indexOf('=')
      if (separatorIndex < 0) continue

      const key = line.slice(0, separatorIndex).trim()
      let value = line.slice(separatorIndex + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      parsed[key] = value
    }

    return parsed
  } catch {
    return {}
  }
}

const envConfig = {
  ...parseEnvFile(envFiles[1]),
  ...parseEnvFile(envFiles[0]),
}

const dbConfig = {
  host: envConfig.DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(envConfig.DB_PORT || process.env.DB_PORT || 3306),
  user: envConfig.DB_USER || process.env.DB_USER || 'root',
  password: envConfig.DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: envConfig.DB_NAME || process.env.DB_NAME || 'iest_maps',
}

function getMysqlExecutable() {
  const envExecutable = process.env.MYSQL_CLI_PATH || envConfig.MYSQL_CLI_PATH
  if (envExecutable) {
    return envExecutable
  }

  if (process.platform === 'win32') {
    const xamppMysql = 'C:\\xampp\\mysql\\bin\\mysql.exe'
    return xamppMysql
  }

  return 'mysql'
}

function buildMysqlArgs(extraArgs = []) {
  const args = ['-h', dbConfig.host, '-P', String(dbConfig.port), '-u', dbConfig.user]
  if (dbConfig.password) {
    args.push(`-p${dbConfig.password}`)
  }

  return [...args, ...extraArgs]
}

function runMysqlCommand(extraArgs, input) {
  const mysqlExecutable = getMysqlExecutable()
  const result = spawnSync(mysqlExecutable, buildMysqlArgs(extraArgs), {
    input,
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim()
    throw new Error(stderr || `mysql exited with code ${result.status}`)
  }

  return (result.stdout || '').trim()
}

function ensureMysqlCliAvailable() {
  try {
    runMysqlCommand(['--version'])
    return true
  } catch (error) {
    const message = String(error?.message || '').toLowerCase()
    const looksMissing =
      message.includes('enoent') ||
      message.includes('not found') ||
      message.includes('cannot find') ||
      message.includes('is not recognized')

    if (looksMissing) {
      return false
    }

    return true
  }
}

function databaseHasTables() {
  const stdout = runMysqlCommand([
    '-Nse',
    `SHOW TABLES FROM \`${dbConfig.database}\`;`,
  ])

  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length > 0
}

function ensureDatabaseExists() {
  runMysqlCommand([
    '-e',
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`,
  ])
}

function importSqlDump() {
  const sql = require('fs').readFileSync(sqlPath, 'utf8')
  runMysqlCommand(['-D', dbConfig.database], sql)
}

async function main() {
  console.log('==> Preparando base de datos...')

  if (!ensureMysqlCliAvailable()) {
    console.warn('==> No se encontró el cliente mysql. Se omite la preparación automática de BD y se continúa con dev.')
    return
  }

  ensureDatabaseExists()

  const hasTables = databaseHasTables()
  if (hasTables) {
    console.log(`==> La base de datos ${dbConfig.database} ya tiene tablas. No se vuelve a importar.`)
    return
  }

  console.log(`==> Importando ${path.relative(rootDir, sqlPath)}...`)
  importSqlDump()
  console.log('==> Base de datos lista.')
}

main().catch((error) => {
  console.error('==> No se pudo preparar la base de datos.')
  console.error(error?.message || error)
  process.exit(1)
})