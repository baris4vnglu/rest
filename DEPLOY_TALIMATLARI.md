# 🚀 Firebase Deploy Talimatları

## ⚠️ Önemli: Deploy Öncesi Kontroller

### 1. Gereksiz Dosyaları Temizle

Deploy öncesi aşağıdaki klasörleri/dosyaları silin veya taşıyın:

```bash
# Windows PowerShell'de:
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .firebase -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
Remove-Item *.log -ErrorAction SilentlyContinue
```

### 2. Doğru Dizinde Olduğunuzdan Emin Olun

Terminal'de şu komutla kontrol edin:
```bash
# Windows
dir firebase.json
dir index.html

# Linux/Mac
ls firebase.json
ls index.html
```

Her iki dosya da görünmeli.

### 3. Firebase Login Kontrolü

```bash
firebase login
```

Eğer zaten giriş yaptıysanız, projeyi seçin:
```bash
firebase use default
```

## 📦 Deploy Komutları

### Sadece Hosting Deploy (Önerilen)

```bash
firebase deploy --only hosting
```

### Hosting + Firestore Rules Deploy

```bash
firebase deploy --only hosting,firestore:rules
```

### Tüm Servisleri Deploy

```bash
firebase deploy
```

## 🔍 Deploy Öncesi Test

Deploy etmeden önce local'de test edin:

```bash
firebase serve
```

Tarayıcıda `http://localhost:5000` adresini açın ve sitenin çalıştığını kontrol edin.

## ✅ Deploy Sonrası Kontrol

1. Firebase Console'a gidin: https://console.firebase.google.com/
2. Projenizi seçin
3. **Hosting** sekmesine gidin
4. Deploy edilen siteyi kontrol edin

## 🛠️ Sorun Giderme

### Hata: "Found 264443 files..."

**Çözüm:**
1. `.firebaseignore` dosyasının proje root'unda olduğundan emin olun
2. `node_modules` klasörünü silin
3. Terminal'i kapatıp yeniden açın
4. Tekrar deploy edin

### Hata: "Permission denied"

**Çözüm:**
```bash
firebase login --reauth
firebase use default
```

### Hata: "Project not found"

**Çözüm:**
`.firebaserc` dosyasını kontrol edin:
```json
{
  "projects": {
    "default": "restorant-8e71c"
  }
}
```

Proje ID'si doğru mu kontrol edin.

## 📝 Deploy Edilecek Dosyalar

Aşağıdaki dosyalar deploy edilir:
- ✅ index.html
- ✅ admin.html
- ✅ admin.js
- ✅ admin.css
- ✅ firebase.js
- ✅ thermal-printer.js
- ✅ styles.css
- ✅ script.js
- ✅ firestore.rules
- ✅ firestore.indexes.json

Aşağıdaki dosyalar deploy edilmez (ignore edilir):
- ❌ node_modules/
- ❌ .git/
- ❌ *.md (README, talimat dosyaları)
- ❌ .firebase/
- ❌ *.log
- ❌ firebase.json
- ❌ .firebaserc

## 🎯 Hızlı Deploy Komutu

Tüm kontrolleri yaptıktan sonra:

```bash
firebase deploy --only hosting
```

Bu komut sadece hosting'i deploy eder ve en hızlı yöntemdir.

