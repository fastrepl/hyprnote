$Dest = "assets/dictionaries"
if (Test-Path $Dest) {
  Write-Host "[dict] found: $Dest"
  exit 0
}

Write-Host "[dict] downloading..."
New-Item -ItemType Directory -Force -Path assets | Out-Null

# あなたのタグZIPのURL（必要なら差し替えOK）
$Url = "https://github.com/Kazu0525/hyp_JP/archive/refs/tags/app_v0.0.1.zip"
$Zip = "assets/dictionaries.zip"

Invoke-WebRequest -Uri $Url -OutFile $Zip

Write-Host "[dict] extracting..."
$TmpDir = "assets/tmp_extract"
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null
Expand-Archive -Path $Zip -DestinationPath $TmpDir -Force

# ZIP内から dictionaries フォルダを見つけて移動
$Found = Get-ChildItem -Path $TmpDir -Recurse -Directory |
         Where-Object { $_.Name -eq "dictionaries" } |
         Select-Object -First 1

if ($Found) {
  Move-Item -Force -Path $Found.FullName -Destination $Dest
} else {
  Write-Error "[dict] dictionaries folder not found in archive"
  exit 1
}

Remove-Item $Zip -Force
Remove-Item $TmpDir -Recurse -Force
Write-Host "[dict] ready at $Dest"
