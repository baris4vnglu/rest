# GitHub'a Kod Yükleme Rehberi

## Adım 1: Git Kurulumu (Eğer yüklü değilse)

1. Git'i indirin: https://git-scm.com/download/win
2. İndirilen dosyayı çalıştırın ve kurulumu tamamlayın
3. Kurulumdan sonra bilgisayarı yeniden başlatın

## Adım 2: GitHub'da Repository Oluşturma

1. GitHub.com'a gidin ve giriş yapın
2. Sağ üstteki "+" butonuna tıklayın
3. "New repository" seçin
4. Repository adını girin (örn: `restaurant-management`)
5. "Public" veya "Private" seçin
6. **"Initialize this repository with a README" seçeneğini işaretlemeyin**
7. "Create repository" butonuna tıklayın

## Adım 3: Terminal/Command Prompt ile Kod Yükleme

### Windows PowerShell veya Command Prompt'u açın:

1. Windows tuşuna basın
2. "PowerShell" veya "cmd" yazın
3. Enter'a basın

### Proje klasörüne gidin:

```powershell
cd C:\Users\baris\Desktop\restt
```

### Git repository'sini başlatın:

```powershell
git init
```

### Tüm dosyaları ekleyin:

```powershell
git add .
```

### İlk commit'i yapın:

```powershell
git commit -m "Initial commit: Restaurant management system"
```

### GitHub repository'nizi ekleyin (URL'yi kendi repository URL'nizle değiştirin):

```powershell
git remote add origin https://github.com/KULLANICI_ADINIZ/REPOSITORY_ADI.git
```

**Örnek:**
```powershell
git remote add origin https://github.com/baris/restaurant-management.git
```

### Kodu GitHub'a yükleyin:

```powershell
git branch -M main
git push -u origin main
```

## Adım 4: GitHub Kullanıcı Adı ve Şifre

İlk kez push yaparken GitHub kullanıcı adı ve şifreniz istenecek.

**Not:** Eğer 2FA (İki Faktörlü Doğrulama) açıksa, Personal Access Token kullanmanız gerekebilir:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" tıklayın
3. Token'ı kopyalayın ve şifre yerine kullanın

---

## Yöntem 2: GitHub Desktop Kullanarak (Daha Kolay)

### Adım 1: GitHub Desktop İndirin
https://desktop.github.com/

### Adım 2: GitHub Desktop'u Açın
1. "File" → "Add Local Repository"
2. Klasörü seçin: `C:\Users\baris\Desktop\restt`
3. "Add repository" tıklayın

### Adım 3: GitHub'a Yükleyin
1. "Publish repository" butonuna tıklayın
2. Repository adını girin
3. "Publish" tıklayın

---

## Yöntem 3: GitHub Web Arayüzü ile (En Kolay)

1. GitHub.com'da yeni repository oluşturun
2. Repository sayfasında "uploading an existing file" linkine tıklayın
3. Tüm dosyaları sürükleyip bırakın
4. "Commit changes" tıklayın

**Not:** Bu yöntem büyük dosyalar için yavaş olabilir.

---

## .gitignore Dosyası Oluşturma (Önerilir)

Sensitive bilgileri (API keys, config dosyaları) GitHub'a yüklememek için:

1. Proje klasöründe `.gitignore` dosyası oluşturun
2. İçine şunları ekleyin:

```
# Firebase config (eğer sensitive bilgiler varsa)
firebase.js
firebase.js.txt

# Node modules (eğer varsa)
node_modules/

# Environment files
.env
.env.local

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
```

---

## Sonraki Güncellemeler İçin

Kodunuzu güncelledikten sonra:

```powershell
cd C:\Users\baris\Desktop\restt
git add .
git commit -m "Update: description of changes"
git push
```

---

## Yardım

Sorun yaşarsanız:
- Git kurulumu: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
- GitHub dokümantasyonu: https://docs.github.com/en/get-started

