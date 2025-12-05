// Thermal Printer Support for ESC/POS Printers
// Supports both USB (WebUSB) and Network (TCP/IP) printers

class ThermalPrinter {
    constructor() {
        this.usbDevice = null;
        this.networkPrinter = null;
        this.printerType = null; // 'usb' or 'network'
    }

    // Initialize USB Printer (WebUSB API)
    async connectUSB() {
        try {
            if (!navigator.usb) {
                throw new Error('WebUSB API desteklenmiyor. Chrome/Edge kullanın.');
            }

            // Request access to USB device
            const device = await navigator.usb.requestDevice({
                filters: [
                    { classCode: 7 }, // Printer class
                    { classCode: 3 }  // HID class (some printers)
                ]
            });

            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);

            this.usbDevice = device;
            this.printerType = 'usb';
            
            return { success: true, message: 'USB yazıcı bağlandı!' };
        } catch (error) {
            if (error.name === 'NotFoundError') {
                return { success: false, message: 'Yazıcı seçilmedi.' };
            }
            return { success: false, message: 'USB bağlantı hatası: ' + error.message };
        }
    }

    // Initialize Network Printer (TCP/IP)
    async connectNetwork(ipAddress, port = 9100) {
        try {
            // Network printer için WebSocket veya HTTP endpoint kullanılabilir
            // Bu örnekte bir proxy servisi gerekecek
            this.networkPrinter = {
                ip: ipAddress,
                port: port
            };
            this.printerType = 'network';
            
            return { success: true, message: `Network yazıcı ayarlandı: ${ipAddress}:${port}` };
        } catch (error) {
            return { success: false, message: 'Network bağlantı hatası: ' + error.message };
        }
    }

    // Send ESC/POS commands to USB printer
    async sendUSBCommand(data) {
        if (!this.usbDevice) {
            throw new Error('USB yazıcı bağlı değil');
        }

        const uint8Array = new Uint8Array(data);
        await this.usbDevice.transferOut(1, uint8Array);
    }

    // Send ESC/POS commands to Network printer
    async sendNetworkCommand(data) {
        if (!this.networkPrinter) {
            throw new Error('Network yazıcı ayarlanmamış');
        }

        // Network printer için bir backend servisi gerekiyor
        // Bu örnekte localStorage'da saklanıyor, gerçek uygulamada backend'e gönderilmeli
        const command = {
            ip: this.networkPrinter.ip,
            port: this.networkPrinter.port,
            data: Array.from(data)
        };

        // Backend servisine gönder (örnek)
        try {
            const response = await fetch('/api/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(command)
            });
            return await response.json();
        } catch (error) {
            console.warn('Network printer için backend servisi yok, localStorage\'a kaydediliyor');
            localStorage.setItem('pendingPrintJob', JSON.stringify(command));
            return { success: true, message: 'Yazdırma komutu kaydedildi (backend servisi gerekli)' };
        }
    }

    // ESC/POS Commands
    ESC = 0x1B;
    GS = 0x1D;

    // Initialize printer
    init() {
        return [this.ESC, 0x40];
    }

    // Set text alignment (0: left, 1: center, 2: right)
    setAlign(align) {
        return [this.ESC, 0x61, align];
    }

    // Set text size (0: normal, 1: double width, 2: double height, 3: double both)
    setTextSize(width, height) {
        return [this.ESC, 0x21, (width << 4) | height];
    }

    // Set bold
    setBold(enabled) {
        return [this.ESC, 0x45, enabled ? 1 : 0];
    }

    // Cut paper
    cut() {
        return [this.GS, 0x56, 0x41, 0x00];
    }

    // Feed lines
    feed(lines = 1) {
        return [this.ESC, 0x64, lines];
    }

    // Print text
    text(str) {
        const encoder = new TextEncoder();
        return Array.from(encoder.encode(str));
    }

    // Print line
    line(str = '') {
        return [...this.text(str), 0x0A];
    }

    // Print receipt
    async printReceipt(receiptData) {
        try {
            let commands = [];

            // Initialize
            commands.push(...this.init());

            // Header
            commands.push(...this.setAlign(1)); // Center
            commands.push(...this.setTextSize(1, 1)); // Double size
            commands.push(...this.setBold(true));
            commands.push(...this.line('LEZZET BAHÇESI'));
            commands.push(...this.setBold(false));
            commands.push(...this.setTextSize(0, 0)); // Normal size
            commands.push(...this.feed(1));

            commands.push(...this.line('Adres: Ornek Mah. Ornek Sokak'));
            commands.push(...this.line('Tel: (0212) 123 45 67'));
            commands.push(...this.line('Vergi No: 1234567890'));
            commands.push(...this.line('--------------------------------'));
            commands.push(...this.feed(1));

            // Table and date
            commands.push(...this.setAlign(0)); // Left
            commands.push(...this.line(`Masa: ${receiptData.tableNumber || '-'}`));
            commands.push(...this.line(`Tarih: ${new Date().toLocaleString('tr-TR')}`));
            commands.push(...this.line(`Garson: ${receiptData.waiter || '-'}`));
            commands.push(...this.line('--------------------------------'));
            commands.push(...this.feed(1));

            // Items
            if (receiptData.items && receiptData.items.length > 0) {
                receiptData.items.forEach(item => {
                    const quantity = item.quantity || 1;
                    const price = item.price || 0;
                    const total = price * quantity;
                    const name = (item.name || 'Urun').substring(0, 20); // Max 20 chars
                    const totalStr = total.toFixed(2);

                    commands.push(...this.line(`${quantity}x ${name}`));
                    commands.push(...this.setAlign(2)); // Right
                    commands.push(...this.line(`${totalStr} TL`));
                    commands.push(...this.setAlign(0)); // Left
                });
            }

            commands.push(...this.feed(1));
            commands.push(...this.line('--------------------------------'));

            // Totals
            commands.push(...this.setAlign(2)); // Right
            const subtotal = receiptData.subtotal || 0;
            const tax = subtotal * 0.08;
            const total = receiptData.total || (subtotal + tax);

            commands.push(...this.line(`Ara Toplam: ${subtotal.toFixed(2)} TL`));
            commands.push(...this.line(`KDV (%8): ${tax.toFixed(2)} TL`));
            commands.push(...this.setBold(true));
            commands.push(...this.line(`GENEL TOPLAM: ${total.toFixed(2)} TL`));
            commands.push(...this.setBold(false));

            // Payment info
            if (receiptData.cashReceived !== null && receiptData.cashReceived !== undefined) {
                commands.push(...this.feed(1));
                commands.push(...this.setAlign(0)); // Left
                commands.push(...this.line('--------------------------------'));
                commands.push(...this.setAlign(2)); // Right
                commands.push(...this.line(`Alinan: ${receiptData.cashReceived.toFixed(2)} TL`));
                if (receiptData.changeDue !== null && receiptData.changeDue !== undefined) {
                    commands.push(...this.setBold(true));
                    commands.push(...this.line(`Para Ustu: ${receiptData.changeDue.toFixed(2)} TL`));
                    commands.push(...this.setBold(false));
                }
                commands.push(...this.line(`Odeme: ${receiptData.paymentMethod === 'nakit' ? 'Nakit' : 'Kredi Karti'}`));
            }

            // Footer
            commands.push(...this.feed(2));
            commands.push(...this.setAlign(1)); // Center
            commands.push(...this.line('Tesekkur Ederiz'));
            commands.push(...this.line('Yeniden Bekleriz'));
            commands.push(...this.feed(1));
            commands.push(...this.line(`Fiş No: ${receiptData.receiptNumber || 'N/A'}`));
            commands.push(...this.feed(2));

            // Cut paper
            commands.push(...this.cut());

            // Send commands
            if (this.printerType === 'usb') {
                await this.sendUSBCommand(commands);
                return { success: true, message: 'Fiş USB yazıcıdan yazdırıldı!' };
            } else if (this.printerType === 'network') {
                await this.sendNetworkCommand(commands);
                return { success: true, message: 'Fiş network yazıcıya gönderildi!' };
            } else {
                throw new Error('Yazıcı bağlı değil');
            }
        } catch (error) {
            console.error('Yazdırma hatası:', error);
            return { success: false, message: 'Yazdırma hatası: ' + error.message };
        }
    }
}

