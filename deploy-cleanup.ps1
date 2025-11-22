# Firebase Deploy Öncesi Temizlik Script'i
# PowerShell'de çalıştırın: .\deploy-cleanup.ps1

Write-Host "🧹 Firebase Deploy Öncesi Temizlik Başlatılıyor..." -ForegroundColor Cyan

# Gereksiz klasörleri sil
$foldersToRemove = @(
    "node_modules",
    ".firebase",
    ".git",
    ".vscode",
    ".idea",
    "dist",
    "build",
    ".cache"
)

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Write-Host "🗑️  Siliniyor: $folder" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $folder -ErrorAction SilentlyContinue
        Write-Host "✅ Silindi: $folder" -ForegroundColor Green
    }
}

# Gereksiz dosyaları sil
$filesToRemove = @(
    "*.log",
    "*.tmp",
    "*.temp",
    "*.bak",
    "*.backup",
    "firebase-debug.log",
    "firestore-debug.log",
    "ui-debug.log"
)

foreach ($pattern in $filesToRemove) {
    Get-ChildItem -Path . -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "🗑️  Siliniyor: $($_.Name)" -ForegroundColor Yellow
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n✅ Temizlik tamamlandı!" -ForegroundColor Green
Write-Host "`n📦 Şimdi deploy edebilirsiniz:" -ForegroundColor Cyan
Write-Host "   firebase deploy --only hosting" -ForegroundColor White

