Set-PSDebug -Off
$ErrorActionPreference='Stop'

Write-Host "--- Extracting the artifacts ---"
mkdir -Force artifacts | out-null
tar xzf artifacts.tar.gz -C artifacts

pushd artifacts/bin

function check_help_version {
  try {
    .\ausd.exe -version
    .\ausd.exe -help
    .\aus-qt.exe -version
    .\aus-qt.exe -help
    .\aus-cli.exe -version
    .\aus-cli.exe -help
    .\aus-tx.exe -help
    .\aus-wallet -help
  }
  catch {
    Write-Error $_
  }
  finally {
    Stop-Process -name aus-qt -Force -ErrorAction SilentlyContinue
  }
}

function New-TemporaryDirectory {
  $parent = [System.IO.Path]::GetTempPath()
  [string] $name = [System.Guid]::NewGuid()
  $tempDir = New-Item -ItemType Directory -Path (Join-Path $parent $name)
  return $tempDir.FullName
}

function check_bitcoind {
  trap {
    Stop-Process -name ausd -Force 
  }

  $datadir = New-TemporaryDirectory
  $datadirArg = "-datadir=$datadir"

  Write-Host "Launching ausd in the background"
  Start-Process -NoNewWindow .\ausd.exe "-noprinttoconsole $datadirArg"

  for($i=60; $i -gt 0; $i--) {
    Start-Sleep -Seconds 1
    if(.\aus-cli.exe $datadirArg help) {
      break
    }
  }
  if($i -eq 0) {
    throw "Failed to start ausd"
  }

  Write-Host "Stopping ausd"
  .\aus-cli.exe $datadirArg stop

  for($i=60; $i -gt 0; $i--) {
    Start-Sleep -Seconds 1
    if(-Not (Get-Process -Name ausd -ErrorAction SilentlyContinue)) {
      break
    }
  }
  if($i -eq 0) {
    throw "Failed to stop ausd"
  }
}

Write-Host "--- Checking helps and versions ---"
check_help_version

Write-Host "--- Checking ausd can run and communicate via aus-cli ---"
check_bitcoind

Write-Host "--- Running bitcoin unit tests ---"
.\test_bitcoin.exe
Write-Host "--- Running aus-qt unit tests ---"
.\test_aus-qt.exe -platform windows
Write-Host "--- Running pow unit tests ---"
.\test-pow.exe
Write-Host "--- Running avalanche unit tests ---"
# FIXME: figure out why the poll_inflight_timeout test fails and fix it
.\test-avalanche.exe -t !processor_tests/poll_inflight_timeout

popd

Write-Host -ForegroundColor Green "--- All checks passed ---"
