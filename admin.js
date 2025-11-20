import { db, auth } from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, getDocs, getDoc, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Utility Functions
const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : '#e53e3e'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    .loading { opacity: 0.6; pointer-events: none; }
`;
document.head.appendChild(style);

// Safe DOM creation helper
const createElement = (tag, props = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
        if (key === 'textContent' || key === 'innerText') {
            el.textContent = value;
        } else if (key === 'onclick') {
            el.addEventListener('click', value);
        } else {
            el.setAttribute(key, value);
        }
    });
    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else {
            el.appendChild(child);
        }
    });
    return el;
};

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminPanel = document.getElementById('admin-panel');
const logoutButton = document.getElementById('logout-button');

// Butonlar
const productBtn = document.getElementById('product-btn');
const orderStatusBtn = document.getElementById('order-status-btn');
const placeOrderBtn = document.getElementById('place-order-btn');
const reservationBtn = document.getElementById('reservation-btn');
const paymentBtn = document.getElementById('payment-btn');
const reportsBtn = document.getElementById('reports-btn');
const kitchenBtn = document.getElementById('kitchen-btn');
const inventoryBtn = document.getElementById('inventory-btn');
const crmBtn = document.getElementById('crm-btn');
const cashOpenBtn = document.getElementById('cash-open-btn');

// Modallar
const productModal = document.getElementById('product-modal');
const orderStatusModal = document.getElementById('order-status-modal');
const placeOrderModal = document.getElementById('place-order-modal');
const reservationModal = document.getElementById('reservation-modal');
const paymentModal = document.getElementById('payment-modal');
const reportsModal = document.getElementById('reports-modal');
const kitchenModal = document.getElementById('kitchen-modal');
const inventoryModal = document.getElementById('inventory-modal');
const crmModal = document.getElementById('crm-modal');
const cashModal = document.getElementById('cash-modal');

// İçerik elementleri
const addProductForm = document.getElementById('add-product-form');
const menuItemsList = document.getElementById('menu-items-list');
const newOrderForm = document.getElementById('new-order-form');
const reservationForm = document.getElementById('reservation-form');
const reservationsList = document.getElementById('reservations-list');
const paymentsList = document.getElementById('payments-list');
const reportDate = document.getElementById('report-date');
const generateReport = document.getElementById('generate-report');
const generateSalesReport = document.getElementById('generate-sales-report');
const generateInventoryReport = document.getElementById('generate-inventory-report');
const reportContent = document.getElementById('report-content');
const downloadPdf = document.getElementById('download-pdf');
const cashForm = document.getElementById('cash-form');
const paymentSplitForm = document.getElementById('payment-split-form');
const addInventoryForm = document.getElementById('add-inventory-form');
const inventoryList = document.getElementById('inventory-list');
const addCustomerForm = document.getElementById('add-customer-form');
const customersList = document.getElementById('customers-list');
const kitchenOrdersList = document.getElementById('kitchen-orders-list');
const markReady = document.getElementById('mark-ready');

// Table management elements
const tableCountInput = document.getElementById('table-count');
const websiteUrlInput = document.getElementById('website-url');
const saveTableCountBtn = document.getElementById('save-table-count');
const updateTableCountBtn = document.getElementById('update-table-count-btn');
const deleteAllTablesBtn = document.getElementById('delete-all-tables-btn');
const tableGrid = document.getElementById('table-grid');
const tableList = document.getElementById('table-list');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const tableDetailModal = document.getElementById('table-detail-modal');
const tableDetailContent = document.getElementById('table-detail-content');
const updateTableStatusBtn = document.getElementById('update-table-status');

// Get base URL for QR codes
function getBaseUrl() {
    // First try to get from input field
    const savedUrl = websiteUrlInput?.value.trim();
    if (savedUrl) {
        // Remove trailing slash if exists
        return savedUrl.replace(/\/$/, '');
    }
    
    // Try to get from localStorage
    const storedUrl = localStorage.getItem('websiteBaseUrl');
    if (storedUrl) {
        return storedUrl.replace(/\/$/, '');
    }
    
    // Fallback: use current origin (but warn if localhost)
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('file://')) {
        console.warn('⚠️ QR kodlar için geçerli bir URL gerekli! Lütfen ayarlardan website URL\'sini girin.');
    }
    return origin;
}

// Helper to get local IP address (for local development)
async function getLocalIP() {
    return new Promise((resolve) => {
        const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
        if (!RTCPeerConnection) {
            resolve(null);
            return;
        }
        
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const candidate = event.candidate.candidate;
                const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                if (match) {
                    const ip = match[1];
                    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                        pc.close();
                        resolve(ip);
                    }
                }
            }
        };
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        setTimeout(() => {
            pc.close();
            resolve(null);
        }, 2000);
    });
}

// Auto-detect and suggest local IP
if (websiteUrlInput) {
    websiteUrlInput.addEventListener('focus', async () => {
        if (!websiteUrlInput.value) {
            const localIP = await getLocalIP();
            if (localIP) {
                const currentPort = window.location.port || '8080';
                const suggestedUrl = `http://${localIP}:${currentPort}`;
                websiteUrlInput.placeholder = `Önerilen: ${suggestedUrl}`;
            }
        }
    });
}

// Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginForm.style.display = 'none';
        adminPanel.classList.remove('hidden');
        loadMenuItems();
        loadOrders();
        loadReservations();
        loadPayments();
        loadInventory();
        loadCustomers();
        loadKitchenOrders();
    } else {
        loginForm.style.display = 'block';
        adminPanel.classList.add('hidden');
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginButton = document.getElementById('login-button');
    
    if (!email || !password) {
        loginError.textContent = 'Lütfen tüm alanları doldurun.';
        loginError.classList.remove('hidden');
        return;
    }
    
    loginButton.disabled = true;
    loginButton.textContent = 'Giriş yapılıyor...';
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.classList.add('hidden');
        showNotification('Başarıyla giriş yapıldı!', 'success');
    } catch (error) {
        let errorMessage = 'Giriş başarısız.';
        if (error.code === 'auth/invalid-email') {
            errorMessage = 'Geçersiz e-posta adresi.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Geçersiz e-posta veya şifre.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.';
        }
        loginError.textContent = errorMessage;
        loginError.classList.remove('hidden');
        showNotification(errorMessage, 'error');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Giriş Yap';
    }
});

