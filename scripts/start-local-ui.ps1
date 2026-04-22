[CmdletBinding()]
param(
  [int]$PreferredPort = 3000,
  [int]$MaxPort = 3010,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $RepoRoot

function Test-ListeningPort {
  param([int]$Port)

  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Test-ChaiLabServer {
  param([int]$Port)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/auth/" -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content -match "<title>chai-lab</title>"
  } catch {
    return $false
  }
}

function Get-DevPort {
  for ($port = $PreferredPort; $port -le $MaxPort; $port++) {
    if (-not (Test-ListeningPort -Port $port)) {
      return [PSCustomObject]@{ Port = $port; ExistingServer = $false }
    }

    if (Test-ChaiLabServer -Port $port) {
      return [PSCustomObject]@{ Port = $port; ExistingServer = $true }
    }
  }

  throw "No usable port found in range $PreferredPort-$MaxPort."
}

function Test-PublicEnvKey {
  param([string]$Name)

  if ([Environment]::GetEnvironmentVariable($Name, "Process")) {
    return $true
  }

  foreach ($file in @(".env.local", ".env")) {
    if (-not (Test-Path -LiteralPath $file)) {
      continue
    }

    if (Select-String -LiteralPath $file -Pattern "^\s*$([regex]::Escape($Name))\s*=" -Quiet) {
      return $true
    }
  }

  return $false
}

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "Timed out waiting for $Url."
}

function Restore-NextEnvIfOnlyDevRouteChanged {
  param(
    [string]$Path,
    [AllowNull()][string]$OriginalContent
  )

  if ($null -eq $OriginalContent -or -not (Test-Path -LiteralPath $Path)) {
    return
  }

  $currentContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path
  if ($currentContent -eq $OriginalContent) {
    return
  }

  $expectedDevContent = $OriginalContent.Replace(
    'import "./.next/types/routes.d.ts";',
    'import "./.next/dev/types/routes.d.ts";'
  )

  if ($currentContent -eq $expectedDevContent) {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $Path), $OriginalContent, $utf8NoBom)
    Write-Host "Restored next-env.d.ts after Next dev route type generation."
    return
  }

  Write-Warning "next-env.d.ts changed in an unexpected way. It was not restored automatically."
}

$selection = Get-DevPort
$port = $selection.Port
$url = "http://127.0.0.1:$port/auth/"
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($selection.ExistingServer) {
  Write-Host "chai-lab is already running on $url"
  if ($listener) {
    Write-Host "Listening process id: $($listener.OwningProcess)"
    Write-Host "Stop later with: Stop-Process -Id $($listener.OwningProcess) -Force"
  }
  if (-not $NoBrowser) {
    Start-Process $url
  }
  exit 0
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  Write-Host "node_modules was not found. Running npm ci..."
  npm ci
}

$missingEnv = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_ORIGIN"
) | Where-Object { -not (Test-PublicEnvKey -Name $_) }

if ($missingEnv.Count -gt 0) {
  Write-Warning "Missing public env key(s): $($missingEnv -join ', '). The screen can open, but auth/data operations may be limited."
}

$env:NEXT_PUBLIC_APP_ORIGIN = "http://127.0.0.1:$port"

$nextEnvPath = Join-Path $RepoRoot "next-env.d.ts"
$nextEnvOriginal = if (Test-Path -LiteralPath $nextEnvPath) {
  Get-Content -Raw -Encoding UTF8 -LiteralPath $nextEnvPath
} else {
  $null
}

$outLog = Join-Path $env:TEMP "chai-lab-next-dev-$port.out.log"
$errLog = Join-Path $env:TEMP "chai-lab-next-dev-$port.err.log"

foreach ($log in @($outLog, $errLog)) {
  if (Test-Path -LiteralPath $log) {
    Remove-Item -LiteralPath $log -Force
  }
}

Write-Host "Starting chai-lab on $url"
$process = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--hostname", "127.0.0.1", "--port", "$port") `
  -WorkingDirectory $RepoRoot `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -PassThru

try {
  Wait-ForUrl -Url $url -TimeoutSeconds 60
  Restore-NextEnvIfOnlyDevRouteChanged -Path $nextEnvPath -OriginalContent $nextEnvOriginal
} catch {
  Write-Error $_
  Write-Host "stdout log: $outLog"
  Write-Host "stderr log: $errLog"
  if (Test-Path -LiteralPath $outLog) {
    Get-Content -Tail 40 -LiteralPath $outLog
  }
  if ((Test-Path -LiteralPath $errLog) -and (Get-Item -LiteralPath $errLog).Length -gt 0) {
    Get-Content -Tail 40 -LiteralPath $errLog
  }
  exit 1
}

if (-not $NoBrowser) {
  Start-Process $url
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
$listeningProcessId = if ($listener) { $listener.OwningProcess } else { $process.Id }

Write-Host "Ready: $url"
Write-Host "Listening process id: $listeningProcessId"
Write-Host "Logs: $outLog"
Write-Host "Stop later with: Stop-Process -Id $listeningProcessId -Force"
