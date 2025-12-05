const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ThermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;

const serviceAccount = require("./serviceAccount.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

let printer = new ThermalPrinter({
  type: Types.EPSON,
  interface: 'usb',
  driver: require("printer"),
  removeSpecialCharacters: false
});

db.collection("orders")
  .where("printed", "==", false)
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === "added") {
        let data = change.doc.data();

        printer.alignCenter();
        printer.println("=== YENİ SİPARİŞ ===");
        printer.drawLine();
        printer.println("Masa: " + data.tableNumber);
        printer.drawLine();

        data.items.forEach(item => {
          printer.alignLeft();
          printer.println(`${item.name} x${item.quantity || 1}`);
        });

        printer.drawLine();
        printer.println("TOPLAM: " + (data.total || "0") + " TL");
        printer.cut();

        try {
          await printer.execute();
          console.log("Sipariş Yazdırıldı:", change.doc.id);
          await change.doc.ref.update({ printed: true });
        } catch (e) {
          console.error("Yazdırma hatası:", e);
        }
      }
    });
  });
