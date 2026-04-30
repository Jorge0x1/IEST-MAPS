const { execSync } = require('node:child_process')

const PORTS = [3001, 5174]
const isWindows = process.platform === 'win32'

function killPort(port) {
  try {
    if (isWindows) {
      // En Windows, buscar PID usando netstat y matar con taskkill
      const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
      const lines = netstatOutput.trim().split('\n')
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        
        if (pid && pid !== 'PID' && !isNaN(pid)) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
            console.log(`✓ Proceso en puerto ${port} terminado (PID: ${pid})`)
          } catch (error) {
            // Ignorar errores si el proceso ya está muerto
          }
        }
      }
    } else {
      // En Mac/Linux, usar lsof y kill
      const lsofOutput = execSync(`lsof -i :${port}`, { encoding: 'utf8' })
      const lines = lsofOutput.trim().split('\n').slice(1) // Saltar header
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const pid = parts[1]
        
        if (pid && !isNaN(pid)) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
            console.log(`✓ Proceso en puerto ${port} terminado (PID: ${pid})`)
          } catch (error) {
            // Ignorar errores
          }
        }
      }
    }
  } catch (error) {
    // Puerto probablemente está libre
  }
}

console.log('==> Liberando puertos ocupados...')
for (const port of PORTS) {
  killPort(port)
}

setTimeout(() => {
  console.log('==> Puertos listos para usar.')
}, 500)
