# 🔥 Firebase Kurulum ve İzin Sorunlarını Çözme Rehberi

## ⚠️ "Missing or insufficient permissions" Hatası Çözümü

Bu hata, Firebase Authentication veya Firestore Security Rules ile ilgili bir sorundur.

## 📋 Adım Adım Çözüm

### 1. Firebase Console'da Authentication'ı Kontrol Edin

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. Projenizi seçin: `restorant-8e71c`
3. Sol menüden **Authentication**'a tıklayın
4. **Sign-in method** sekmesine gidin
5. **Email/Password** seçeneğinin **Enabled** olduğundan emin olun
6. **Users** sekmesine gidin ve bir admin kullanıcısı oluşturun:
   - "Add user" butonuna tıklayın
   - E-posta ve şifre girin (örn: `admin@restaurant.com` / `admin123`)
   - "Add user" butonuna tıklayın

### 2. Firestore Security Rules'ı Deploy Edin

**Yöntem 1: Firebase Console'dan (Kolay)**

1. Firebase Console'da **Firestore Database**'e gidin
2. **Rules** sekmesine tıklayın
3. Aşağıdaki kuralları yapıştırın:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Menu Items - Allow public read (for customer page), authenticated write (for admin)
    match /menuItems/{itemId} {
      allow read: if true; // Public read access for customers
      allow write: if isAuthenticated(); // Only authenticated admins can write
    }
    
    // Orders - Allow public create (for customers), authenticated read/update/delete (for admin)
    match /orders/{orderId} {
      allow create: if true; // Customers can create orders
      allow read, update, delete: if isAuthenticated(); // Only admins can read/update/delete
    }
    
    // Reservations - Allow authenticated users to read/write
    match /reservations/{reservationId} {
      allow read, write: if isAuthenticated();
    }
    
    // Inventory - Allow authenticated users to read/write
    match /inventory/{itemId} {
      allow read, write: if isAuthenticated();
    }
    
    // Customers (CRM) - Allow authenticated users to read/write
    match /customers/{customerId} {
      allow read, write: if isAuthenticated();
    }
    
    // Cash Register - Allow authenticated users to read/write
    match /cashRegister/{cashId} {
      allow read, write: if isAuthenticated();
    }
    
    // Tables - Allow authenticated users to read/write
    match /tables/{tableId} {
      allow read, write: if isAuthenticated();
    }
    
    // Table Settings - Allow authenticated users to read/write
    match /tableSettings/{settingId} {
      allow read, write: if isAuthenticated();
    }
    
    // Fallback: Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. **Publish** butonuna tıklayın
5. Deploy işleminin tamamlanmasını bekleyin (birkaç saniye sürebilir)

**Yöntem 2: Firebase CLI ile (Gelişmiş)**

```bash
# Firebase CLI'ı kurun (eğer yoksa)
npm install -g firebase-tools

# Firebase'e giriş yapın
firebase login

# Projeyi başlatın
firebase init firestore

# Rules'ı deploy edin
firebase deploy --only firestore:rules
```

### 3. Admin Paneline Giriş Yapın

1. `admin.html` dosyasını açın
2. Oluşturduğunuz admin kullanıcısının e-posta ve şifresini girin
3. "Giriş Yap" butonuna tıklayın
4. Başarılı girişten sonra tüm veriler yüklenecektir

### 4. OAuth Domain Uyarısını Düzeltme (Opsiyonel)

Konsolda görünen OAuth uyarısı için:

1. Firebase Console → **Authentication** → **Settings**
2. **Authorized domains** sekmesine gidin
3. **Add domain** butonuna tıklayın
4. `127.0.0.1` veya `localhost` ekleyin
5. **Add** butonuna tıklayın

## 🔍 Sorun Giderme

### Hata: "Missing or insufficient permissions"

**Nedenler:**
- Kullanıcı giriş yapmamış
- Firestore rules deploy edilmemiş
- Rules'da syntax hatası var

**Çözüm:**
1. Tarayıcı konsolunu açın (F12)
2. `auth.currentUser` yazın ve Enter'a basın
3. Eğer `null` görünüyorsa, giriş yapmamışsınız demektir
4. Giriş yapın ve sayfayı yenileyin

### Hata: "User not found" veya "Wrong password"

**Çözüm:**
- Firebase Console → Authentication → Users
- Kullanıcının var olduğundan emin olun
- Şifreyi sıfırlayın veya yeni kullanıcı oluşturun

### Hata: Rules deploy edilmiyor

**Çözüm:**
1. Rules'da syntax hatası olup olmadığını kontrol edin
2. Firebase Console'da Rules sekmesinde hata mesajı var mı bakın
3. Tarayıcıyı yenileyin ve tekrar deneyin

## ✅ Test Etme

1. Admin paneline giriş yapın
2. Konsolu açın (F12)
3. Hata mesajı olmamalı
4. Tüm butonlar çalışmalı
5. Veriler yüklenmeli

## 📞 Hala Sorun Varsa

1. Tarayıcı konsolundaki tam hata mesajını kopyalayın
2. Firebase Console → Firestore → Rules'da hata var mı kontrol edin
3. Authentication → Users'da kullanıcı var mı kontrol edin

---

**Not:** Firestore rules değişiklikleri genellikle birkaç saniye içinde aktif olur, ancak bazen 1-2 dakika sürebilir.

