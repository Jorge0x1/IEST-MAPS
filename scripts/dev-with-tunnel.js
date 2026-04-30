const net = require('node:net')
const { spawn, spawnSync } = require('node:child_process')
const readline = require('node:readline')

const DEFAULT_API_PORT = 3001
const DEFAULT_WEB_PORT = 5174
const isWindows = process.platform === 'win32'

const children = []

function prefixStream(stream, label) {
  const lines = readline.createInterface({ input: stream })
  lines.on('line', (line) => {
    console.log(`[${label}] ${line}`)

    const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
    if (match) {
      console.log(`\nTUNNEL URL: ${match[0]}\n`)
    }
  })
}

function spawnProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
    ...options,
  })

  children.push(child)

  child.on('error', (error) => {
    console.error(`[${label}] ${error.message}`)
    shutdown(1)
  })

  if (child.stdout) {
    prefixStream(child.stdout, label)
  }

  if (child.stderr) {
    prefixStream(child.stderr, label)
  }

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] terminó por ${signal}`)
    } else {
      console.log(`[${label}] salió con código ${code}`)
    }

    if (label !== 'TUNNEL' && code && code !== 0) {
      shutdown(code)
    }
  })

  return child
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  setTimeout(() => process.exit(code), 500)
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1))
        return
      }

      reject(error)
    })

    server.listen(startPort, () => {
      const address = server.address()
      server.close(() => {
        resolve(typeof address === 'object' && address ? address.port : startPort)
      })
    })
  })
}

function isCloudflaredAvailable() {
  const probe = spawnSync(
    isWindows ? 'cmd.exe' : 'cloudflared',
    isWindows ? ['/d', '/s', '/c', 'cloudflared --version'] : ['--version'],
    {
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
    },
  )

  return !probe.error && probe.status === 0
}

async function main() {
  const apiPort = await findAvailablePort(DEFAULT_API_PORT)
  const webPort = await findAvailablePort(DEFAULT_WEB_PORT)
  const webUrl = `http://localhost:${webPort}`
  const apiBaseUrl = `http://localhost:${apiPort}/api`

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  console.log('==> Preparando arranque con túnel...')
  console.log(`==> API en puerto ${apiPort}, web en puerto ${webPort}`)
  console.log('==> Si cloudflared imprime la URL, también verás una línea TUNNEL URL arriba.')

  const apiArgs = isWindows
    ? ['/d', '/s', '/c', 'npm --prefix iestmaps_api run dev']
    : ['--prefix', 'iestmaps_api', 'run', 'dev']

  const webArgs = isWindows
    ? ['/d', '/s', '/c', `npm --prefix iestmaps_react run dev -- --port ${webPort} --strictPort`]
    : ['--prefix', 'iestmaps_react', 'run', 'dev', '--', '--port', String(webPort), '--strictPort']

  spawnProcess('API', isWindows ? 'cmd.exe' : 'npm', apiArgs, {
    env: {
      ...process.env,
      PORT: String(apiPort),
      FRONTEND_URL: webUrl,
    },
  })

  spawnProcess('WEB', isWindows ? 'cmd.exe' : 'npm', webArgs, {
    env: {
      ...process.env,
      VITE_API_BASE_URL: apiBaseUrl,
    },
  })

  if (isCloudflaredAvailable()) {
    const tunnelArgs = isWindows
      ? ['/d', '/s', '/c', `cloudflared --url ${webUrl} --no-autoupdate`]
      : ['--url', webUrl, '--no-autoupdate']

    spawnProcess('TUNNEL', isWindows ? 'cmd.exe' : 'cloudflared', tunnelArgs)
  } else {
    console.warn('[TUNNEL] cloudflared no está instalado o no está en PATH. Se continúa sin túnel.')
    console.log('==> Usa npm run dev:no-tunnel si solo quieres API + web local.')
  }
}

main().catch((error) => {
  console.error('==> No se pudo preparar el arranque.')
  console.error(error?.message || error)
  shutdown(1)
})
