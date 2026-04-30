const fs = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const readline = require('node:readline')

const API_PORT = 3001
const WEB_PORT = 5174
const isWindows = process.platform === 'win32'
const localCloudflaredPath = path.resolve(__dirname, 'bin', isWindows ? 'cloudflared.exe' : 'cloudflared')

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

function getCloudflaredCommand() {
  if (fs.existsSync(localCloudflaredPath)) {
    return localCloudflaredPath
  }

  return 'cloudflared'
}

function isCloudflaredAvailable() {
  const command = getCloudflaredCommand()
  const probe = spawnSync(
    isWindows && command === 'cloudflared' ? 'cmd.exe' : command,
    isWindows && command === 'cloudflared' ? ['/d', '/s', '/c', 'cloudflared --version'] : ['--version'],
    {
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
    },
  )

  return !probe.error && probe.status === 0
}

async function main() {
  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  const webUrl = `http://localhost:${WEB_PORT}`
  const apiUrl = `http://localhost:${API_PORT}/api`

  console.log('==> Preparando arranque con túnel...')
  console.log(`==> API en puerto ${API_PORT}, frontend en puerto ${WEB_PORT}`)
  console.log('==> Si cloudflared imprime la URL, también verás una línea TUNNEL URL arriba.')

  const apiArgs = isWindows
    ? ['/d', '/s', '/c', 'npm --prefix iestmaps_api run dev']
    : ['--prefix', 'iestmaps_api', 'run', 'dev']

  const webArgs = isWindows
    ? ['/d', '/s', '/c', `npm --prefix iestmaps_react run dev -- --port ${WEB_PORT} --strictPort`]
    : ['--prefix', 'iestmaps_react', 'run', 'dev', '--', '--port', String(WEB_PORT), '--strictPort']

  spawnProcess('API', isWindows ? 'cmd.exe' : 'npm', apiArgs, {
    env: {
      ...process.env,
      PORT: String(API_PORT),
      FRONTEND_URL: webUrl,
    },
  })

  spawnProcess('WEB', isWindows ? 'cmd.exe' : 'npm', webArgs, {
    env: {
      ...process.env,
      VITE_API_BASE_URL: apiUrl,
    },
  })

  if (isCloudflaredAvailable()) {
    const cloudflaredCommand = getCloudflaredCommand()
    const tunnelArgs = isWindows
      ? ['/d', '/s', '/c', `cloudflared --url ${webUrl} --no-autoupdate`]
      : ['--url', webUrl, '--no-autoupdate']

    if (isWindows && cloudflaredCommand !== 'cloudflared') {
      spawnProcess('TUNNEL', cloudflaredCommand, ['--url', webUrl, '--no-autoupdate'])
    } else {
      spawnProcess('TUNNEL', isWindows ? 'cmd.exe' : 'cloudflared', tunnelArgs)
    }
  } else {
    console.warn('[TUNNEL] cloudflared no está instalado o no está en PATH. Se continúa sin túnel.')
    console.warn(`[TUNNEL] También se buscó binario local en: ${localCloudflaredPath}`)
    console.log('==> Usa npm run dev:no-tunnel si solo quieres API + web local.')
  }
}

main().catch((error) => {
  console.error('==> No se pudo preparar el arranque.')
  console.error(error?.message || error)
  shutdown(1)
})
