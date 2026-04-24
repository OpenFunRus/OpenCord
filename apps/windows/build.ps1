$ErrorActionPreference = "Stop"

$project = Join-Path $PSScriptRoot "OpenCord.Windows.csproj"
$output = Join-Path $PSScriptRoot "dist"
$serverDownloads = Join-Path $PSScriptRoot "..\server\downloads"
$desktopExe = Join-Path $output "opencord.exe"

if (Test-Path $output) {
  Remove-Item $output -Recurse -Force
}

dotnet publish $project `
  -c Release `
  -r win-x64 `
  -p:PublishSingleFile=true `
  -p:SelfContained=true `
  -p:EnableCompressionInSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:PublishReferencesDocumentationFiles=false `
  -p:DebugType=None `
  -p:DebugSymbols=false `
  -o $output

New-Item -ItemType Directory -Force -Path $serverDownloads | Out-Null
Copy-Item -Force $desktopExe (Join-Path $serverDownloads "opencord.exe")

Write-Host ""
Write-Host "Desktop build completed:"
Write-Host "  $output"
