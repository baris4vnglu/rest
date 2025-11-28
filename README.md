# 🌿 Lezzet Bahçesi - Restoran Yönetim Sistemi

Modern bir restoran yönetim sistemi. Masa yönetimi, sipariş takibi, stok yönetimi ve daha fazlası.

## 🚀 Özellikler

- 🍕 **Ürün Yönetimi**: Menü öğelerini ekleme, düzenleme ve silme
- 📋 **Masa Yönetimi**: Masa durumlarını takip etme ve QR kod oluşturma
- 🛒 **Sipariş Yönetimi**: Sipariş oluşturma ve takip etme
- 🗓️ **Rezervasyon Sistemi**: Müşteri rezervasyonlarını yönetme
- 💳 **Ödeme Yönetimi**: Ödeme bölme ve takip
- 📊 **Raporlama**: Z raporu, satış raporu ve stok raporu
- 🍳 **Mutfak Yönetimi**: Mutfak siparişlerini görüntüleme
- 📦 **Stok Yönetimi**: Envanter takibi
- ❤️ **CRM**: Müşteri ilişkileri yönetimi
- 💰 **Kasa Yönetimi**: Kasa açma ve takip

## 🛠️ Teknolojiler

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication)
- **QR Kod**: QRCode.js
- **PDF**: jsPDF

## 📋 Kurulum

### 1. Firebase Projesi Oluşturma

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. Yeni proje oluşturun
3. Firestore Database'i etkinleştirin
4. Authentication'ı etkinleştirin (Email/Password)
5. `firebase.js` dosyasına Firebase yapılandırmanızı ekleyin

### 2. Firestore Security Rules

`firestore.rules` dosyasını Firebase Console'dan deploy edin:

```bash
firebase deploy --only firestore:rules
```

### 3. Yerel Sunucu (Geliştirme için)

Python ile basit HTTP sunucusu:

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Veya Node.js ile:

```bash
npx http-server -p 8080
```

## 📱 QR Kod Kullanımı

1. Admin Panel → Sipariş Durumu
2. Website URL'yi girin (örn: `http://192.168.1.100:8080`)
3. Masaları oluşturun
4. QR kodları indirin ve masalara yerleştirin
5. Müşteriler QR kodu tarayarak menüyü görüntüleyebilir

## 🔐 Güvenlik

- Admin paneli Firebase Authentication ile korunmaktadır
- Firestore security rules ile veri erişimi kontrol edilir
- Müşteri sayfası (`index.html`) menü öğelerini görüntülemek için public erişime açıktır

## 📁 Dosya Yapısı

```
restt/
├── admin.html          # Admin paneli
├── admin.js            # Admin paneli JavaScript
├── admin.css           # Admin paneli stilleri
├── index.html          # Müşteri menü sayfası
├── table.html          # Masa özel menü sayfası
├── script.js           # Müşteri sayfası JavaScript
├── styles.css          # Genel stiller
├── firebase.js         # Firebase yapılandırması
├── firestore.rules     # Firestore güvenlik kuralları
└── README.md           # Bu dosya
```

## 🚀 GitHub'a Yükleme

Detaylı talimatlar için `GITHUB_SETUP.md` dosyasına bakın.

### Hızlı Başlangıç:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
git push -u origin main
```

## 📝 Lisans

Bu proje özel kullanım içindir.

## 👨‍💻 Geliştirici

Lezzet Bahçesi Restoran Yönetim Sistemi

