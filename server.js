// server.js

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const ThermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;

const serviceAccount = require("./serviceAccount.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const RETRY_INTERVAL_MS = 5000; // 5 saniyede bir dene

let printer = new ThermalPrinter({
  type: Types.EPSON,
  interface: "usb",
  driver: require("printer"),
  removeSpecialCharacters: false,
});

// ---- PRINTER STATUS YARDIMCI FONKSİYONLARI ----

async function setPrinterStatusOk() {
  try {
    await db.collection("system").doc("printerStatus").set(
      {
        ok: true,
        message: null,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Printer durumunu Firestore'a yazarken hata:", err);
  }
}

async function setPrinterErrorStatus(error) {
  try {
    await db.collection("system").doc("printerStatus").set(
      {
        ok: false,
        message: error && error.message ? error.message : "Bilinmeyen yazıcı hatası",
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Printer hata durumunu Firestore'a yazarken hata:", err);
  }
}

// ---- YAZDIRMA İŞİ ----

function buildPrintJob(data) {
  printer.clear();

  printer.alignCenter();
  printer.println("=== YENİ SİPARİŞ ===");
  printer.drawLine();
  printer.println("Masa: " + data.tableNumber);
  printer.drawLine();

  data.items.forEach((item) => {
    printer.alignLeft();
    printer.println(`${item.name} x${item.quantity || 1}`);
  });

  printer.drawLine();
  printer.println("TOPLAM: " + (data.total || "0") + " TL");
  printer.cut();
}

function recreatePrinterInstance() {
  // USB kopup gelmişse tekrar instance almak bazen gerekiyor
  printer = new ThermalPrinter({
    type: Types.EPSON,
    interface: "usb",
    driver: require("printer"),
    removeSpecialCharacters: false,
  });
}

function printOrderWithRetry(docRef, data, attempt = 1) {
  buildPrintJob(data);

  printer
    .execute()
    .then(async () => {
      console.log("Sipariş Yazdırıldı:", docRef.id);
      await docRef.update({ printed: true });
      await setPrinterStatusOk();
    })
    .catch(async (e) => {
      console.error(`Yazdırma hatası (deneme ${attempt}):`, e);
      await setPrinterErrorStatus(e);

      // Yazıcı veya USB gitmiş olabilir, yeniden oluştur.
      recreatePrinterInstance();

      console.log(
        `${RETRY_INTERVAL_MS / 1000} saniye sonra bu siparişi tekrar yazdırmayı deneyeceğim...`
      );

      setTimeout(() => {
        printOrderWithRetry(docRef, data, attempt + 1);
      }, RETRY_INTERVAL_MS);
    });
}

// ---- FIRESTORE LİSTENER + RECONNECT LOGIC ----

function startOrderListener() {
  console.log("Yeni siparişler için Firestore dinleyicisi başlatılıyor...");

  db.collection("orders")
    .where("printed", "==", false)
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const docRef = change.doc.ref;
            printOrderWithRetry(docRef, data);
          }
        });
      },
      (error) => {
        console.error("Firestore bağlantı hatası:", error);
        console.log(
          `${RETRY_INTERVAL_MS / 1000} saniye sonra Firestore'a yeniden bağlanmayı deneyeceğim...`
        );
        setTimeout(startOrderListener, RETRY_INTERVAL_MS);
      }
    );
}

startOrderListener();