// Çıkış
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('Başarıyla çıkış yapıldı.', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Çıkış hatası:', error);
        showNotification('Çıkış yapılırken bir hata oluştu.', 'error');
    }
});

// Modal Aç/Kapat
function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modal = closeBtn.closest('.modal');
        closeModal(modal);
    });
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal);
        });
    }
});

// Buton Event'leri
productBtn.addEventListener('click', () => openModal(productModal));
orderStatusBtn.addEventListener('click', () => {
    openModal(orderStatusModal);
    loadTableSettings();
});
reservationBtn.addEventListener('click', () => openModal(reservationModal));
paymentBtn.addEventListener('click', () => openModal(paymentModal));
reportsBtn.addEventListener('click', () => openModal(reportsModal));
kitchenBtn.addEventListener('click', () => openModal(kitchenModal));
inventoryBtn.addEventListener('click', () => openModal(inventoryModal));
crmBtn.addEventListener('click', () => openModal(crmModal));
cashOpenBtn.addEventListener('click', () => openModal(cashModal));

// Table Management
let currentTablePage = 1;
const tablesPerPage = 20;
let totalTables = 0;
let tableUnsubscribe = null;

async function loadTableSettings() {
    if (!tableCountInput || !saveTableCountBtn) return;
    
    try {
        const settingsSnapshot = await getDocs(collection(db, 'tableSettings'));
        if (!settingsSnapshot.empty) {
            const settings = settingsSnapshot.docs[0].data();
            tableCountInput.value = settings.tableCount || '';
            if (websiteUrlInput && settings.websiteUrl) {
                websiteUrlInput.value = settings.websiteUrl;
                localStorage.setItem('websiteBaseUrl', settings.websiteUrl);
            } else if (websiteUrlInput) {
                // Try to get from localStorage
                const storedUrl = localStorage.getItem('websiteBaseUrl');
                if (storedUrl) {
                    websiteUrlInput.value = storedUrl;
                }
            }
            if (settings.tableCount) {
                totalTables = settings.tableCount;
                const tableSettingsDiv = document.getElementById('table-settings');
                if (tableSettingsDiv) tableSettingsDiv.style.display = 'none';
                if (tableGrid) {
                    tableGrid.style.display = 'block';
                    loadTables();
                }
            }
        } else {
            // Try to get URL from localStorage
            if (websiteUrlInput) {
                const storedUrl = localStorage.getItem('websiteBaseUrl');
                if (storedUrl) {
                    websiteUrlInput.value = storedUrl;
                }
            }
        }
    } catch (error) {
        console.error('Masa ayarları yükleme hatası:', error);
    }
}

saveTableCountBtn.addEventListener('click', async () => {
    const count = parseInt(tableCountInput.value);
    const websiteUrl = websiteUrlInput?.value.trim() || '';
    
    if (!count || count <= 0) {
        showNotification('Lütfen geçerli bir masa sayısı girin.', 'error');
        return;
    }
    
    // Validate URL if provided
    if (websiteUrl) {
        try {
            new URL(websiteUrl);
            localStorage.setItem('websiteBaseUrl', websiteUrl);
        } catch (e) {
            showNotification('Geçersiz URL formatı. Örnek: http://192.168.1.100:8080 veya https://yourwebsite.com', 'error');
            return;
        }
    }
    
    saveTableCountBtn.disabled = true;
    saveTableCountBtn.textContent = 'Kaydediliyor...';
    
    try {
        // Mevcut ayarları kontrol et
        const existingSettings = await getDocs(collection(db, 'tableSettings'));
        const settingsData = { 
            tableCount: count,
            ...(websiteUrl && { websiteUrl: websiteUrl })
        };
        
        if (!existingSettings.empty) {
            await updateDoc(doc(db, 'tableSettings', existingSettings.docs[0].id), settingsData);
        } else {
            await addDoc(collection(db, 'tableSettings'), settingsData);
        }
        
        // Mevcut masaları kontrol et ve eksik olanları ekle
        totalTables = count;
        const existingTablesSnapshot = await getDocs(collection(db, 'tables'));
        const existingTableNumbers = new Set();
        existingTablesSnapshot.forEach((docSnap) => {
            existingTableNumbers.add(docSnap.data().number);
        });
        
        // Eksik masaları ekle
        for (let i = 1; i <= count; i++) {
            if (!existingTableNumbers.has(i)) {
                await addDoc(collection(db, 'tables'), {
                    number: i,
                    status: 'Boş',
                    orderId: null,
                    createdAt: Timestamp.now()
                });
            }
        }
        
        // Fazla masaları sil (isteğe bağlı - yorum satırına alındı)
        // Eğer yeni sayı mevcut sayıdan azsa, fazla masaları silmek isterseniz bu kısmı açabilirsiniz
        /*
        for (const docSnap of existingTablesSnapshot.docs) {
            const tableNumber = docSnap.data().number;
            if (tableNumber > count) {
                await deleteDoc(doc(db, 'tables', docSnap.id));
            }
        }
        */
        
        document.getElementById('table-settings').style.display = 'none';
        tableGrid.style.display = 'block';
        loadTables();
        showNotification('Masalar başarıyla güncellendi!', 'success');
    } catch (error) {
        console.error('Masa oluşturma hatası:', error);
        showNotification('Masalar oluşturulurken bir hata oluştu.', 'error');
    } finally {
        saveTableCountBtn.disabled = false;
        saveTableCountBtn.textContent = 'Kaydet ve Masaları Yükle';
    }
});

// Masa sayısını güncelle butonu
if (updateTableCountBtn) {
    updateTableCountBtn.addEventListener('click', () => {
        const tableSettingsDiv = document.getElementById('table-settings');
        if (tableSettingsDiv) {
            tableSettingsDiv.style.display = 'block';
            tableGrid.style.display = 'none';
            // Mevcut masa sayısını input'a yükle
            loadTableSettings();
        }
    });
}

