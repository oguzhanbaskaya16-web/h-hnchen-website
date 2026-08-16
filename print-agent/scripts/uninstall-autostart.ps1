[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$startupDirectory = [Environment]::GetFolderPath('Startup')
$autostartPath = Join-Path $startupDirectory 'haehnchen-print-agent.vbs'

if (-not (Test-Path -LiteralPath $autostartPath -PathType Leaf)) {
  [PSCustomObject]@{
    Status = 'Nicht installiert'
    AutostartDatei = $autostartPath
  }
  return
}

if ($PSCmdlet.ShouldProcess($autostartPath, 'Print-Agent-Autostart entfernen')) {
  Remove-Item -LiteralPath $autostartPath -Force
}

[PSCustomObject]@{
  Status = if ($WhatIfPreference) { 'Vorschau' } else { 'Entfernt' }
  AutostartDatei = $autostartPath
}