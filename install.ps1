#Requires -Version 7
# Install the dgk CLI globally via npm.
# Usage: irm https://raw.githubusercontent.com/aretw0/vault-seed/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$RequiredNodeMajor = 22

Write-Host "dgk — Digital Gardening Kit"
Write-Host "----------------------------"

# Check Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Error @"
Erro: Node.js $RequiredNodeMajor+ é necessário.

Instale via winget (recomendado):
  winget install Schniz.fnm
  fnm install $RequiredNodeMajor
"@
  exit 1
}

$nodeMajor = [int](node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if ($nodeMajor -lt $RequiredNodeMajor) {
  $nodeVersion = node --version
  Write-Error "Erro: Node.js $RequiredNodeMajor+ necessário (encontrado: $nodeVersion)`n  fnm install $RequiredNodeMajor"
  exit 1
}

Write-Host "✓ Node.js $(node --version)"

# Install
Write-Host "Instalando @aretw0/dgk-cli..."
npm install -g @aretw0/dgk-cli

# Verify
$dgkCmd = Get-Command dgk -ErrorAction SilentlyContinue
if (-not $dgkCmd) {
  Write-Host ""
  Write-Host "Aviso: dgk instalado mas não encontrado no PATH."
  Write-Host "Adicione o diretório global do npm ao PATH:"
  Write-Host '  $env:PATH = "$(npm prefix -g)\bin;$env:PATH"'
  exit 0
}

$dgkVersion = dgk --version
Write-Host ""
Write-Host "✓ dgk $dgkVersion instalado com sucesso."
Write-Host ""
Write-Host "Próximos passos:"
Write-Host "  cd <seu-vault>"
Write-Host "  dgk setup    # configura o ambiente local"
Write-Host "  dgk check    # verifica a saúde do vault"
