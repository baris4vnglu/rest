@echo off
echo 🚀 Firebase Deploy Başlatılıyor...
echo.

REM Temizlik yap
echo 🧹 Gereksiz dosyalar temizleniyor...
if exist node_modules rmdir /s /q node_modules
if exist .firebase rmdir /s /q .firebase
if exist .git rmdir /s /q .git
del /q *.log 2>nul
del /q *.tmp 2>nul
del /q *.bak 2>nul

echo.
echo ✅ Temizlik tamamlandı!
echo.
echo 📦 Firebase'e deploy ediliyor...
echo.

firebase deploy --only hosting

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Deploy başarılı!
) else (
    echo.
    echo ❌ Deploy başarısız! Hata kodu: %ERRORLEVEL%
    pause
)

