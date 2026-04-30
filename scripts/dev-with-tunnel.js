
const { spawn } = require('node:child_process')
const readline = require('node:readline')

const webUrl = 'http://localhost:5174'
const isWindows = process.platform === 'win32'
const npmCommand = isWindows ? 'cmd.exe' : 'npm'
const cloudflaredCommand = isWindows ? 'cmd.exe' : 'cloudflared'

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

    if (code && code !== 0) {
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

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('==> Preparando arranque con túnel...')
console.log('==> Si cloudflared imprime la URL, también verás una línea TUNNEL URL arriba.')

if (isWindows) {
  spawnProcess('API', npmCommand, ['/d', '/s', '/c', 'npm --prefix iestmaps_api run dev'], {
    env: {
      ...process.env,
      PORT: '3001',
      FRONTEND_URL: webUrl,
    },
  })

  spawnProcess('WEB', npmCommand, ['/d', '/s', '/c', 'npm --prefix iestmaps_react run dev -- --port 5174 --strictPort'])
  spawnProcess('TUNNEL', cloudflaredCommand, ['/d', '/s', '/c', 'cloudflared --url http://localhost:5174 --no-autoupdate'])
} else {
  spawnProcess('API', npmCommand, ['--prefix', 'iestmaps_api', 'run', 'dev'], {
    env: {
      ...process.env,
      PORT: '3001',
      FRONTEND_URL: webUrl,
    },
  })

  spawnProcess('WEB', npmCommand, ['--prefix', 'iestmaps_react', 'run', 'dev', '--', '--port', '5174', '--strictPort'])
  spawnProcess('TUNNEL', cloudflaredCommand, ['--url', webUrl, '--no-autoupdate'])
}