// Tüm masaları sil butonu
if (deleteAllTablesBtn) {
    deleteAllTablesBtn.addEventListener('click', async () => {
        if (!confirm('Tüm masaları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
            return;
        }
        
        if (!confirm('Bu işlem tüm masa kayıtlarını silecektir. Devam etmek istediğinizden emin misiniz?')) {
            return;
        }
        
        deleteAllTablesBtn.disabled = true;
        deleteAllTablesBtn.textContent = 'Siliniyor...';
        
        try {
            // Tüm masaları getir
            const tablesSnapshot = await getDocs(collection(db, 'tables'));
            const deletePromises = [];
            
            tablesSnapshot.forEach((docSnap) => {
                deletePromises.push(deleteDoc(doc(db, 'tables', docSnap.id)));
            });
            
            // Tüm masaları sil
            await Promise.all(deletePromises);
            
            // Table settings'i de sil (isteğe bağlı)
            const settingsSnapshot = await getDocs(collection(db, 'tableSettings'));
            if (!settingsSnapshot.empty) {
                await deleteDoc(doc(db, 'tableSettings', settingsSnapshot.docs[0].id));
            }
            
            // UI'ı güncelle
            totalTables = 0;
            tableList.innerHTML = '';
            tableGrid.style.display = 'none';
            document.getElementById('table-settings').style.display = 'block';
            tableCountInput.value = '';
            
            showNotification('Tüm masalar başarıyla silindi!', 'success');
        } catch (error) {
            console.error('Masa silme hatası:', error);
            showNotification('Masalar silinirken bir hata oluştu.', 'error');
        } finally {
            deleteAllTablesBtn.disabled = false;
            deleteAllTablesBtn.textContent = '🗑️ Tüm Masaları Sil';
        }
    });
}

function loadTables() {
    if (!tableList) return;
    
    if (tableUnsubscribe) {
        tableUnsubscribe();
    }
    
    tableUnsubscribe = onSnapshot(
        query(collection(db, 'tables'), orderBy('number', 'asc')),
        (snapshot) => {
            tableList.innerHTML = '';
            const tables = [];
            snapshot.forEach((docSnap) => {
                tables.push({ id: docSnap.id, ...docSnap.data() });
            });
            
            const startIndex = (currentTablePage - 1) * tablesPerPage;
            const endIndex = startIndex + tablesPerPage;
            const pageTables = tables.slice(startIndex, endIndex);
            
            if (pageTables.length === 0) {
                const emptyMsg = createElement('p', {
                    textContent: 'Henüz masa yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                tableList.appendChild(emptyMsg);
                return;
            }
            
            pageTables.forEach((table) => {
                const tableCard = createElement('div', {
                    className: 'table-card',
                    style: `
                        padding: 15px;
                        margin: 10px;
                        border-radius: 10px;
                        background: ${getTableColor(table.status)};
                        color: white;
                        cursor: pointer;
                        text-align: center;
                        min-width: 100px;
                        display: inline-block;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        transition: transform 0.2s;
                    `,
                    onclick: () => showTableDetails(table)
                });
                
                tableCard.appendChild(createElement('strong', {
                    textContent: `Masa ${table.number}`,
                    style: 'display: block; font-size: 18px;'
                }));
                tableCard.appendChild(createElement('p', {
                    textContent: table.status || 'Boş',
                    style: 'margin: 5px 0; font-size: 14px;'
                }));
                
                // QR Code button
                const qrBtn = createElement('button', {
                    textContent: '📱 QR',
                    style: 'margin-top: 5px; padding: 5px 10px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5); border-radius: 5px; color: white; cursor: pointer; font-size: 12px;',
                    onclick: (e) => {
                        e.stopPropagation();
                        showTableQRCode(table);
                    }
                });
                tableCard.appendChild(qrBtn);
                
                tableCard.addEventListener('mouseenter', () => {
                    tableCard.style.transform = 'scale(1.05)';
                });
                tableCard.addEventListener('mouseleave', () => {
                    tableCard.style.transform = 'scale(1)';
                });
                
                tableList.appendChild(tableCard);
            });
            
            updatePagination(tables.length);
        },
        (error) => {
            console.error('Masa yükleme hatası:', error);
            showNotification('Masalar yüklenirken bir hata oluştu.', 'error');
        }
    );
}

function getTableColor(status) {
    switch (status) {
        case 'Boş': return '#10b981';
        case 'Dolu': return '#e53e3e';
        case 'Rezerve': return '#f59e0b';
        default: return '#6b7280';
    }
}

function updatePagination(total) {
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    
    const totalPages = Math.ceil(total / tablesPerPage);
    pageInfo.textContent = `Sayfa ${currentTablePage} / ${totalPages}`;
    prevPageBtn.disabled = currentTablePage === 1;
    nextPageBtn.disabled = currentTablePage >= totalPages;
}

prevPageBtn.addEventListener('click', () => {
    if (currentTablePage > 1) {
        currentTablePage--;
        loadTables();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(totalTables / tablesPerPage);
    if (currentTablePage < totalPages) {
        currentTablePage++;
        loadTables();
    }
});

let selectedTableId = null;

async function showTableDetails(table) {
    selectedTableId = table.id;
    if (!tableDetailModal || !tableDetailContent) return;
    
    tableDetailContent.innerHTML = '';
    
    const tableInfo = createElement('div');
    tableInfo.appendChild(createElement('h4', {
        textContent: `Masa ${table.number}`,
        style: 'margin-bottom: 15px;'
    }));
    tableInfo.appendChild(createElement('p', {
        textContent: `Durum: ${table.status || 'Boş'}`,
        style: 'margin: 10px 0;'
    }));
    
    // Generate QR Code URL
    const baseUrl = getBaseUrl();
    const tableUrl = `${baseUrl}/table.html?table=${table.number}`;
    
    // Show URL in modal for verification
    tableInfo.appendChild(createElement('p', {
        textContent: `QR Kod URL: ${tableUrl}`,
        style: 'margin: 10px 0; font-size: 12px; color: #666; word-break: break-all; background: #f5f5f5; padding: 8px; border-radius: 5px;'
    }));
    
    // Generate QR Code
    const qrCodeContainer = document.getElementById('qr-code');
    if (qrCodeContainer) {
        qrCodeContainer.innerHTML = '<canvas id="qr-canvas-detail"></canvas>';
        const qrCanvasDetail = document.getElementById('qr-canvas-detail');
        
        let retryCountDetail = 0;
        const maxRetriesDetail = 10;
        
        function generateQRDetail() {
            // Try multiple library names
            const QRCodeLib = window.QRCode || window.qrcode || window.QRCodeJS;
            
            if (QRCodeLib && QRCodeLib.toCanvas) {
                try {
                    QRCodeLib.toCanvas(qrCanvasDetail, tableUrl, {
                        width: 200,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }, (error) => {
                        if (error) {
                            console.error('QR kod oluşturma hatası:', error);
                            qrCodeContainer.innerHTML = '<p style="color: red;">QR kod oluşturulamadı</p>';
                        }
                    });
                } catch (error) {
                    console.error('QR kod hatası:', error);
                    qrCodeContainer.innerHTML = '<p style="color: red;">QR kod oluşturulamadı</p>';
                }
            } else if (retryCountDetail < maxRetriesDetail) {
                retryCountDetail++;
                setTimeout(() => {
                    generateQRDetail();
                }, 300);
            } else {
                // Fallback: Use API
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tableUrl)}`;
                qrCodeContainer.innerHTML = `
                    <img src="${qrImageUrl}" alt="QR Code" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
                `;
                // Update download button
                const downloadQrBtn = document.getElementById('download-qr');
                if (downloadQrBtn) {
                    downloadQrBtn.onclick = () => {
                        const img = qrCodeContainer.querySelector('img');
                        if (img) {
                            fetch(img.src)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `masa-${table.number}-qr.png`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                });
                        }
                    };
                }
            }
        }
        
        generateQRDetail();
        
        // Download QR code button
        const downloadQrBtn = document.getElementById('download-qr');
        if (downloadQrBtn) {
            downloadQrBtn.onclick = () => {
                const canvas = qrCodeContainer.querySelector('canvas');
                if (canvas) {
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `masa-${table.number}-qr.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                    });
                }
            };
        }
    }
    
    if (table.orderId) {
        try {
            const orderRef = doc(db, 'orders', table.orderId);
            const orderDocSnap = await getDoc(orderRef);
            if (orderDocSnap.exists()) {
                const order = orderDocSnap.data();
                tableInfo.appendChild(createElement('p', {
                    textContent: `Sipariş ID: ${table.orderId.substring(0, 8)}`,
                    style: 'margin: 10px 0;'
                }));
                if (order.items && order.items.length > 0) {
                    const itemsList = createElement('ul', { style: 'margin: 10px 0; padding-left: 20px;' });
                    order.items.forEach(item => {
                        const li = createElement('li', {
                            textContent: `${item.name || item} - ${item.price || 0} TL`
                        });
                        itemsList.appendChild(li);
                    });
                    tableInfo.appendChild(itemsList);
                }
            } else {
                tableInfo.appendChild(createElement('p', {
                    textContent: `Sipariş ID: ${table.orderId.substring(0, 8)} (Sipariş bulunamadı)`,
                    style: 'margin: 10px 0; color: #999;'
                }));
            }
        } catch (error) {
            console.error('Sipariş yükleme hatası:', error);
            tableInfo.appendChild(createElement('p', {
                textContent: `Sipariş ID: ${table.orderId.substring(0, 8)}`,
                style: 'margin: 10px 0; color: #999;'
            }));
        }
    }
    
    const statusSelect = createElement('select', {
        id: 'table-status-select',
        style: 'width: 100%; padding: 10px; margin: 15px 0; border-radius: 5px;'
    });
    ['Boş', 'Dolu', 'Rezerve'].forEach(status => {
        const option = createElement('option', {
            value: status,
            textContent: status,
            selected: table.status === status
        });
        statusSelect.appendChild(option);
    });
    
    tableInfo.appendChild(statusSelect);
    tableDetailContent.appendChild(tableInfo);
    
    openModal(tableDetailModal);
}

