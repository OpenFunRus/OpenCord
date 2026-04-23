$ErrorActionPreference = "Stop"

$project = Join-Path $PSScriptRoot "OpenCord.Windows.csproj"
$output = Join-Path $PSScriptRoot "dist"

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

Write-Host ""
Write-Host "Desktop build completed:"
Write-Host "  $output"