// Global printer instance
window.thermalPrinter = new ThermalPrinter();

// Browser Print API fallback (works with any printer)
function printReceiptBrowser(receiptData) {
    const printContent = generateReceiptHTML(receiptData);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

function generateReceiptHTML(receiptData) {
    let itemsHTML = '';
    let subtotal = 0;
    
    if (receiptData.items && Array.isArray(receiptData.items)) {
        receiptData.items.forEach(item => {
            const quantity = item.quantity || 1;
            const price = item.price || 0;
            const total = price * quantity;
            subtotal += total;
            itemsHTML += `
                <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                    <span>${quantity}x ${item.name || 'Ürün'}</span>
                    <span>${total.toFixed(2)} ₺</span>
                </div>
            `;
        });
    }

    const tax = subtotal * 0.08;
    const total = receiptData.total || (subtotal + tax);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Fiş</title>
            <style>
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    body {
                        margin: 0;
                        padding: 10px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        width: 80mm;
                    }
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 10px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 10px;
                }
                .header h2 {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 5px 0;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>LEZZET BAHÇESİ</h2>
                <p style="font-size: 10px; margin: 3px 0;">Adres: Örnek Mah. Örnek Sokak No:123</p>
                <p style="font-size: 10px; margin: 3px 0;">Tel: (0212) 123 45 67</p>
                <p style="font-size: 10px; margin: 3px 0;">Vergi No: 1234567890</p>
            </div>
            <div class="divider"></div>
            <div>
                <div>Masa: ${receiptData.tableNumber || '-'}</div>
                <div>Tarih: ${new Date().toLocaleString('tr-TR')}</div>
                <div>Garson: ${receiptData.waiter || '-'}</div>
            </div>
            <div class="divider"></div>
            <div>
                ${itemsHTML}
            </div>
            <div class="divider"></div>
            <div style="text-align: right;">
                <div>Ara Toplam: ${subtotal.toFixed(2)} ₺</div>
                <div>KDV (%8): ${tax.toFixed(2)} ₺</div>
                <div style="font-weight: bold;">Genel Toplam: ${total.toFixed(2)} ₺</div>
            </div>
            ${receiptData.cashReceived !== null && receiptData.cashReceived !== undefined ? `
            <div class="divider"></div>
            <div style="text-align: right;">
                <div>Alınan: ${receiptData.cashReceived.toFixed(2)} ₺</div>
                ${receiptData.changeDue !== null && receiptData.changeDue !== undefined ? `
                <div style="font-weight: bold;">Para Üstü: ${receiptData.changeDue.toFixed(2)} ₺</div>
                ` : ''}
                <div>Ödeme: ${receiptData.paymentMethod === 'nakit' ? 'Nakit' : 'Kredi Kartı'}</div>
            </div>
            ` : ''}
            <div class="divider"></div>
            <div class="footer">
                <p>Teşekkür Ederiz</p>
                <p>Yeniden Bekleriz</p>
                <p style="margin-top: 5px; font-size: 9px;">Fiş No: ${receiptData.receiptNumber || 'N/A'}</p>
            </div>
        </body>
        </html>
    `;
}