updateTableStatusBtn.addEventListener('click', async () => {
    if (!selectedTableId) return;
    
    const statusSelect = document.getElementById('table-status-select');
    if (!statusSelect) return;
    
    const newStatus = statusSelect.value;
    
    try {
        await updateDoc(doc(db, 'tables', selectedTableId), {
            status: newStatus,
            updatedAt: Timestamp.now()
        });
        showNotification('Masa durumu güncellendi!', 'success');
        closeModal(tableDetailModal);
    } catch (error) {
        console.error('Masa güncelleme hatası:', error);
        showNotification('Masa güncellenirken bir hata oluştu.', 'error');
    }
});

// Show QR Code in a separate modal
function showTableQRCode(table) {
    const baseUrl = getBaseUrl();
    const tableUrl = `${baseUrl}/table.html?table=${table.number}`;
    
    // Create QR code modal
    const qrModal = createElement('div', {
        className: 'modal active',
        style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;'
    });
    
    const qrContent = createElement('div', {
        className: 'modal-content',
        style: 'background: white; padding: 30px; border-radius: 20px; text-align: center; max-width: 400px; max-height: 90vh; overflow-y: auto;'
    });
    
    qrContent.appendChild(createElement('h3', {
        textContent: `Masa ${table.number} - QR Kod`,
        style: 'margin-bottom: 20px;'
    }));
    
    // Show URL for verification
    const urlInfo = createElement('div', {
        style: 'background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; word-break: break-all;'
    });
    urlInfo.appendChild(createElement('strong', { textContent: 'URL: ' }));
    urlInfo.appendChild(createElement('span', { textContent: tableUrl }));
    qrContent.appendChild(urlInfo);
    
    // Warning if localhost
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.startsWith('file://')) {
        const warning = createElement('div', {
            style: 'background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; color: #856404;'
        });
        warning.innerHTML = '⚠️ <strong>Uyarı:</strong> Bu URL telefonlardan erişilemez. Lütfen ayarlardan geçerli bir website URL\'si girin (örn: http://192.168.1.100:8080)';
        qrContent.appendChild(warning);
    }
    
    const qrCanvas = createElement('canvas', {
        id: 'qr-canvas',
        style: 'margin: 20px auto; display: block;'
    });
    qrContent.appendChild(qrCanvas);
    
    qrContent.appendChild(createElement('p', {
        textContent: 'Müşteriler bu QR kodu tarayarak menüyü görüntüleyebilir ve sipariş verebilir.',
        style: 'margin: 15px 0; color: #666; font-size: 14px;'
    }));
    
    const buttonContainer = createElement('div', {
        style: 'display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 15px;'
    });
    
    const testBtn = createElement('button', {
        textContent: '🔗 URL\'yi Test Et',
        style: 'padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;',
        onclick: () => {
            window.open(tableUrl, '_blank');
        }
    });
    buttonContainer.appendChild(testBtn);
    
    const downloadBtn = createElement('button', {
        textContent: '📥 QR Kodu İndir',
        style: 'padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer;',
        onclick: () => {
            const canvas = qrCanvas.parentElement.querySelector('canvas');
            const img = qrCanvas.parentElement.querySelector('img');
            if (canvas) {
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `masa-${table.number}-qr.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                });
            } else if (img) {
                fetch(img.src)
                    .then(res => res.blob())
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `masa-${table.number}-qr.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                    });
            }
        }
    });
    buttonContainer.appendChild(downloadBtn);
    qrContent.appendChild(buttonContainer);
    
    const closeBtn = createElement('button', {
        textContent: 'Kapat',
        style: 'padding: 10px 20px; background: #e53e3e; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 10px 5px;',
        onclick: () => qrModal.remove()
    });
    qrContent.appendChild(closeBtn);
    
    qrModal.appendChild(qrContent);
    document.body.appendChild(qrModal);
    
    // Generate QR code - wait for library to load with multiple retries
    let retryCount = 0;
    const maxRetries = 10;
    
    function generateQR() {
        // Try multiple library names (different CDNs use different names)
        const QRCodeLib = window.QRCode || window.qrcode || window.QRCodeJS;
        
        if (QRCodeLib && QRCodeLib.toCanvas) {
            try {
                QRCodeLib.toCanvas(qrCanvas, tableUrl, {
                    width: 250,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, (error) => {
                    if (error) {
                        console.error('QR kod oluşturma hatası:', error);
                        qrCanvas.parentElement.innerHTML = '<p style="color: red;">QR kod oluşturulamadı: ' + error.message + '</p>';
                    }
                });
            } catch (error) {
                console.error('QR kod hatası:', error);
                qrCanvas.parentElement.innerHTML = '<p style="color: red;">QR kod oluşturulamadı</p>';
            }
        } else if (retryCount < maxRetries) {
            // Wait and try again
            retryCount++;
            setTimeout(() => {
                generateQR();
            }, 300);
        } else {
            // Fallback: Use API to generate QR code
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableUrl)}`;
            qrCanvas.parentElement.innerHTML = `
                <img src="${qrImageUrl}" alt="QR Code" style="max-width: 250px; height: auto;">
                <p style="margin-top: 10px; font-size: 12px; color: #666;">QR kod yüklendi</p>
            `;
            // Update download button to work with image
            const downloadBtn = qrContent.querySelector('button');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    const img = qrCanvas.parentElement.querySelector('img');
                    if (img) {
                        fetch(img.src)
                            .then(res => res.blob())
                            .then(blob => {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `masa-${table.number}-qr.png`;
                                a.click();
                                URL.revokeObjectURL(url);
                            });
                    }
                };
            }
        }
    }
    
    generateQR();
    
    // Close on background click
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.remove();
        }
    });
}

// Ürün Yönetimi
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const category = document.getElementById('product-category').value;
    
    if (!name || !price || price <= 0 || !category) {
        showNotification('Lütfen tüm gerekli alanları doğru şekilde doldurun.', 'error');
        return;
    }
    
    const submitBtn = addProductForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ekleniyor...';
    
    try {
        const productData = {
            name,
            price,
            category,
            ingredients: document.getElementById('product-ingredients').value.trim() || '',
            image: document.getElementById('product-image').value.trim() || '',
            createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'menuItems'), productData);
        addProductForm.reset();
        showNotification('Ürün başarıyla eklendi!', 'success');
    } catch (error) {
        console.error('Ürün ekleme hatası:', error);
        showNotification('Ürün eklenirken bir hata oluştu.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ekle';
    }
});

// Menü Öğelerini Yükle
function loadMenuItems() {
    if (!menuItemsList) return;
    
    const unsubscribe = onSnapshot(
        query(collection(db, 'menuItems'), orderBy('createdAt', 'desc')),
        (snapshot) => {
            menuItemsList.innerHTML = '';
            
            if (snapshot.empty) {
                const emptyMsg = createElement('p', {
                    textContent: 'Henüz ürün eklenmemiş.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                menuItemsList.appendChild(emptyMsg);
                return;
            }
            
            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const itemDiv = createElement('div', {
                    className: 'menu-item'
                });
                
                const itemInfo = createElement('div', { style: 'flex: 1;' });
                itemInfo.appendChild(createElement('strong', { textContent: item.name }));
                itemInfo.appendChild(createElement('p', {
                    textContent: `${item.price} TL • ${item.category}`,
                    style: 'margin: 5px 0; color: #666; font-size: 14px;'
                }));
                if (item.ingredients) {
                    itemInfo.appendChild(createElement('p', {
                        textContent: `Malzemeler: ${item.ingredients}`,
                        style: 'font-size: 12px; color: #999;'
                    }));
                }
                
                const deleteBtn = createElement('button', {
                    className: 'delete-item',
                    textContent: 'Sil',
                    onclick: () => deleteItem(docSnap.id)
                });
                
                itemDiv.appendChild(itemInfo);
                itemDiv.appendChild(deleteBtn);
                menuItemsList.appendChild(itemDiv);
            });
        },
        (error) => {
            console.error('Menü yükleme hatası:', error);
            showNotification('Menü yüklenirken bir hata oluştu.', 'error');
        }
    );
    
    return unsubscribe;
}

// Ürün Sil
async function deleteItem(id) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'menuItems', id));
        showNotification('Ürün başarıyla silindi.', 'success');
    } catch (error) {
        console.error('Ürün silme hatası:', error);
        showNotification('Ürün silinirken bir hata oluştu.', 'error');
    }
}

// Siparişleri Yükle (genel kullanım için)
function loadOrders() {
    // Bu fonksiyon artık sadece genel sipariş yükleme için kullanılıyor
    // Spesifik sipariş yönetimi table management içinde yapılıyor
}

// Yeni Sipariş - Menü öğelerini yükle
async function loadOrderItems() {
    const orderItemsSelect = document.getElementById('order-items');
    if (!orderItemsSelect) return;
    
    try {
        const snapshot = await getDocs(query(collection(db, 'menuItems'), orderBy('name')));
        orderItemsSelect.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const option = createElement('option', {
                value: docSnap.id,
                textContent: `${item.name} - ${item.price} TL`
            });
            orderItemsSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Menü yükleme hatası:', error);
    }
}

// Yeni Sipariş
newOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = e.target[0].value.trim();
    const address = e.target[1].value.trim();
    const phone = e.target[2].value.trim();
    const notes = e.target[3].value.trim();
    const selectedItems = Array.from(document.getElementById('order-items').selectedOptions);
    
    if (!customerName || !address || !phone || selectedItems.length === 0) {
        showNotification('Lütfen tüm gerekli alanları doldurun ve en az bir ürün seçin.', 'error');
        return;
    }
    
    const submitBtn = newOrderForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Oluşturuluyor...';
    
    try {
        const items = selectedItems.map(opt => ({
            id: opt.value,
            name: opt.text.split(' - ')[0],
            price: parseFloat(opt.text.split(' - ')[1].replace(' TL', ''))
        }));
        
        const total = items.reduce((sum, item) => sum + item.price, 0);
        
        const orderData = {
            customerName,
            address,
            phone,
            notes,
            items,
            total,
            status: 'Hazırlanıyor',
            createdAt: Timestamp.now()
        };
        
        await addDoc(collection(db, 'orders'), orderData);
        newOrderForm.reset();
        showNotification('Sipariş başarıyla oluşturuldu!', 'success');
        closeModal(placeOrderModal);
    } catch (error) {
        console.error('Sipariş oluşturma hatası:', error);
        showNotification('Sipariş oluşturulurken bir hata oluştu.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sipariş Ver';
    }
});

// Place order modal açıldığında menü öğelerini yükle
placeOrderBtn.addEventListener('click', () => {
    openModal(placeOrderModal);
    loadOrderItems();
});

// Rezervasyon
reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('res-date').value;
    const time = document.getElementById('res-time').value;
    const people = parseInt(document.getElementById('res-people').value);
    const name = document.getElementById('res-name').value.trim();
    const phone = document.getElementById('res-phone').value.trim();
    
    if (!date || !time || !people || people <= 0 || !name) {
        showNotification('Lütfen tüm gerekli alanları doğru şekilde doldurun.', 'error');
        return;
    }
    
    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ekleniyor...';
    
    try {
        const resData = {
            date,
            time,
            people,
            name,
            phone: phone || '',
            createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'reservations'), resData);
        reservationForm.reset();
        showNotification('Rezervasyon başarıyla eklendi!', 'success');
    } catch (error) {
        console.error('Rezervasyon ekleme hatası:', error);
        showNotification('Rezervasyon eklenirken bir hata oluştu.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Rezervasyon Ekle';
    }
});

// Rezervasyonları Yükle
function loadReservations() {
    if (!reservationsList) return;
    
    onSnapshot(
        query(collection(db, 'reservations'), orderBy('createdAt', 'desc')),
        (snapshot) => {
            reservationsList.innerHTML = '';
            
            if (snapshot.empty) {
                const emptyMsg = createElement('p', {
                    textContent: 'Henüz rezervasyon yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                reservationsList.appendChild(emptyMsg);
                return;
            }
            
            snapshot.forEach((docSnap) => {
                const res = docSnap.data();
                const resDiv = createElement('div', {
                    className: 'menu-item',
                    style: 'padding: 15px; margin: 10px 0;'
                });
                
                const resInfo = createElement('div');
                resInfo.appendChild(createElement('strong', { textContent: res.name }));
                resInfo.appendChild(createElement('p', {
                    textContent: `${res.date} • ${res.time} • ${res.people} kişi`,
                    style: 'margin: 5px 0; color: #666;'
                }));
                if (res.phone) {
                    resInfo.appendChild(createElement('p', {
                        textContent: `Tel: ${res.phone}`,
                        style: 'font-size: 14px; color: #999;'
                    }));
                }
                
                resDiv.appendChild(resInfo);
                reservationsList.appendChild(resDiv);
            });
        },
        (error) => {
            console.error('Rezervasyon yükleme hatası:', error);
            showNotification('Rezervasyonlar yüklenirken bir hata oluştu.', 'error');
        }
    );
}

// Ödeme Bölme
paymentSplitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = document.getElementById('payment-order-id').value.trim();
    const splitType = document.getElementById('split-type').value;
    const splitValue = parseFloat(document.getElementById('split-value').value);
    
    if (!orderId || !splitValue || splitValue <= 0) {
        showNotification('Lütfen tüm alanları doğru şekilde doldurun.', 'error');
        return;
    }
    
    const submitBtn = paymentSplitForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'İşleniyor...';
    
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            splitType,
            splitValue,
            paid: true,
            paidAt: Timestamp.now()
        });
        
        paymentSplitForm.reset();
        showNotification('Ödeme başarıyla bölündü!', 'success');
    } catch (error) {
        console.error('Ödeme bölme hatası:', error);
        if (error.code === 'not-found') {
            showNotification('Sipariş bulunamadı.', 'error');
        } else {
            showNotification('Ödeme bölünürken bir hata oluştu.', 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Böl ve Öde';
    }
});

// Ödemeleri Yükle
function loadPayments() {
    if (!paymentsList) return;
    
    onSnapshot(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
        (snapshot) => {
            paymentsList.innerHTML = '';
            const unpaidOrders = [];
            
            snapshot.forEach((docSnap) => {
                const order = docSnap.data();
                if (!order.paid) {
                    unpaidOrders.push({ id: docSnap.id, ...order });
                }
            });
            
            if (unpaidOrders.length === 0) {
                const emptyMsg = createElement('p', {
                    textContent: 'Bekleyen ödeme yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                paymentsList.appendChild(emptyMsg);
                return;
            }
            
            unpaidOrders.forEach((order) => {
                const payDiv = createElement('div', {
                    className: 'menu-item',
                    style: 'padding: 15px; margin: 10px 0;'
                });
                
                const orderInfo = createElement('div', { style: 'flex: 1;' });
                orderInfo.appendChild(createElement('strong', {
                    textContent: `Sipariş #${order.id.substring(0, 8)}`
                }));
                orderInfo.appendChild(createElement('p', {
                    textContent: `Müşteri: ${order.customerName || 'Bilinmiyor'}`,
                    style: 'margin: 5px 0; color: #666;'
                }));
                orderInfo.appendChild(createElement('p', {
                    textContent: `Toplam: ${order.total || 0} TL`,
                    style: 'font-weight: bold; color: #ff6f61;'
                }));
                
                payDiv.appendChild(orderInfo);
                paymentsList.appendChild(payDiv);
            });
        },
        (error) => {
            console.error('Ödeme yükleme hatası:', error);
            showNotification('Ödemeler yüklenirken bir hata oluştu.', 'error');
        }
    );
}

