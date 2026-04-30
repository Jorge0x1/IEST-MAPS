const { execSync } = require('node:child_process')

const PORTS = [3001, 5174]
const isWindows = process.platform === 'win32'

function killPort(port) {
  try {
    if (isWindows) {
      // En Windows, usar taskkill directamente con el puerto
      try {
        execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: 'pipe' })
        // Si hay resultado, intentar matar
        execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`, { 
          encoding: 'utf8',
          shell: true,
          stdio: 'ignore' 
        })
        console.log(`✓ Procesos en puerto ${port} terminados`)
      } catch {
        // Puerto está libre
      }
    } else {
      // En Mac/Linux
      try {
        execSync(`lsof -i :${port} -t | xargs kill -9`, { stdio: 'ignore' })
        console.log(`✓ Procesos en puerto ${port} terminados`)
      } catch {
        // Puerto está libre
      }
    }
  } catch (error) {
    // Ignorar errores
  }
}

console.log('==> Verificando puertos...')
for (const port of PORTS) {
  killPort(port)
}

console.log('==> Puertos listos.')
