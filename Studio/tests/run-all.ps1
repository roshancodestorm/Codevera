# Studio headless test suite runner.
# Requires: Node.js, the repo root node_modules (ws), Chrome, and the Studio
# server running on the STUDIO_URL port (default 127.0.0.1:5174).
# Env overrides: STUDIO_URL, CHROME_PATH.
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
$fail = @()
$pass = 0

function Run-Suite([string]$name, [string]$file) {
  Write-Host ""
  Write-Host "=== $name ===" -ForegroundColor Cyan
  $out = Join-Path $env:TEMP ("studio-suite-" + [guid]::NewGuid().ToString("N") + ".log")
  $err = $out + ".err"
  & cmd /c "`"node`" `"$(Join-Path $root $file)`" > `"$out`" 2> `"$err`""
  $code = $LASTEXITCODE
  Get-Content $out -ErrorAction SilentlyContinue
  Get-Content $err -ErrorAction SilentlyContinue
  if ($code -eq 0) { $script:pass++ } else { $script:fail += $name + " (exit " + $code + ")" }
  Remove-Item $out, $err -Force -ErrorAction SilentlyContinue
}

Run-Suite "sync-loop guard" "bundle-sync-test.cjs"
Run-Suite "content sync" "bundle-content-test.cjs"
Run-Suite "pro features" "pro-features-test.cjs"
Run-Suite "collab 2-tab UI" "collab-2tab.cjs"
Run-Suite "MP4 export" "mp4-test.cjs"
Run-Suite "PPTX export (embed)" "pptx-embed-test.cjs"
Run-Suite "cloud auth+share" "cloud-test.cjs"
Run-Suite "UI e2e" "ui-e2e-test.cjs"

Write-Host ""
Write-Host ("RESULT: {0} passed, {1} failed" -f $pass, $fail.Count) -ForegroundColor $(if ($fail.Count -eq 0) { "Green" } else { "Red" })
foreach ($f in $fail) { Write-Host ("  FAILED: " + $f) -ForegroundColor Red }
if ($fail.Count) { exit 1 }
exit 0