// Raporlar
generateReport.addEventListener('click', async () => {
    const date = reportDate.value || new Date().toISOString().split('T')[0];
    generateReport.disabled = true;
    generateReport.textContent = 'Hazırlanıyor...';
    
    try {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const ordersSnapshot = await getDocs(
            query(
                collection(db, 'orders'),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('createdAt', '<=', Timestamp.fromDate(endDate))
            )
        );
        
        let totalSales = 0;
        let orderCount = 0;
        ordersSnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            if (order.paid) {
                totalSales += order.total || 0;
                orderCount++;
            }
        });
        
        reportContent.innerHTML = `
            <div style="padding: 20px;">
                <h4>Z Raporu - ${date}</h4>
                <p><strong>Toplam Satış:</strong> ${totalSales.toFixed(2)} TL</p>
                <p><strong>Sipariş Sayısı:</strong> ${orderCount}</p>
                <p><strong>Ortalama Sipariş:</strong> ${orderCount > 0 ? (totalSales / orderCount).toFixed(2) : 0} TL</p>
            </div>
        `;
        showNotification('Z raporu oluşturuldu!', 'success');
    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showNotification('Rapor oluşturulurken bir hata oluştu.', 'error');
    } finally {
        generateReport.disabled = false;
        generateReport.textContent = 'Z Raporu';
    }
});

