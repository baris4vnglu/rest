// fake-printer.js
const net = require('net');

// Sanal Yazıcı Sunucusu Oluştur
const server = net.createServer((socket) => {
    console.log('>>> YAZICIYA BAĞLANTI GELDİ! <<<');

    socket.on('data', (data) => {
        // Gelen veri aslında "Buffer" (Byte) formatındadır.
        // Bunu okunabilir hale çevirip ekrana basıyoruz.
        console.log('------------------------------------------------');
        console.log('--- YAZICI ÇIKTISI BAŞLANGIÇ ---');
        console.log(data.toString()); // Fişin içeriğini metin olarak göster
        console.log('--- YAZICI ÇIKTISI BİTİŞ ---');
        console.log('------------------------------------------------\n');
    });

    socket.on('end', () => {
        console.log('>>> Bağlantı Kesildi (Yazdırma Bitti) <<<\n');
    });
});

// 9100 Portunu Dinle (Standart Yazıcı Portu)
const PORT = 9100;
server.listen(PORT, () => {
    console.log(`SANAL YAZICI ÇALIŞIYOR! Port: ${PORT}`);
    console.log(`Ana programında IP olarak 'localhost' veya '127.0.0.1' kullanabilirsin.`);
});