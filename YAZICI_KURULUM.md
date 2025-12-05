# 🖨️ Thermal Yazıcı Kurulum Rehberi

Bu rehber, restoran yönetim sisteminize thermal yazıcı bağlamak için adım adım talimatlar içerir.

## 📋 Desteklenen Yazıcı Türleri

1. **USB Thermal Yazıcılar** (WebUSB API ile)
   - ESC/POS komut seti destekleyen yazıcılar
   - Chrome/Edge tarayıcısı gereklidir
   - Örnek: Epson TM-T20, Star TSP100, Bixolon SRP-350

2. **Network Thermal Yazıcılar** (TCP/IP)
   - Ethernet bağlantılı yazıcılar
   - IP adresi ve port (genellikle 9100) gereklidir
   - Backend servisi ile çalışır

3. **Tarayıcı Yazdırma** (Varsayılan)
   - Tüm yazıcılarla çalışır
   - Windows Print API kullanır
   - En kolay kurulum

## 🔧 Kurulum Adımları

### Yöntem 1: USB Yazıcı Bağlama (Önerilen)

1. **Yazıcıyı Hazırlayın**
   - Thermal yazıcıyı bilgisayarınıza USB ile bağlayın
   - Yazıcının açık ve kağıt yüklü olduğundan emin olun

2. **Tarayıcı Gereksinimleri**
   - Chrome veya Edge tarayıcısı kullanın (WebUSB API desteği için)
   - Firefox ve Safari desteklenmez

3. **Admin Panelden Bağlama**
   - Admin paneline giriş yapın
   - "🖨️ Yazıcı Ayarları" butonuna tıklayın
   - "🔌 USB Yazıcı Bağla" butonuna tıklayın
   - Tarayıcı yazıcı seçim penceresi açılacak
   - Yazıcınızı listeden seçin ve "Bağlan" butonuna tıklayın
   - Başarılı mesajını görürseniz yazıcı hazırdır!

### Yöntem 2: Network Yazıcı Bağlama

1. **Yazıcı IP Adresini Bulun**
   - Yazıcının ağ ayarlarından IP adresini öğrenin
   - Genellikle yazıcının menüsünden veya ağ ayarlarından bulunabilir
   - Örnek: `192.168.1.100`

2. **Port Numarasını Kontrol Edin**
   - Çoğu thermal yazıcı port `9100` kullanır
   - Yazıcı dokümantasyonunuzdan kontrol edin

3. **Admin Panelden Ayarlama**
   - Admin paneline giriş yapın
   - "🖨️ Yazıcı Ayarları" butonuna tıklayın
   - "🌐 Network Yazıcı" butonuna tıklayın
   - IP adresini ve port numarasını girin
   - "Kaydet" butonuna tıklayın
   - "Test Yazdır" ile bağlantıyı test edin

**Not:** Network yazıcılar için bir backend servisi gerekebilir. Browser'dan direkt TCP/IP bağlantısı güvenlik nedeniyle sınırlıdır.

### Yöntem 3: Tarayıcı Yazdırma (En Kolay)

1. **Yazıcıyı Windows'a Yükleyin**
   - Thermal yazıcınızı normal bir yazıcı olarak Windows'a yükleyin
   - Windows ayarlarından yazıcıyı ekleyin

2. **Admin Panelden Ayarlama**
   - Admin paneline giriş yapın
   - "🖨️ Yazıcı Ayarları" butonuna tıklayın
   - "Tarayıcı Yazdırmayı Kullan" butonuna tıklayın
   - Artık tüm yazdırma işlemleri Windows yazdırma sistemini kullanacak

## 🧪 Test Yazdırma

1. Admin panelden "Yazıcı Ayarları"na gidin
2. Network yazıcı için "Test Yazdır" butonuna tıklayın
3. USB yazıcı için herhangi bir ödeme işleminde fiş yazdırın
4. Test fişi yazdırılırsa kurulum başarılıdır!

## ⚙️ Yazıcı Ayarları

### Kağıt Genişliği
- Sistem 80mm (3 inç) thermal kağıt için optimize edilmiştir
- Farklı genişlikler için `thermal-printer.js` dosyasındaki ayarları değiştirebilirsiniz

### Font ve Format
- ESC/POS komutları kullanılarak formatlanmıştır
- Başlık: Çift boyut, kalın
- Normal metin: Standart boyut
- Toplam: Kalın, sağa hizalı

## 🔍 Sorun Giderme

### USB Yazıcı Bağlanmıyor
- Chrome/Edge tarayıcısı kullanıyor musunuz?
- Yazıcı açık ve USB kablosu bağlı mı?
- Tarayıcı yazıcı seçim penceresinde yazıcı görünüyor mu?
- Yazıcı sürücüleri yüklü mü?

### Network Yazıcı Çalışmıyor
- IP adresi doğru mu? (ping ile test edin)
- Port numarası doğru mu? (genellikle 9100)
- Yazıcı aynı ağda mı?
- Firewall yazıcıya erişimi engelliyor mu?

### Fiş Yazdırılmıyor
- Yazıcı ayarlarından yazıcı türünü kontrol edin
- Tarayıcı konsolunda hata var mı kontrol edin
- Yazıcı kağıdı var mı kontrol edin
- Yazıcı açık mı kontrol edin

## 📝 Notlar

- USB yazıcılar sadece Chrome/Edge'de çalışır
- Network yazıcılar için backend servisi önerilir
- Tarayıcı yazdırma en uyumlu yöntemdir ama thermal formatlaması sınırlıdır
- Yazıcı ayarları localStorage'da saklanır (tarayıcı cache temizlenirse sıfırlanır)

## 🔗 Backend Servisi (İsteğe Bağlı)

Network yazıcılar için bir Node.js backend servisi oluşturabilirsiniz:

```javascript
// print-server.js (Node.js örneği)
const net = require('net');

app.post('/api/print', async (req, res) => {
    const { ip, port, data } = req.body;
    const client = new net.Socket();
    
    client.connect(port, ip, () => {
        client.write(Buffer.from(data));
        client.destroy();
        res.json({ success: true });
    });
    
    client.on('error', (err) => {
        res.json({ success: false, error: err.message });
    });
});
```

Bu servisi çalıştırdıktan sonra network yazıcılar tam desteklenecektir.

