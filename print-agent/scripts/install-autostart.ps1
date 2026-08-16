[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentDirectory = Split-Path -Parent $scriptDirectory
$launcherPath = Join-Path $scriptDirectory 'start-print-agent.cmd'
$environmentPath = Join-Path $agentDirectory '.env'
$entryPointPath = Join-Path $agentDirectory 'dist\index.js'
$startupDirectory = [Environment]::GetFolderPath('Startup')
$autostartPath = Join-Path $startupDirectory 'haehnchen-print-agent.vbs'

if (-not (Test-Path -LiteralPath $launcherPath -PathType Leaf)) {
  throw "Startskript wurde nicht gefunden: $launcherPath"
}

if (-not (Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
  throw ".env wurde nicht gefunden: $environmentPath"
}

if (-not (Test-Path -LiteralPath $entryPointPath -PathType Leaf)) {
  throw "Build wurde nicht gefunden: $entryPointPath. Bitte zuerst npm run build ausführen."
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw 'node.exe wurde nicht im PATH gefunden.'
}

$escapedLauncherPath = $launcherPath.Replace('"', '""')
$content = @"
Set shell = CreateObject("WScript.Shell")
shell.Run Chr(34) & "$escapedLauncherPath" & Chr(34), 0, False
"@

if ($PSCmdlet.ShouldProcess($autostartPath, 'Print-Agent-Autostart installieren')) {
  Set-Content -LiteralPath $autostartPath -Value $content -Encoding Unicode
}

[PSCustomObject]@{
  Status = if ($WhatIfPreference) { 'Vorschau' } else { 'Installiert' }
  AutostartDatei = $autostartPath
  Startskript = $launcherPath
  AgentVerzeichnis = $agentDirectory
}