generateSalesReport.addEventListener('click', async () => {
    generateSalesReport.disabled = true;
    generateSalesReport.textContent = 'Hazırlanıyor...';
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const ordersSnapshot = await getDocs(
            query(
                collection(db, 'orders'),
                where('createdAt', '>=', Timestamp.fromDate(today)),
                where('createdAt', '<', Timestamp.fromDate(tomorrow))
            )
        );
        
        let dailySales = 0;
        ordersSnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            dailySales += order.total || 0;
        });
        
        reportContent.innerHTML = `
            <div style="padding: 20px;">
                <h4>Günlük Satış Raporu</h4>
                <p><strong>Bugünkü Ciro:</strong> ${dailySales.toFixed(2)} TL</p>
                <p><strong>Toplam Sipariş:</strong> ${ordersSnapshot.size}</p>
            </div>
        `;
        showNotification('Satış raporu oluşturuldu!', 'success');
    } catch (error) {
        console.error('Satış raporu hatası:', error);
        showNotification('Satış raporu oluşturulurken bir hata oluştu.', 'error');
    } finally {
        generateSalesReport.disabled = false;
        generateSalesReport.textContent = 'Satış Raporu';
    }
});

generateInventoryReport.addEventListener('click', async () => {
    generateInventoryReport.disabled = true;
    generateInventoryReport.textContent = 'Hazırlanıyor...';
    
    try {
        const inventorySnapshot = await getDocs(collection(db, 'inventory'));
        let reportHtml = '<div style="padding: 20px;"><h4>Stok Raporu</h4><ul>';
        
        if (inventorySnapshot.empty) {
            reportHtml += '<li>Stok kaydı bulunamadı.</li>';
        } else {
            inventorySnapshot.forEach((docSnap) => {
                const item = docSnap.data();
                reportHtml += `<li><strong>${item.name}:</strong> ${item.quantity} adet - Maliyet: ${item.cost} TL</li>`;
            });
        }
        
        reportHtml += '</ul></div>';
        reportContent.innerHTML = reportHtml;
        showNotification('Stok raporu oluşturuldu!', 'success');
    } catch (error) {
        console.error('Stok raporu hatası:', error);
        showNotification('Stok raporu oluşturulurken bir hata oluştu.', 'error');
    } finally {
        generateInventoryReport.disabled = false;
        generateInventoryReport.textContent = 'Stok Raporu';
    }
});

