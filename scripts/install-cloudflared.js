const { spawnSync } = require('node:child_process')

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  })
}

function isAvailable(command, args = ['--version']) {
  const result = run(command, args)
  return !result.error && result.status === 0
}

function installWithWinget() {
  if (!isAvailable('winget', ['--version'])) return false

  const result = run('winget', [
    'install',
    '--id',
    'Cloudflare.cloudflared',
    '-e',
    '--accept-package-agreements',
    '--accept-source-agreements',
  ])

  return result.status === 0
}

function installWithChoco() {
  if (!isAvailable('choco', ['--version'])) return false
  const result = run('choco', ['install', 'cloudflared', '-y'])
  return result.status === 0
}

function installWithBrew() {
  if (!isAvailable('brew', ['--version'])) return false
  const result = run('brew', ['install', 'cloudflared'])
  return result.status === 0
}

function logManualInstructions() {
  console.warn('==> No se pudo instalar cloudflared automáticamente.')

  if (isWindows) {
    console.warn('==> Instálalo manualmente con: winget install --id Cloudflare.cloudflared -e')
    return
  }

  if (isMac) {
    console.warn('==> Instálalo manualmente con: brew install cloudflared')
    return
  }

  if (isLinux) {
    console.warn('==> Instálalo manualmente desde: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/')
    return
  }

  console.warn('==> Instálalo manualmente desde: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/')
}

function main() {
  console.log('==> Verificando cloudflared...')

  if (isAvailable('cloudflared', ['--version'])) {
    console.log('==> cloudflared ya está instalado.')
    return
  }

  let installed = false

  if (isWindows) {
    installed = installWithWinget() || installWithChoco()
  } else if (isMac) {
    installed = installWithBrew()
  }

  if (installed && isAvailable('cloudflared', ['--version'])) {
    console.log('==> cloudflared instalado correctamente.')
    return
  }

  logManualInstructions()
}

main()