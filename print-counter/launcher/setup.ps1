# Print Counter setup: creates "Print Counter" shortcuts on the Desktop and in the Start menu.
# The shortcuts open Print-Counter.html in Microsoft Edge (or Chrome) app mode: its own window,
# no tabs or address bar. Nothing is installed and no admin rights are needed.
$ErrorActionPreference = 'Stop'

$folder = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = Join-Path $folder 'Print-Counter.html'
$icon = Join-Path $folder 'Print Counter.ico'

if (-not (Test-Path -LiteralPath $html)) {
  Write-Host "Print-Counter.html isn't in this folder ($folder)." -ForegroundColor Red
  Write-Host 'Keep the setup files and Print-Counter.html together, then run setup again.'
  exit 1
}

function Find-Browser {
  param([string]$exeName)
  foreach ($hive in 'HKLM:', 'HKCU:') {
    foreach ($node in 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths', 'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths') {
      $key = "$hive\$node\$exeName"
      if (Test-Path -LiteralPath $key) {
        $path = (Get-ItemProperty -LiteralPath $key).'(default)'
        if ($path -and (Test-Path -LiteralPath $path)) { return $path }
      }
    }
  }
  return $null
}

$browser = Find-Browser 'msedge.exe'
if (-not $browser) {
  foreach ($p in "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") {
    if ($p -and (Test-Path -LiteralPath $p)) { $browser = $p; break }
  }
}
if (-not $browser) { $browser = Find-Browser 'chrome.exe' }
if (-not $browser) {
  Write-Host 'Could not find Microsoft Edge or Google Chrome on this PC.' -ForegroundColor Red
  exit 1
}

# file:/// URL for the app (spaces and other characters escaped)
$url = ([System.Uri]$html).AbsoluteUri
$appArgs = "--app=`"$url`""

$shell = New-Object -ComObject WScript.Shell
$targets = @(
  (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Print Counter.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) 'Print Counter.lnk')
)
foreach ($lnkPath in $targets) {
  $lnk = $shell.CreateShortcut($lnkPath)
  $lnk.TargetPath = $browser
  $lnk.Arguments = $appArgs
  $lnk.WorkingDirectory = $folder
  if (Test-Path -LiteralPath $icon) { $lnk.IconLocation = "$icon,0" }
  $lnk.Description = 'Print Counter: print order tracking'
  $lnk.Save()
}

Write-Host 'Print Counter shortcuts were added to the Desktop and the Start menu.' -ForegroundColor Green
Write-Host 'To pin it to the taskbar, right-click the Desktop shortcut and choose Pin to taskbar'
Write-Host '(on Windows 11, click Show more options first).'
Start-Process -FilePath $browser -ArgumentList $appArgs -WorkingDirectory $folder
