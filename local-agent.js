const admin = require('firebase-admin');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

// ==================================================================
// 1. CONFIGURATION (AYARLAR)
// ==================================================================
const CONFIG = {
    // Yazıcı Bağlantı Bilgileri
    PRINTERS: {
        MUTFAK: 'tcp://127.0.0.1:9100', // Mutfak IP
        BAR:    'tcp://127.0.0.1:9100', // Bar IP
        KASA:   'tcp://127.0.0.1:9100'  // Kasa IP
    },

    // KATEGORİ TANIMLARI (Hepsi küçük harf - Eşleştirme kolaylığı için)
    // Sitenizdeki 'data-category' değerlerinin hepsi burada olmalı.
    CATEGORIES: {
        FOOD: [
            "yemek", "tatlı", "salata", "başlangıç", "ana yemek", "kebap", 
            "baslangiclar", "salatalar", "kahvaltilar", "denizurunleri", 
            "pizzalar", "burgerler", "corbalar", "kebaplar", "makarnalar", 
            "mexicanmutfagi", "pidecesitleri", "sandiviclervetostlar", 
            "steakler", "tavukyemekleri", "food", "yiyecek"
        ],
        DRINK: [
            "içecek", "kokteyl", "kahve", "bar", "meşrubat", "bira", 
            "icecekler", "softiçecekler", "sıcakiçecekler", "milkshakes", 
            "smoothies", "icecoffes", "frozens", "drink", "mesrubat"
        ]
    },

    SETTINGS: {
        WIDTH: 42,
        TYPE: PrinterTypes.EPSON,
        CHARSET: 'PC857_TURKISH',
        REMOVE_SPECIAL_CHARS: false
    }
};

// ==================================================================
// 2. FIREBASE BAĞLANTISI
// ==================================================================
let db;
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("✅ [SİSTEM] Firebase Bağlantısı Başarılı!");
} catch (error) {
    console.error("❌ [KRİTİK HATA] Firebase başlatılamadı!");
    console.error("   Detay:", error.message);
    process.exit(1);
}

// ==================================================================
// 3. YARDIMCI FONKSİYONLAR
// ==================================================================

function createPrinter(interfaceUrl) {
    return new ThermalPrinter({
        type: CONFIG.SETTINGS.TYPE,
        interface: interfaceUrl,
        characterSet: CONFIG.SETTINGS.CHARSET,
        removeSpecialCharacters: CONFIG.SETTINGS.REMOVE_SPECIAL_CHARS,
        width: CONFIG.SETTINGS.WIDTH
    });
}

function formatTime(timestamp) {
    if (!timestamp) return new Date().toLocaleString('tr-TR');
    return timestamp.toDate().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}

// Kategori Kontrolü (Büyük/Küçük harf duyarsız)
function isCategory(itemCategory, targetList) {
    if (!itemCategory) return false;
    const cat = itemCategory.toLowerCase().trim();
    return targetList.some(c => c.toLowerCase() === cat);
}

// ==================================================================
// 4. YAZDIRMA FONKSİYONLARI (Try-Catch Korumalı)
// ==================================================================

async function printKitchenReceipt(orderData, items, time) {
    try {
        const printer = createPrinter(CONFIG.PRINTERS.MUTFAK);
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.println("🍳 MUTFAK FİSİ");
        printer.setTextSize(0, 0);
        printer.println(`MASA: ${orderData.tableNo}`);
        printer.println(time);
        printer.drawLine();
        
        printer.alignLeft();
        printer.setTextSize(1, 1);
        items.forEach(item => {
            printer.println(`[ ] ${item.name} x${item.qty}`);
            if (item.note) {
                printer.setTextSize(0, 0);
                printer.println(`    ⚠️ NOT: ${item.note}`);
                printer.setTextSize(1, 1);
            }
        });

        printer.cut();
        await printer.execute();
        console.log(`   ✅ [MUTFAK] Fiş gönderildi (${items.length} ürün).`);
    } catch (error) {
        console.error(`   ⚠️ [MUTFAK HATA] Yazıcı çevrimdışı veya hata verdi: ${error.message}`);
    }
}

async function printBarReceipt(orderData, items, time) {
    try {
        const printer = createPrinter(CONFIG.PRINTERS.BAR);
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.println("🍹 BAR SİPARİŞİ");
        printer.setTextSize(0, 0);
        printer.println(`MASA: ${orderData.tableNo}`);
        printer.println(time);
        printer.drawLine();
        
        printer.alignLeft();
        printer.setTextSize(1, 1);
        items.forEach(item => {
            printer.println(`[ ] ${item.name} x${item.qty}`);
            if (item.note) {
                printer.setTextSize(0, 0);
                printer.println(`    ⚠️ NOT: ${item.note}`);
                printer.setTextSize(1, 1);
            }
        });

        printer.cut();
        await printer.execute();
        console.log(`   ✅ [BAR] Fiş gönderildi (${items.length} ürün).`);
    } catch (error) {
        console.error(`   ⚠️ [BAR HATA] Yazıcı çevrimdışı veya hata verdi: ${error.message}`);
    }
}