downloadPdf.addEventListener('click', () => {
    if (!reportContent || !reportContent.textContent.trim()) {
        showNotification('Önce bir rapor oluşturun.', 'error');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();
        pdfDoc.setFontSize(16);
        pdfDoc.text('Rapor', 10, 20);
        pdfDoc.setFontSize(12);
        const lines = pdfDoc.splitTextToSize(reportContent.textContent, 180);
        pdfDoc.text(lines, 10, 30);
        pdfDoc.save(`rapor-${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('PDF indirildi!', 'success');
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        showNotification('PDF oluşturulurken bir hata oluştu.', 'error');
    }
});

// Kasa Aç
cashForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const balance = parseFloat(document.getElementById('initial-balance').value);
    
    if (!balance || balance < 0) {
        showNotification('Lütfen geçerli bir bakiye girin.', 'error');
        return;
    }
    
    const submitBtn = cashForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Açılıyor...';
    
    try {
        await addDoc(collection(db, 'cashRegister'), {
            balance,
            openedAt: Timestamp.now(),
            status: 'open'
        });
        cashForm.reset();
        showNotification('Kasa başarıyla açıldı!', 'success');
        closeModal(cashModal);
    } catch (error) {
        console.error('Kasa açma hatası:', error);
        showNotification('Kasa açılırken bir hata oluştu.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kasa Aç';
    }
});

// Mutfak Yönetimi
function loadKitchenOrders() {
    if (!kitchenOrdersList) return;
    
    onSnapshot(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
        (snapshot) => {
            kitchenOrdersList.innerHTML = '';
            const activeOrders = [];
            
            snapshot.forEach((docSnap) => {
                const order = docSnap.data();
                if (order.status !== 'Hazır' && order.status !== 'Teslim Edildi') {
                    activeOrders.push({ id: docSnap.id, ...order });
                }
            });
            
            if (activeOrders.length === 0) {
                const emptyMsg = createElement('p', {
                    textContent: 'Bekleyen sipariş yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                kitchenOrdersList.appendChild(emptyMsg);
                return;
            }
            
            activeOrders.forEach((order) => {
                const orderDiv = createElement('div', {
                    className: 'menu-item',
                    style: 'padding: 15px; margin: 10px 0; border-left: 4px solid #ff6f61;'
                });
                
                const orderInfo = createElement('div', { style: 'flex: 1;' });
                orderInfo.appendChild(createElement('strong', {
                    textContent: `Sipariş #${order.id.substring(0, 8)}`
                }));
                orderInfo.appendChild(createElement('p', {
                    textContent: `Durum: ${order.status || 'Hazırlanıyor'}`,
                    style: 'margin: 5px 0; color: #666;'
                }));
                if (order.items && order.items.length > 0) {
                    const itemsList = createElement('ul', { style: 'margin: 10px 0; padding-left: 20px;' });
                    order.items.forEach(item => {
                        const li = createElement('li', { textContent: item.name || item });
                        itemsList.appendChild(li);
                    });
                    orderInfo.appendChild(itemsList);
                }
                
                const readyBtn = createElement('button', {
                    className: 'delete-item',
                    style: 'background: #10b981;',
                    textContent: 'Hazır',
                    onclick: () => markOrderReady(order.id)
                });
                
                orderDiv.appendChild(orderInfo);
                orderDiv.appendChild(readyBtn);
                kitchenOrdersList.appendChild(orderDiv);
            });
        },
        (error) => {
            console.error('Mutfak sipariş yükleme hatası:', error);
            showNotification('Siparişler yüklenirken bir hata oluştu.', 'error');
        }
    );
}