async function printCashReceipt(orderData, time) {
    try {
        const printer = createPrinter(CONFIG.PRINTERS.KASA);
        printer.alignCenter();
        printer.println("** ÖDEME ALINDI **");
        printer.setTextSize(1, 1);
        printer.println(`MASA ${orderData.tableNo}`);
        printer.setTextSize(0, 0);
        printer.println(time);
        printer.drawLine();
        
        printer.alignLeft();
        orderData.items.forEach(item => {
            let total = (parseFloat(item.price) * item.qty).toFixed(2);
            printer.tableCustom([
                { text: item.name.substring(0, 20), align: "LEFT", width: 0.55 },
                { text: `x${item.qty}`, align: "CENTER", width: 0.15 },
                { text: total, align: "RIGHT", width: 0.30 }
            ]);
        });

        printer.drawLine();
        printer.alignRight();
        printer.setTextSize(1, 1);
        let finalTotal = parseFloat(orderData.total || orderData.totalPrice).toFixed(2);
        printer.println(`TOPLAM: ${finalTotal} TL`);
        
        printer.alignCenter();
        printer.setTextSize(0, 0);
        printer.println("--------------------------------");
        printer.println(`Ödeme: ${orderData.paymentMethod || 'Nakit/Kart'}`);
        printer.println("Mali Değeri Yoktur");
        
        printer.cut();
        await printer.execute();
        console.log(`   ✅ [KASA] Adisyon gönderildi. Tutar: ${finalTotal} TL`);
    } catch (error) {
        console.error(`   ⚠️ [KASA HATA] Yazıcı çevrimdışı veya hata verdi: ${error.message}`);
    }
}

// ==================================================================
// 5. ANA MANTIK (CANLI DİNLEME)
// ==================================================================

console.log("🖨️  Local Agent (v2.0 - Stabil) Başlatıldı. Siparişler bekleniyor...");
console.log("---------------------------------------------------------------");

const ordersRef = db.collection('orders');

ordersRef.where('isPrinted', '==', false).onSnapshot((snapshot) => {
    
    if (snapshot.empty) return;

    snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
            
            // Hata Yönetimi: Tek bir siparişte hata olursa program çökmesin
            try {
                const orderData = change.doc.data();
                const docId = change.doc.id;
                
                // Boş sipariş kontrolü
                if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                    console.log(`   ⚠️ [UYARI] Boş sipariş algılandı (ID: ${docId}), atlanıyor.`);
                    return;
                }

                const orderTime = formatTime(orderData.createdAt);
                console.log(`\n🔔 [SİPARİŞ] Masa: ${orderData.tableNo} | ID: ${docId.substring(0,5)}...`);

                // Ürünleri Listelere Ayır
                const foodItems = [];
                const drinkItems = [];

                orderData.items.forEach(item => {
                    const cat = item.category || "Tanımsız";
                    
                    if (isCategory(cat, CONFIG.CATEGORIES.FOOD)) {
                        foodItems.push(item);
                    } else if (isCategory(cat, CONFIG.CATEGORIES.DRINK)) {
                        drinkItems.push(item);
                    } else {
                        // FALLBACK: Kategorisi bilinmeyenleri MUTFAĞA ekle
                        console.log(`   ⚠️ Bilinmeyen kategori: "${item.name}" (${cat}) -> Mutfağa yönlendirildi.`);
                        foodItems.push(item);
                    }
                });

                // İşlem yapılıp yapılmadığını takip etmek için bayraklar
                let workDone = false;

                // 1. Mutfak Yazıcısını Tetikle
                if (foodItems.length > 0) {
                    await printKitchenReceipt(orderData, foodItems, orderTime);
                    workDone = true;
                }

                // 2. Bar Yazıcısını Tetikle
                if (drinkItems.length > 0) {
                    await printBarReceipt(orderData, drinkItems, orderTime);
                    workDone = true;
                }

                // 3. Kasa Yazıcısını Tetikle (SADECE ÖDENMİŞSE)
                if (orderData.isPaid === true) {
                    await printCashReceipt(orderData, orderTime);
                    workDone = true;
                }

                // 4. Veritabanını Güncelle
                if (workDone) {
                    await ordersRef.doc(docId).update({ isPrinted: true });
                    console.log("   💾 [DB] Sipariş işlendi (isPrinted: true).");
                }

            } catch (err) {
                console.error("   ❌ [İŞLEM HATASI]:", err.message);
            }
        }
    });

}, (error) => {
    console.error("🔥 [DİNLEME HATASI] Firestore bağlantısı koptu:", error);
});