async function markOrderReady(id) {
    try {
        await updateDoc(doc(db, 'orders', id), { status: 'Hazır' });
        showNotification('Sipariş hazır olarak işaretlendi!', 'success');
    } catch (error) {
        console.error('Sipariş güncelleme hatası:', error);
        showNotification('Sipariş güncellenirken bir hata oluştu.', 'error');
    }
}

// Stok Yönetimi
addInventoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('item-name').value.trim();
    const quantity = parseFloat(document.getElementById('item-quantity').value);
    const cost = parseFloat(document.getElementById('item-cost').value);
    
    if (!name || !quantity || quantity <= 0 || !cost || cost < 0) {
        showNotification('Lütfen tüm alanları doğru şekilde doldurun.', 'error');
        return;
    }
    
    const submitBtn = addInventoryForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ekleniyor...';
    
    try {
        const itemData = {
            name,
            quantity,
            cost,
            createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'inventory'), itemData);
        addInventoryForm.reset();
        showNotification('Malzeme başarıyla eklendi!', 'success');
    } catch (error) {
        console.error('Stok ekleme hatası:', error);
        showNotification('Malzeme eklenirken bir hata oluştu.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ekle';
    }
});

// Stok Yükle
function loadInventory() {
    if (!inventoryList) return;
    
    onSnapshot(
        query(collection(db, 'inventory'), orderBy('createdAt', 'desc')),
        (snapshot) => {
            inventoryList.innerHTML = '';
            
            if (snapshot.empty) {
                const emptyMsg = createElement('p', {
                    textContent: 'Henüz stok kaydı yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                inventoryList.appendChild(emptyMsg);
                return;
            }
            
            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const itemDiv = createElement('div', {
                    className: 'menu-item'
                });
                
                const itemInfo = createElement('div', { style: 'flex: 1;' });
                itemInfo.appendChild(createElement('strong', { textContent: item.name }));
                itemInfo.appendChild(createElement('p', {
                    textContent: `Miktar: ${item.quantity} adet • Maliyet: ${item.cost} TL`,
                    style: 'margin: 5px 0; color: #666;'
                }));
                
                itemDiv.appendChild(itemInfo);
                inventoryList.appendChild(itemDiv);
            });
        },
        (error) => {
            console.error('Stok yükleme hatası:', error);
            showNotification('Stok yüklenirken bir hata oluştu.', 'error');
        }
    );
}

// CRM
addCustomerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    
    if (!name || !phone) {
        showNotification('Lütfen en azından ad ve telefon bilgilerini girin.', 'error');
        return;
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('Geçerli bir e-posta adresi girin.', 'error');
        return;
    }
    
    const submitBtn = addCustomerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ekleniyor...';
    
    try {
        const customerData = {
            name,
            phone,
            email: email || '',
            createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'customers'), customerData);
        addCustomerForm.reset();
        showNotification('Müşteri başarıyla eklendi!', 'success');
    } catch (error) {
        console.error('Müşteri ekleme hatası:', error);
        showNotification('Müşteri eklenirken bir hata oluştu.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ekle';
    }
});

// Müşterileri Yükle
function loadCustomers() {
    if (!customersList) return;
    
    onSnapshot(
        query(collection(db, 'customers'), orderBy('createdAt', 'desc')),
        (snapshot) => {
            customersList.innerHTML = '';
            
            if (snapshot.empty) {
                const emptyMsg = createElement('p', {
                    textContent: 'Henüz müşteri kaydı yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                customersList.appendChild(emptyMsg);
                return;
            }
            
            snapshot.forEach((docSnap) => {
                const customer = docSnap.data();
                const customerDiv = createElement('div', {
                    className: 'menu-item'
                });
                
                const customerInfo = createElement('div', { style: 'flex: 1;' });
                customerInfo.appendChild(createElement('strong', { textContent: customer.name }));
                customerInfo.appendChild(createElement('p', {
                    textContent: `Tel: ${customer.phone}`,
                    style: 'margin: 5px 0; color: #666;'
                }));
                if (customer.email) {
                    customerInfo.appendChild(createElement('p', {
                        textContent: `E-posta: ${customer.email}`,
                        style: 'font-size: 14px; color: #999;'
                    }));
                }
                
                customerDiv.appendChild(customerInfo);
                customersList.appendChild(customerDiv);
            });
        },
        (error) => {
            console.error('Müşteri yükleme hatası:', error);
            showNotification('Müşteriler yüklenirken bir hata oluştu.', 'error');
        }
    );
}