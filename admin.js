import { db, auth } from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, getDocs, getDoc, orderBy, Timestamp, limit
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

// Global Variables
let selectedTableId = null;

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
const printerSettingsBtn = document.getElementById('printer-settings-btn');

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
const printerSettingsModal = document.getElementById('printer-settings-modal');

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
    console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
    if (user) {
        console.log('User authenticated:', user.email);
        if (loginForm) loginForm.style.display = 'none';
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
            // Load data only after authentication
            loadMenuItems();
            loadOrders();
            loadReservations();
            loadPayments();
            loadInventory();
            loadCustomers();
            loadKitchenOrders();
            loadTableSettings();
        }
    } else {
        console.log('User not authenticated');
        if (loginForm) loginForm.style.display = 'block';
        if (adminPanel) adminPanel.classList.add('hidden');
    }
}, (error) => {
    console.error('Auth state change error:', error);
    showNotification('Kimlik doğrulama hatası: ' + error.message, 'error');
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

// Load Payments Function
function loadPayments() {
    // Payment data is loaded when payment modal is opened
    // This function exists to prevent ReferenceError
    // Actual loading happens in loadPaymentTables when modal opens
}

// Load tables for payment modal
async function loadPaymentTables() {
    const tablesList = document.getElementById('payment-tables-list');
    if (!tablesList) return;
    
    try {
        tablesList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;">Yükleniyor...</p>';
        
        // Get all tables
        const tablesSnapshot = await getDocs(query(collection(db, 'tables'), orderBy('number', 'asc')));
        
        if (tablesSnapshot.empty) {
            tablesList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;">Henüz masa oluşturulmamış.</p>';
            return;
        }
        
        tablesList.innerHTML = '';
        
        // Get unpaid orders grouped by table
        const ordersSnapshot = await getDocs(
            query(
                collection(db, 'orders'),
                where('paid', '==', false)
            )
        );
        
        const ordersByTable = {};
        let totalUnpaid = 0;
        
        ordersSnapshot.forEach((doc) => {
            const order = doc.data();
            if (order.tableNumber) {
                if (!ordersByTable[order.tableNumber]) {
                    ordersByTable[order.tableNumber] = [];
                }
                ordersByTable[order.tableNumber].push({
                    id: doc.id,
                    ...order,
                    total: order.total || 0
                });
                totalUnpaid += order.total || 0;
            }
        });
        
        // Create table cards
        tablesSnapshot.forEach((docSnap) => {
            const table = { id: docSnap.id, ...docSnap.data() };
            const tableNumber = table.number;
            const tableOrders = ordersByTable[tableNumber] || [];
            const tableTotal = tableOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const hasUnpaidOrders = tableOrders.length > 0;
            
            const tableCard = createElement('div', {
                className: 'payment-table-card',
                style: `
                    padding: 15px;
                    border-radius: 10px;
                    background: ${hasUnpaidOrders ? '#fef3c7' : '#f3f4f6'};
                    border: 2px solid ${hasUnpaidOrders ? '#f59e0b' : '#e5e7eb'};
                    cursor: pointer;
                    text-align: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                `,
                onclick: () => {
                    if (hasUnpaidOrders) {
                        showTableOrdersForPayment(tableNumber, tableOrders);
                    } else {
                        showNotification('Bu masada ödenmemiş sipariş bulunmamaktadır.', 'error');
                    }
                }
            });
            
            tableCard.appendChild(createElement('div', {
                textContent: `Masa ${tableNumber}`,
                style: 'font-size: 18px; font-weight: bold; margin-bottom: 8px;'
            }));
            
            tableCard.appendChild(createElement('div', {
                textContent: table.status || 'Boş',
                style: 'font-size: 14px; color: #666; margin-bottom: 8px;'
            }));
            
            if (hasUnpaidOrders) {
                tableCard.appendChild(createElement('div', {
                    textContent: `${tableOrders.length} Sipariş`,
                    style: 'font-size: 12px; color: #f59e0b; font-weight: bold; margin-bottom: 5px;'
                }));
                tableCard.appendChild(createElement('div', {
                    textContent: `${tableTotal.toFixed(2)} ₺`,
                    style: 'font-size: 16px; font-weight: bold; color: #e53e3e;'
                }));
            } else {
                tableCard.appendChild(createElement('div', {
                    textContent: 'Ödeme Yok',
                    style: 'font-size: 12px; color: #9ca3af;'
                }));
            }
            
            tableCard.addEventListener('mouseenter', () => {
                if (hasUnpaidOrders) {
                    tableCard.style.transform = 'scale(1.05)';
                    tableCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
            });
            
            tableCard.addEventListener('mouseleave', () => {
                tableCard.style.transform = 'scale(1)';
                tableCard.style.boxShadow = 'none';
            });
            
            tablesList.appendChild(tableCard);
        });
        
    } catch (error) {
        console.error('Masalar yüklenirken hata oluştu:', error);
        showNotification('Masalar yüklenirken bir hata oluştu!', 'error');
        tablesList.innerHTML = '<p style="text-align: center; color: #e53e3e; padding: 20px; grid-column: 1 / -1;">Hata oluştu. Lütfen tekrar deneyin.</p>';
    }
}

// Show orders for selected table in payment modal
function showTableOrdersForPayment(tableNumber, orders) {
    const tablesSection = document.getElementById('payment-tables-section');
    const selectedTableOrders = document.getElementById('selected-table-orders');
    const tableOrdersList = document.getElementById('table-orders-for-payment');
    const selectedTableTitle = document.getElementById('selected-table-title');
    
    if (!selectedTableOrders || !tableOrdersList) return;
    
    // Hide tables list, show orders
    const tablesList = document.getElementById('payment-tables-list');
    if (tablesList) tablesList.style.display = 'none';
    selectedTableOrders.style.display = 'block';
    selectedTableTitle.textContent = `Masa #${tableNumber} - Siparişler`;
    
    // Clear previous orders
    tableOrdersList.innerHTML = '';
    
    if (orders.length === 0) {
        tableOrdersList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Bu masada ödenmemiş sipariş bulunmamaktadır.</p>';
        return;
    }
    
    let totalAmount = 0;
    
    orders.forEach(order => {
        totalAmount += order.total || 0;
        
        const orderCard = createElement('div', {
            className: 'payment-order-card',
            style: 'background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'
        });
        
        const orderHeader = createElement('div', {
            style: 'display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;'
        });
        
        orderHeader.innerHTML = `
            <div>
                <strong>Sipariş #${order.id.substring(0, 8)}</strong>
                <div style="color: #666; font-size: 0.9em; margin-top: 3px;">
                    ${new Date(order.createdAt?.toDate() || new Date()).toLocaleString('tr-TR')}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: #e53e3e; font-size: 18px;">${(order.total || 0).toFixed(2)} ₺</div>
            </div>
        `;
        
        const orderItems = createElement('div', {
            style: 'margin: 10px 0; padding: 10px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;'
        });
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemElement = createElement('div', {
                    style: 'display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px;'
                });
                itemElement.innerHTML = `
                    <span>${item.quantity || 1}x ${item.name || 'Ürün'}</span>
                    <span>${((item.price || 0) * (item.quantity || 1)).toFixed(2)} ₺</span>
                `;
                orderItems.appendChild(itemElement);
            });
        }
        
        const orderActions = createElement('div', {
            style: 'display: flex; gap: 10px; margin-top: 15px;'
        });
        
        const payBtn = createElement('button', {
            textContent: '💳 Ödeme Yap',
            style: 'flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;',
            onclick: () => selectOrderForPayment(order.id, order.total || 0, false)
        });
        
        const splitBtn = createElement('button', {
            textContent: '📊 Böl',
            style: 'flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;',
            onclick: () => selectOrderForPayment(order.id, order.total || 0, true)
        });
        
        orderActions.appendChild(payBtn);
        orderActions.appendChild(splitBtn);
        
        orderCard.appendChild(orderHeader);
        orderCard.appendChild(orderItems);
        orderCard.appendChild(orderActions);
        
        tableOrdersList.appendChild(orderCard);
    });
    
    // Add total summary
    const totalCard = createElement('div', {
        style: 'background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 15px; margin-top: 15px; text-align: center;'
    });
    totalCard.innerHTML = `
        <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Toplam Tutar</div>
        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${totalAmount.toFixed(2)} ₺</div>
        <button id="pay-all-orders" style="margin-top: 10px; padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
            Tümünü Öde
        </button>
    `;
    
    // Add pay all functionality
    const payAllBtn = totalCard.querySelector('#pay-all-orders');
    if (payAllBtn) {
        payAllBtn.addEventListener('click', () => {
            if (confirm(`Masa #${tableNumber} için toplam ${totalAmount.toFixed(2)} ₺ tutarındaki tüm siparişleri ödemek istediğinize emin misiniz?`)) {
                payAllTableOrders(tableNumber, orders);
            }
        });
    }
    
    tableOrdersList.appendChild(totalCard);
    
    // Back button functionality
    const backBtn = document.getElementById('back-to-tables');
    if (backBtn) {
        backBtn.onclick = () => {
            selectedTableOrders.style.display = 'none';
            if (tablesList) tablesList.style.display = 'grid';
        };
    }
}

// Pay all orders for a table
async function payAllTableOrders(tableNumber, orders) {
    try {
        const paymentMethod = confirm('Nakit ödeme mi yapılacak? (Tamam = Nakit, İptal = Kredi Kartı)') ? 'nakit' : 'kredi-karti';
        const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        const updatePromises = orders.map(order => {
            return updateDoc(doc(db, 'orders', order.id), {
                paid: true,
                paymentMethod: paymentMethod,
                paymentAmount: order.total || 0,
                paymentDate: Timestamp.now(),
                status: 'completed',
                updatedAt: Timestamp.now()
            });
        });
        
        await Promise.all(updatePromises);
        
        // Update table status
        await updateTableStatusAfterPayment(tableNumber);
        
        showNotification(`Masa #${tableNumber} için ${orders.length} sipariş başarıyla ödendi!`, 'success');
        
        // Print combined receipt
        if (typeof printReceipt === 'function') {
            const allItems = [];
            orders.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        allItems.push({
                            name: item.name || 'Ürün',
                            price: item.price || 0,
                            quantity: item.quantity || 1
                        });
                    });
                }
            });
            
            printReceipt({
                orderNumber: `MASA-${tableNumber}`,
                tableNumber: tableNumber,
                waiter: 'Yok',
                items: allItems,
                total: totalAmount,
                paymentMethod: paymentMethod,
                status: 'completed',
                createdAt: new Date()
            });
        }
        
        // Reload tables
        loadPaymentTables();
        
        // Hide payment form and show tables
        document.getElementById('payment-form-container').style.display = 'none';
        document.getElementById('selected-table-orders').style.display = 'none';
        const tablesList = document.getElementById('payment-tables-list');
        if (tablesList) tablesList.style.display = 'grid';
        
    } catch (error) {
        console.error('Toplu ödeme hatası:', error);
        showNotification('Ödeme işlemi sırasında bir hata oluştu!', 'error');
    }
}

// Update table status after payment
async function updateTableStatusAfterPayment(tableNumber) {
    try {
        // Find table by number
        const tablesQuery = query(
            collection(db, 'tables'),
            where('number', '==', parseInt(tableNumber))
        );
        const tablesSnapshot = await getDocs(tablesQuery);
        
        if (!tablesSnapshot.empty) {
            const tableDoc = tablesSnapshot.docs[0];
            
            // Check if there are any unpaid orders for this table
            const unpaidOrdersQuery = query(
                collection(db, 'orders'),
                where('tableNumber', '==', parseInt(tableNumber)),
                where('paid', '==', false)
            );
            const unpaidOrdersSnapshot = await getDocs(unpaidOrdersQuery);
            
            if (unpaidOrdersSnapshot.empty) {
                // No unpaid orders, set table to "Boş"
                await updateDoc(doc(db, 'tables', tableDoc.id), {
                    status: 'Boş',
                    updatedAt: Timestamp.now()
                });
            } else {
                // Still has unpaid orders, keep as "Dolu"
                await updateDoc(doc(db, 'tables', tableDoc.id), {
                    status: 'Dolu',
                    updatedAt: Timestamp.now()
                });
            }
        }
    } catch (error) {
        console.error('Masa durumu güncelleme hatası:', error);
        // Don't show error to user, just log it
    }
}

// Buton Event'leri
productBtn.addEventListener('click', () => openModal(productModal));
orderStatusBtn.addEventListener('click', () => {
    openModal(orderStatusModal);
    loadTableSettings();
});
reservationBtn.addEventListener('click', () => openModal(reservationModal));
paymentBtn.addEventListener('click', () => {
    openModal(paymentModal);
    loadPaymentTables();
    // Reset to tables tab
    document.getElementById('payment-tab-tables').classList.add('active');
    document.getElementById('payment-tab-orders').classList.remove('active');
    document.getElementById('payment-tables-section').style.display = 'block';
    document.getElementById('payment-orders-section').style.display = 'none';
    document.getElementById('payment-form-container').style.display = 'none';
    document.getElementById('selected-table-orders').style.display = 'none';
});
reportsBtn.addEventListener('click', () => openModal(reportsModal));
kitchenBtn.addEventListener('click', () => openModal(kitchenModal));
inventoryBtn.addEventListener('click', () => openModal(inventoryModal));
crmBtn.addEventListener('click', () => openModal(crmModal));
cashOpenBtn.addEventListener('click', () => openModal(cashModal));
if (printerSettingsBtn) {
    printerSettingsBtn.addEventListener('click', () => {
        openModal(printerSettingsModal);
        loadPrinterSettings();
    });
}

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

// Masa sayısı kaydetme butonu - null check ile
if (saveTableCountBtn) {
    saveTableCountBtn.addEventListener('click', async () => {
        if (!tableCountInput) {
            showNotification('Masa sayısı input alanı bulunamadı.', 'error');
            return;
        }
        
        const count = parseInt(tableCountInput.value);
        const websiteUrl = websiteUrlInput?.value.trim() || '';
        
        if (!count || count <= 0 || isNaN(count)) {
            showNotification('Lütfen geçerli bir masa sayısı girin (1 veya daha büyük).', 'error');
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
        
        const originalText = saveTableCountBtn.textContent;
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
                const tableData = docSnap.data();
                if (tableData.number) {
                    existingTableNumbers.add(tableData.number);
                }
            });
            
            // Eksik masaları ekle (batch operation için promise array)
            const addPromises = [];
            for (let i = 1; i <= count; i++) {
                if (!existingTableNumbers.has(i)) {
                    addPromises.push(
                        addDoc(collection(db, 'tables'), {
                            number: i,
                            status: 'Boş',
                            orderId: null,
                            createdAt: Timestamp.now()
                        })
                    );
                }
            }
            
            // Tüm masaları paralel olarak ekle (daha hızlı)
            if (addPromises.length > 0) {
                await Promise.all(addPromises);
            }
            
            // UI güncellemesi
            const tableSettingsDiv = document.getElementById('table-settings');
            if (tableSettingsDiv) {
                tableSettingsDiv.style.display = 'none';
            }
            if (tableGrid) {
                tableGrid.style.display = 'block';
            }
            
            // Masaları yükle
            loadTables();
            
            showNotification(`${count} masa başarıyla oluşturuldu!`, 'success');
        } catch (error) {
            console.error('Masa oluşturma hatası:', error);
            let errorMessage = 'Masalar oluşturulurken bir hata oluştu.';
            
            // Daha açıklayıcı hata mesajları
            if (error.code === 'permission-denied') {
                errorMessage = 'Firebase izin hatası. Lütfen giriş yaptığınızdan emin olun.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Firebase bağlantı hatası. İnternet bağlantınızı kontrol edin.';
            } else if (error.message) {
                errorMessage = `Hata: ${error.message}`;
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            if (saveTableCountBtn) {
                saveTableCountBtn.disabled = false;
                saveTableCountBtn.textContent = originalText || 'Kaydet ve Masaları Yükle';
            }
        }
    });
} else {
    console.warn('saveTableCountBtn element not found in DOM');
}

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

async function showTableDetails(table) {
    if (!table) return;
    
    selectedTableId = table.id;
    const tableRef = doc(db, 'tables', table.id);
    const tableDoc = await getDoc(tableRef);
    
    if (!tableDoc.exists()) {
        showNotification('Masa bulunamadı!', 'error');
        return;
    }
    
    const tableData = { id: tableDoc.id, ...tableDoc.data() };
    
    // Masa detaylarını göster
    tableDetailContent.innerHTML = `
        <h2>Masa #${tableData.number}</h2>
        <div style="display: flex; justify-content: space-between; margin: 15px 0;">
            <div>
                <p><strong>Durum:</strong> <span style="color: ${getTableColor(tableData.status)}">${tableData.status}</span></p>
                <p><strong>Kapasite:</strong> ${tableData.capacity || 4} kişi</p>
                <p><strong>Son Güncelleme:</strong> ${new Date(tableData.updatedAt?.toDate() || new Date()).toLocaleString()}</p>
            </div>
            <div>
                <p><strong>Açılış Saati:</strong> ${tableData.openedAt ? new Date(tableData.openedAt.toDate()).toLocaleTimeString() : 'Bilinmiyor'}</p>
                <p><strong>Müşteri Sayısı:</strong> ${tableData.customerCount || 1} kişi</p>
                <p><strong>Garson:</strong> ${tableData.waiter || 'Atanmadı'}</p>
            </div>
        </div>
        <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
            <p><strong>Notlar:</strong> ${tableData.notes || 'Not bulunmuyor'}</p>
        </div>
        
        <!-- Split Bill Bölümü -->
        <div id="split-bill-section" style="margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
            <h3>📊 Hesap Bölme</h3>
            <div style="margin: 10px 0; display: flex; gap: 10px;">
                <input type="number" id="split-count" min="2" max="10" value="2" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 80px;">
                <button id="split-bill-btn" class="action-button" style="background-color: #3b82f6;">Hesabı Böl</button>
                <button id="reset-split-btn" class="action-button" style="background-color: #ef4444;">Sıfırla</button>
            </div>
            <div id="split-bill-results" style="margin-top: 15px;">
                <!-- Bölünmüş hesaplar buraya eklenecek -->
            </div>
        </div>
    `;
    
    // QR kodu göster
    showTableQRCode(tableData);
    
    // Masa siparişlerini yükle
    loadTableOrders(tableData.number);
    
    // Modal'ı aç
    openModal(tableDetailModal);
    
    // Ödeme yöntemi butonlarına tıklama olayı ekle
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    if (paymentMethodBtns.length > 0) {
        paymentMethodBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
    
    // Ödeme işlemi butonuna tıklama olayı ekle
    const processPaymentBtn = document.getElementById('process-payment');
    if (processPaymentBtn) {
        processPaymentBtn.addEventListener('click', () => {
            processPayment(tableData.number);
        });
    }
    
    // Fiş yazdır butonuna tıklama olayı ekle
    const printReceiptBtn = document.getElementById('print-receipt');
    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            printReceipt(tableData.number);
        });
    }
    
    // Siparişleri yenile butonuna tıklama olayı ekle
    const refreshOrdersBtn = document.getElementById('refresh-orders');
    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', () => {
            loadTableOrders(tableData.number);
        });
    }
    
    // Hesap bölme işlevselliği ekle
    const splitBillBtn = document.getElementById('split-bill-btn');
    const resetSplitBtn = document.getElementById('reset-split-btn');
    const splitCountInput = document.getElementById('split-count');
    const splitResultsDiv = document.getElementById('split-bill-results');
    
    if (splitBillBtn && splitCountInput && splitResultsDiv) {
        splitBillBtn.addEventListener('click', () => {
            const splitCount = parseInt(splitCountInput.value) || 2;
            splitBill(tableData.number, splitCount);
        });
    }
    
    if (resetSplitBtn && splitResultsDiv) {
        resetSplitBtn.addEventListener('click', () => {
            splitResultsDiv.innerHTML = '';
        });
    }
}

// Load table orders function
async function loadTableOrders(tableNumber) {
    const ordersSection = document.getElementById('table-orders-section');
    const ordersList = document.getElementById('table-orders-list');
    const paymentSection = document.getElementById('payment-section');
    
    if (!ordersSection || !ordersList) {
        return;
    }
    
    try {
        // Aktif siparişleri al
        const q = query(
            collection(db, 'orders'),
            where('tableNumber', '==', parseInt(tableNumber)),
            where('status', 'in', ['pending', 'preparing', 'ready', 'completed'])
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            if (ordersSection) ordersSection.style.display = 'none';
            if (paymentSection) paymentSection.style.display = 'none';
            return;
        }
        
        if (ordersSection) ordersSection.style.display = 'block';
        if (paymentSection) paymentSection.style.display = 'block';
        
        let totalAmount = 0;
        let ordersHtml = '';
        
        // Her sipariş için
        querySnapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            const orderTime = order.createdAt?.toDate() || new Date();
            let orderTotal = 0;
            
            // Sipariş öğelerini oluştur
            if (order.items && Array.isArray(order.items)) {
                let itemsHtml = order.items.map(item => {
                    const itemQuantity = item.quantity || 1;
                    const itemPrice = item.price || 0;
                    const itemTotal = itemPrice * itemQuantity;
                    orderTotal += itemTotal;
                    return `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                            <span>${itemQuantity}x ${item.name || 'Ürün'}</span>
                            <span>${itemTotal.toFixed(2)} ₺</span>
                        </div>
                    `;
                }).join('');
                
                totalAmount += orderTotal;
                
                // Sipariş durumu için stil
                const statusStyles = {
                    'pending': { bg: '#fef3c7', text: 'Bekliyor' },
                    'preparing': { bg: '#dbeafe', text: 'Hazırlanıyor' },
                    'ready': { bg: '#dcfce7', text: 'Hazır' },
                    'completed': { bg: '#e5e7eb', text: 'Tamamlandı' }
                };
                
                const status = statusStyles[order.status] || { bg: '#f3f4f6', text: order.status || 'Bilinmiyor' };
                
                // Sipariş kartını oluştur
                ordersHtml += `
                    <div style="margin-bottom: 15px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <div style="background: ${status.bg}; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>Sipariş #${order.orderNumber || doc.id.substring(0, 6)}</strong>
                                <div style="font-size: 0.85em; color: #4b5563;">
                                    ${orderTime.toLocaleString('tr-TR')}
                                </div>
                            </div>
                            <div style="display: flex; gap: 5px; align-items: center;">
                                <button onclick="printOrderReceipt('${doc.id}')" style="background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 3px 8px; font-size: 0.8em; cursor: pointer;">
                                    🖨️ Fiş
                                </button>
                                <span style="background: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">
                                    ${status.text}
                                </span>
                            </div>
                        </div>
                        <div style="padding: 10px 15px;">
                            ${itemsHtml}
                            <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd; font-weight: bold;">
                                <span>Toplam:</span>
                                <span>${orderTotal.toFixed(2)} ₺</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        // Sipariş listesini güncelle
        if (ordersList) {
            ordersList.innerHTML = ordersHtml || '<p>Henüz sipariş bulunmamaktadır.</p>';
        }
        
    } catch (error) {
        console.error('Siparişler yüklenirken hata oluştu:', error);
        showNotification('Siparişler yüklenirken bir hata oluştu!', 'error');
        if (ordersList) {
            ordersList.innerHTML = '<p style="color: red;">Siparişler yüklenirken bir hata oluştu.</p>';
        }
    }
}

// Hesap bölme fonksiyonu
async function splitBill(tableNumber, splitCount) {
    if (!tableNumber || splitCount < 2) {
        showNotification('Geçersiz bölme sayısı!', 'error');
        return;
    }

    const splitResultsDiv = document.getElementById('split-bill-results');
    if (!splitResultsDiv) return;

    try {
        // Masa siparişlerini al
        const q = query(
            collection(db, 'orders'),
            where('tableNumber', '==', parseInt(tableNumber)),
            where('status', 'in', ['pending', 'preparing', 'ready'])
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            splitResultsDiv.innerHTML = '<p style="color: #666; text-align: center;">Bu masada aktif sipariş bulunmamaktadır.</p>';
            return;
        }
        
        let totalAmount = 0;
        let orderItems = [];
        
        // Tüm sipariş öğelerini topla
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            order.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                totalAmount += itemTotal;
                orderItems.push({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: itemTotal
                });
            });
        });
        
        if (totalAmount <= 0) {
            splitResultsDiv.innerHTML = '<p style="color: #666; text-align: center;">Bu masada ödenecek tutar bulunmamaktadır.</p>';
            return;
        }
        
        // Bölünmüş tutarları hesapla
        const splitAmount = totalAmount / splitCount;
        const roundedSplitAmount = Math.ceil(splitAmount * 100) / 100; // Yuvarlama yapıyoruz
        
        // Son tutarı düzelt (toplamın doğru çıkması için)
        const lastAmount = totalAmount - (roundedSplitAmount * (splitCount - 1));
        
        // Sonuçları oluştur
        let resultsHtml = `
            <div style="margin-bottom: 15px; padding: 10px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>Toplam Tutar:</strong>
                    <strong>${totalAmount.toFixed(2)} ₺</strong>
                </div>
                <div style="display: flex; justify-content: space-between; color: #15803d; margin-bottom: 5px;">
                    <span>${splitCount} Kişiye Bölünmüş Tutar:</span>
                    <span>${roundedSplitAmount.toFixed(2)} ₺</span>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 10px 0; color: #4b5563;">Bölünmüş Ödemeler:</h4>
        `;
        
        // Her bölünmüş ödemeyi göster
        for (let i = 0; i < splitCount; i++) {
            const isLast = i === splitCount - 1;
            const amount = isLast ? lastAmount : roundedSplitAmount;
            
            resultsHtml += `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span>${i + 1}. Kişi:</span>
                    <div>
                        <span style="font-weight: bold; color: #1e40af;">${amount.toFixed(2)} ₺</span>
                        <button class="process-split-payment" data-amount="${amount.toFixed(2)}" style="margin-left: 10px; padding: 3px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Öde
                        </button>
                    </div>
                </div>
            `;
        }
        
        resultsHtml += `</div>`;
        
        // Sipariş özeti
        resultsHtml += `
            <div style="margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                <h4 style="margin: 10px 0; color: #4b5563;">Sipariş Özeti:</h4>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc;">
                    ${orderItems.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>${item.total.toFixed(2)} ₺</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        splitResultsDiv.innerHTML = resultsHtml;
        
        // Ödeme butonlarına tıklama olayı ekle
        document.querySelectorAll('.process-split-payment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.target.getAttribute('data-amount');
                if (confirm(`${amount} ₺ tutarındaki ödemeyi işlemek istediğinize emin misiniz?`)) {
                    processSplitPayment(tableNumber, parseFloat(amount));
                }
            });
        });
        
    } catch (error) {
        console.error('Hesap bölme hatası:', error);
        splitResultsDiv.innerHTML = '<p style="color: #dc2626; text-align: center;">Hesap bölünürken bir hata oluştu. Lütfen tekrar deneyin.</p>';
    }
}

// Bölünmüş ödeme işlemi
async function processSplitPayment(tableNumber, amount) {
    try {
        // Ödeme işlemi başarılı olduğunda bildirim göster
        showNotification(`${amount.toFixed(2)} ₺ tutarındaki ödeme başarıyla alındı.`, 'success');
        
        // İsterseniz burada ödeme işlemi için gerekli kodu ekleyebilirsiniz
        // Örneğin:
        // await addDoc(collection(db, 'payments'), {
        //     tableNumber: tableNumber,
        //     amount: amount,
        //     paymentMethod: 'nakit', // veya seçilen ödeme yöntemi
        //     timestamp: new Date(),
        //     status: 'completed'
        // });
        
    } catch (error) {
        console.error('Ödeme işlemi hatası:', error);
        showNotification('Ödeme işlenirken bir hata oluştu!', 'error');
    }
}

// QR Kod Gösterme Fonksiyonu
function showTableQRCode(table) {
    if (!table) return;
    
    const baseUrl = getBaseUrl();
    const tableUrl = `${baseUrl}/index.html?table=${table.number}`;
    
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
        
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        
        // Print receipt for the new order
        if (typeof printReceipt === 'function') {
            printReceipt({
                orderNumber: docRef.id,
                tableNumber: orderData.tableNumber || 'Yok',
                waiter: orderData.waiter || 'Yok',
                items: orderData.items.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                status: orderData.status,
                createdAt: new Date()
            });
        }
        
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
let selectedOrderForPayment = null;

// Load unpaid orders for payment modal
async function loadUnpaidOrders() {
    const unpaidOrdersList = document.getElementById('unpaid-orders-list');
    if (!unpaidOrdersList) {
        console.error('unpaid-orders-list element not found');
        return;
    }
    
    try {
        // Clear the list and show loading state
        unpaidOrdersList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Yükleniyor...</p>';
        
        // Query for unpaid orders
        const q = query(
            collection(db, 'orders'), 
            where('paid', '==', false),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const unpaidOrders = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            unpaidOrders.push({ 
                id: doc.id, 
                ...data,
                // Ensure we have all required fields with defaults
                total: data.total || 0,
                items: data.items || [],
                createdAt: data.createdAt || new Date()
            });
        });
        
        if (unpaidOrders.length === 0) {
            unpaidOrdersList.innerHTML = `
                <div style="text-align: center; padding: 30px 0; color: #666;">
                    <p>Bekleyen ödeme bulunmamaktadır.</p>
                </div>
            `;
            return;
        }
        
        unpaidOrdersList.innerHTML = '';
        
        unpaidOrders.forEach(order => {
            const orderElement = createElement('div', {
                className: 'order-item',
                style: 'background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'
            });
            
            const orderHeader = createElement('div', {
                style: 'display: flex; justify-content: space-between; margin-bottom: 10px;'
            });
            
            orderHeader.innerHTML = `
                <div>
                    <strong>Sipariş #${order.id.substring(0, 8)}</strong>
                    <div style="color: #666; font-size: 0.9em;">${order.tableNumber ? 'Masa ' + order.tableNumber : 'Paket Sipariş'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; color: #e53e3e;">${order.total?.toFixed(2) || '0.00'} TL</div>
                    <div style="font-size: 0.8em; color: #666;">${new Date(order.createdAt?.toDate()).toLocaleString()}</div>
                </div>
            `;
            
            const orderItems = createElement('div', {
                style: 'margin: 10px 0; padding: 10px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;'
            });
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const itemElement = createElement('div', {
                        style: 'display: flex; justify-content: space-between; margin: 5px 0;'
                    });
                    itemElement.innerHTML = `
                        <span>${item.quantity}x ${item.name}</span>
                        <span>${(item.price * item.quantity).toFixed(2)} TL</span>
                    `;
                    orderItems.appendChild(itemElement);
                });
            }
            
            const orderActions = createElement('div', {
                style: 'display: flex; gap: 10px; margin-top: 15px;'
            });
            
            const payFullBtn = createElement('button', {
                textContent: 'Öde',
                className: 'payment-action-btn',
                style: 'flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;'
            });
            
            const splitBtn = createElement('button', {
                textContent: 'Böl',
                className: 'payment-action-btn',
                style: 'flex: 1; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;'
            });
            
            payFullBtn.onclick = () => selectOrderForPayment(order.id, order.total, false);
            splitBtn.onclick = () => selectOrderForPayment(order.id, order.total, true);
            
            orderActions.appendChild(payFullBtn);
            orderActions.appendChild(splitBtn);
            
            orderElement.appendChild(orderHeader);
            orderElement.appendChild(orderItems);
            orderElement.appendChild(orderActions);
            
            unpaidOrdersList.appendChild(orderElement);
        });
    } catch (error) {
        console.error('Ödemeler yüklenirken hata oluştu:', error);
        showNotification('Ödemeler yüklenirken bir hata oluştu', 'error');
        unpaidOrdersList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e53e3e;">
                <p>Ödemeler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
            </div>
        `;
    }
}

// Select order for payment
function selectOrderForPayment(orderId, amount, isSplit) {
    selectedOrderForPayment = orderId;
    const paymentFormContainer = document.getElementById('payment-form-container');
    const selectedOrderInfo = document.getElementById('selected-order-info');
    
    if (!paymentFormContainer || !selectedOrderInfo) return;
    
    selectedOrderInfo.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>Sipariş ID:</strong> ${orderId.substring(0, 8)}
        </div>
        <div style="margin-bottom: 10px;">
            <strong>Toplam Tutar:</strong> ${amount.toFixed(2)} TL
        </div>
        ${isSplit ? '<div style="color: #3b82f6; font-weight: 500;">Bölünen Ödeme</div>' : ''}
    `;
    
    // Set total amount due
    const totalAmountDue = document.getElementById('total-amount-due');
    if (totalAmountDue) {
        totalAmountDue.textContent = `${amount.toFixed(2)} ₺`;
    }
    
    // Reset cash received and change
    const cashReceived = document.getElementById('cash-received');
    if (cashReceived) {
        cashReceived.value = '';
        cashReceived.oninput = () => calculateChange(amount);
    }
    
    const changeDueSection = document.getElementById('change-due-section');
    if (changeDueSection) {
        changeDueSection.style.display = 'none';
    }
    
    const changeDueAmount = document.getElementById('change-due-amount');
    if (changeDueAmount) {
        changeDueAmount.textContent = '0.00 ₺';
    }
    
    // Reset payment method to cash
    const paymentMethodNakit = document.querySelector('input[name="payment-method"][value="nakit"]');
    if (paymentMethodNakit) {
        paymentMethodNakit.checked = true;
        updatePaymentMethodUI('nakit');
    }
    
    // Setup payment method change listener
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.onchange = (e) => {
            updatePaymentMethodUI(e.target.value);
            if (e.target.value === 'nakit') {
                calculateChange(amount);
            }
        };
    });
    
    const splitSection = document.getElementById('split-payment-section');
    if (isSplit && splitSection) {
        splitSection.style.display = 'block';
        const splitCountInput = document.getElementById('split-count');
        if (splitCountInput) splitCountInput.value = 2;
        calculateSplit(amount, 2);
    } else if (splitSection) {
        splitSection.style.display = 'none';
    }
    
    // Hide transaction complete button initially
    const transactionCompleteBtn = document.getElementById('transaction-complete');
    if (transactionCompleteBtn) {
        transactionCompleteBtn.style.display = 'none';
    }
    
    paymentFormContainer.style.display = 'block';
    
    // Hide other sections
    const unpaidOrdersList = document.getElementById('unpaid-orders-list');
    if (unpaidOrdersList) unpaidOrdersList.style.display = 'none';
    
    const selectedTableOrders = document.getElementById('selected-table-orders');
    if (selectedTableOrders) selectedTableOrders.style.display = 'none';
    
    const tablesList = document.getElementById('payment-tables-list');
    if (tablesList) tablesList.style.display = 'none';
    
    // Scroll to payment form
    paymentFormContainer.scrollIntoView({ behavior: 'smooth' });
}

// Calculate change due
function calculateChange(totalAmount) {
    const cashReceived = document.getElementById('cash-received');
    const changeDueSection = document.getElementById('change-due-section');
    const changeDueAmount = document.getElementById('change-due-amount');
    const transactionCompleteBtn = document.getElementById('transaction-complete');
    
    if (!cashReceived || !changeDueSection || !changeDueAmount) return;
    
    const cashReceivedValue = parseFloat(cashReceived.value) || 0;
    const change = cashReceivedValue - totalAmount;
    
    if (cashReceivedValue > 0 && cashReceivedValue >= totalAmount) {
        changeDueAmount.textContent = `${change.toFixed(2)} ₺`;
        changeDueSection.style.display = 'block';
        
        // Show transaction complete button when change is calculated
        if (transactionCompleteBtn) {
            transactionCompleteBtn.style.display = 'block';
        }
    } else if (cashReceivedValue > 0 && cashReceivedValue < totalAmount) {
        changeDueAmount.textContent = `Eksik: ${Math.abs(change).toFixed(2)} ₺`;
        changeDueAmount.style.color = '#e53e3e';
        changeDueSection.style.display = 'block';
        changeDueSection.style.background = '#fee2e2';
        changeDueSection.style.borderColor = '#e53e3e';
        
        if (transactionCompleteBtn) {
            transactionCompleteBtn.style.display = 'none';
        }
    } else {
        changeDueSection.style.display = 'none';
        if (transactionCompleteBtn) {
            transactionCompleteBtn.style.display = 'none';
        }
    }
}

// Update payment method UI
function updatePaymentMethodUI(method) {
    const cashReceivedSection = document.getElementById('cash-received-section');
    const cardPaymentInfo = document.getElementById('card-payment-info');
    const changeDueSection = document.getElementById('change-due-section');
    
    if (method === 'nakit') {
        if (cashReceivedSection) cashReceivedSection.style.display = 'block';
        if (cardPaymentInfo) cardPaymentInfo.style.display = 'none';
    } else {
        if (cashReceivedSection) cashReceivedSection.style.display = 'none';
        if (cardPaymentInfo) cardPaymentInfo.style.display = 'block';
        if (changeDueSection) changeDueSection.style.display = 'none';
        
        // Show transaction complete button for card payments
        const transactionCompleteBtn = document.getElementById('transaction-complete');
        if (transactionCompleteBtn) {
            transactionCompleteBtn.style.display = 'block';
        }
    }
}

// Calculate split payment
function calculateSplit(total, count) {
    const amountPerPerson = total / count;
    const resultsDiv = document.getElementById('split-results');
    resultsDiv.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
        const personDiv = createElement('div', {
            style: 'display: flex; justify-content: space-between; padding: 8px; background: ' + 
                  (i % 2 === 0 ? '#f8fafc' : 'white') + '; border-radius: 4px; margin-bottom: 4px;'
        });
        personDiv.innerHTML = `
            <span>${i}. Kişi:</span>
            <span><strong>${amountPerPerson.toFixed(2)} TL</strong></span>
        `;
        resultsDiv.appendChild(personDiv);
    }
}

// Process payment
async function processPayment(paymentMethod, amount, orderId, isSplit) {
    if (!orderId) {
        showNotification('Geçersiz sipariş!', 'error');
        return false;
    }
    
    // Get cash received and change for cash payments
    let cashReceived = null;
    let changeDue = null;
    
    if (paymentMethod === 'nakit') {
        const cashReceivedInput = document.getElementById('cash-received');
        const changeDueElement = document.getElementById('change-due-amount');
        
        if (cashReceivedInput) {
            cashReceived = parseFloat(cashReceivedInput.value) || 0;
        }
        
        if (changeDueElement && cashReceived >= amount) {
            const changeText = changeDueElement.textContent.replace(' ₺', '').replace(',', '.');
            changeDue = parseFloat(changeText) || 0;
        }
    }
    
    const paymentRef = doc(db, 'orders', orderId);
    const paymentData = {
        paid: true,
        paymentMethod: paymentMethod,
        paymentAmount: parseFloat(amount),
        paymentDate: Timestamp.now(),
        status: 'completed',
        updatedAt: Timestamp.now()
    };
    
    // Add cash payment details
    if (paymentMethod === 'nakit' && cashReceived !== null) {
        paymentData.cashReceived = cashReceived;
        if (changeDue !== null && changeDue >= 0) {
            paymentData.changeDue = changeDue;
        }
    }
    
    if (isSplit) {
        paymentData.splitPayment = true;
        const splitCountInput = document.getElementById('split-count');
        paymentData.splitCount = splitCountInput ? parseInt(splitCountInput.value) || 2 : 2;
    }
    
    try {
        await updateDoc(paymentRef, paymentData);
        showNotification('Ödeme başarıyla tamamlandı!', 'success');
        
        // Reset form
        const paymentForm = document.getElementById('process-payment-form');
        if (paymentForm) paymentForm.reset();
        
        const splitSection = document.getElementById('split-payment-section');
        if (splitSection) splitSection.style.display = 'none';
        
        const paymentFormContainer = document.getElementById('payment-form-container');
        if (paymentFormContainer) paymentFormContainer.style.display = 'none';
        
        // Hide selected table orders if visible
        const selectedTableOrders = document.getElementById('selected-table-orders');
        if (selectedTableOrders) selectedTableOrders.style.display = 'none';
        
        // Reload data based on active tab
        const paymentTabTables = document.getElementById('payment-tab-tables');
        const isTablesTabActive = paymentTabTables && paymentTabTables.classList.contains('active');
        
        if (isTablesTabActive) {
            // Reload tables
            await loadPaymentTables();
            const tablesList = document.getElementById('payment-tables-list');
            if (tablesList) tablesList.style.display = 'grid';
        } else {
            // Reload unpaid orders
            const unpaidOrdersList = document.getElementById('unpaid-orders-list');
            if (unpaidOrdersList) {
                unpaidOrdersList.style.display = 'block';
                await loadUnpaidOrders();
            }
        }
        
        return true;
    } catch (error) {
        console.error('Ödeme işlemi sırasında hata oluştu:', error);
        showNotification('Ödeme işlemi sırasında bir hata oluştu', 'error');
        return false;
    }
}

// Event listener for payment form submission
document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('process-payment-form');
    const cancelPaymentBtn = document.getElementById('cancel-payment');
    const calculateSplitBtn = document.getElementById('calculate-split');
    
    // Tab switching
    const paymentTabTables = document.getElementById('payment-tab-tables');
    const paymentTabOrders = document.getElementById('payment-tab-orders');
    const paymentTablesSection = document.getElementById('payment-tables-section');
    const paymentOrdersSection = document.getElementById('payment-orders-section');
    
    if (paymentTabTables && paymentTabOrders) {
        paymentTabTables.addEventListener('click', () => {
            paymentTabTables.classList.add('active');
            paymentTabOrders.classList.remove('active');
            if (paymentTablesSection) paymentTablesSection.style.display = 'block';
            if (paymentOrdersSection) paymentOrdersSection.style.display = 'none';
            document.getElementById('payment-form-container').style.display = 'none';
            document.getElementById('selected-table-orders').style.display = 'none';
            const tablesList = document.getElementById('payment-tables-list');
            if (tablesList) tablesList.style.display = 'grid';
            loadPaymentTables();
        });
        
        paymentTabOrders.addEventListener('click', () => {
            paymentTabOrders.classList.add('active');
            paymentTabTables.classList.remove('active');
            if (paymentOrdersSection) paymentOrdersSection.style.display = 'block';
            if (paymentTablesSection) paymentTablesSection.style.display = 'none';
            document.getElementById('payment-form-container').style.display = 'none';
            document.getElementById('selected-table-orders').style.display = 'none';
            loadUnpaidOrders();
        });
    }
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const isSplit = document.getElementById('split-payment-section').style.display !== 'none';
            
            if (isNaN(amount) || amount <= 0) {
                showNotification('Lütfen geçerli bir tutar giriniz', 'error');
                return;
            }
            
            const submitBtn = document.getElementById('complete-payment');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'İşleniyor...';
            
            await processPayment(paymentMethod, amount, selectedOrderForPayment, isSplit);
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
    
    // Transaction Complete button
    const transactionCompleteBtn = document.getElementById('transaction-complete');
    if (transactionCompleteBtn) {
        transactionCompleteBtn.addEventListener('click', async () => {
            if (!selectedOrderForPayment) {
                showNotification('Lütfen önce bir sipariş seçin!', 'error');
                return;
            }
            
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
            const totalAmountDue = document.getElementById('total-amount-due');
            const totalAmount = parseFloat(totalAmountDue?.textContent.replace(' ₺', '').replace('.', '').replace(',', '.')) || 0;
            
            // Validate cash payment
            if (paymentMethod === 'nakit') {
                const cashReceived = document.getElementById('cash-received');
                const cashReceivedValue = parseFloat(cashReceived?.value) || 0;
                
                if (cashReceivedValue < totalAmount) {
                    showNotification('Alınan tutar toplam tutardan az olamaz!', 'error');
                    return;
                }
            }
            
            // Process payment first
            const success = await processPayment(paymentMethod, totalAmount, selectedOrderForPayment, false);
            
            if (success) {
                // Get order details for receipt
                try {
                    const orderDoc = await getDoc(doc(db, 'orders', selectedOrderForPayment));
                    if (orderDoc.exists()) {
                        const orderData = orderDoc.data();
                        
                        // Print receipt
                        if (typeof printReceipt === 'function') {
                            const cashReceived = document.getElementById('cash-received');
                            const changeDue = document.getElementById('change-due-amount');
                            
                            printReceipt({
                                orderNumber: selectedOrderForPayment.substring(0, 8),
                                tableNumber: orderData.tableNumber || 'Yok',
                                waiter: orderData.waiter || 'Yok',
                                items: (orderData.items || []).map(item => ({
                                    name: item.name || 'Ürün',
                                    price: item.price || 0,
                                    quantity: item.quantity || 1
                                })),
                                total: totalAmount,
                                cashReceived: paymentMethod === 'nakit' ? parseFloat(cashReceived?.value || 0) : null,
                                changeDue: paymentMethod === 'nakit' && changeDue ? parseFloat(changeDue.textContent.replace(' ₺', '').replace('.', '').replace(',', '.')) : null,
                                paymentMethod: paymentMethod,
                                status: 'completed',
                                createdAt: orderData.createdAt?.toDate() || new Date()
                            });
                        }
                        
                        // Update table status if table number exists
                        if (orderData.tableNumber) {
                            await updateTableStatusAfterPayment(orderData.tableNumber);
                        }
                    }
                } catch (error) {
                    console.error('Fiş yazdırma hatası:', error);
                    showNotification('Ödeme tamamlandı ancak fiş yazdırılırken bir hata oluştu.', 'error');
                }
            }
        });
    }
    
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', () => {
            document.getElementById('payment-form-container').style.display = 'none';
            const unpaidOrdersList = document.getElementById('unpaid-orders-list');
            if (unpaidOrdersList) unpaidOrdersList.style.display = 'block';
            const selectedTableOrders = document.getElementById('selected-table-orders');
            if (selectedTableOrders) selectedTableOrders.style.display = 'none';
            const tablesList = document.getElementById('payment-tables-list');
            if (tablesList) tablesList.style.display = 'grid';
            document.getElementById('process-payment-form').reset();
            selectedOrderForPayment = null;
        });
    }
    
    if (calculateSplitBtn) {
        calculateSplitBtn.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const splitCount = parseInt(document.getElementById('split-count').value) || 2;
            
            if (isNaN(amount) || amount <= 0) {
                showNotification('Lütfen geçerli bir tutar giriniz', 'error');
                return;
            }
            
            if (splitCount < 2) {
                showNotification('Bölünecek kişi sayısı en az 2 olmalıdır', 'error');
                return;
            }

            calculateSplit(amount, splitCount);
        });
    }
});

// Kategoriye göre KDV oranı belirleme (Türkiye standartlarına göre örnek)
const getVatRate = (category) => {
    // Kategori isimlerini küçük harfe çevirip kontrol ediyoruz
    const cat = category ? category.toLowerCase() : '';
    if (cat.includes('icecek') || cat.includes('içecek') || cat.includes('alkol')) {
        return 20; // İçecekler %20 (Örnek)
    }
    return 10; // Yiyecekler %10 (Örnek)
};

// İçinden vergi ayıklama formülü: Tutar / (1 + (VergiOranı/100))
const calculateTaxBase = (total, rate) => {
    return total / (1 + (rate / 100));
};

// --- GELİŞMİŞ Z RAPORU OLUŞTURMA ---

generateReport.addEventListener('click', async () => {
    // 1. Tarih Seçimi
    const selectedDateStr = reportDate.value || new Date().toISOString().split('T')[0];
    const startDate = new Date(selectedDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDateStr);
    endDate.setHours(23, 59, 59, 999);

    const btnOriginalText = generateReport.textContent;
    generateReport.disabled = true;
    generateReport.textContent = 'Mali Hafıza Sorgulanıyor...';

    try {
        // 2. Önceki Z Raporu Verilerini Çek (Kümülatif Toplam ve Z No için)
        // 'z_reports' koleksiyonundan en son eklenen raporu çekiyoruz.
        const lastZQuery = query(collection(db, 'z_reports'), orderBy('zNo', 'desc'), limit(1)); // limit import edilmeli
        // NOT: Script'in en üstündeki import kısmına 'limit' eklemeyi unutmayın!
        // import { ..., limit } from "..."
        
        const lastZSnapshot = await getDocs(lastZQuery);
        let previousCumulative = 0;
        let newZNo = 1;

        if (!lastZSnapshot.empty) {
            const lastZData = lastZSnapshot.docs[0].data();
            previousCumulative = lastZData.cumulativeTotal || 0;
            newZNo = (lastZData.zNo || 0) + 1;
        }

        // 3. Seçilen Günün Siparişlerini Çek
        const ordersSnapshot = await getDocs(
            query(
                collection(db, 'orders'),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('createdAt', '<=', Timestamp.fromDate(endDate)),
                where('paid', '==', true) // Sadece ödenmiş siparişler
            )
        );

        // 4. Hesaplamaları Yap
        let dailyTotal = 0;
        let cashTotal = 0;
        let creditTotal = 0;
        let orderCount = 0;
        
        // KDV Matrahları (Base) ve KDV Tutarları (Amount) için nesne
        // Örn: { "10": { base: 100, tax: 10 }, "20": { base: 200, tax: 40 } }
        let vatBreakdown = {};

        ordersSnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderTotal = parseFloat(order.total) || 0;
            
            // Genel Toplamlar
            dailyTotal += orderTotal;
            orderCount++;

            // Ödeme Tipi Ayrımı
            if (order.paymentMethod === 'kredi-karti') {
                creditTotal += orderTotal;
            } else {
                cashTotal += orderTotal; // Varsayılan Nakit
            }

            // KDV Hesaplama (Ürün bazlı)
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                    // Ürünün kategorisini bulmamız lazım, siparişte yoksa varsayılan 10 alalım
                    // Not: Gerçek sistemde ürün kategorisi sipariş satırına (order items) kaydedilmelidir.
                    // Şimdilik ürün isminden veya menüden çekmek yerine basitleştirilmiş mantık kullanıyoruz.
                    // Eğer order.items içinde kategori yoksa varsayılan yiyecek kabul ediyoruz.
                    const taxRate = getVatRate(item.category || 'yiyecek'); 
                    
                    const taxBase = calculateTaxBase(itemTotal, taxRate);
                    const taxAmount = itemTotal - taxBase;

                    if (!vatBreakdown[taxRate]) {
                        vatBreakdown[taxRate] = { base: 0, tax: 0 };
                    }
                    vatBreakdown[taxRate].base += taxBase;
                    vatBreakdown[taxRate].tax += taxAmount;
                });
            } else {
                // Eğer detay yoksa tüm siparişi %10 varsayalım
                const taxRate = 10;
                const taxBase = calculateTaxBase(orderTotal, taxRate);
                const taxAmount = orderTotal - taxBase;
                if (!vatBreakdown[taxRate]) vatBreakdown[taxRate] = { base: 0, tax: 0 };
                vatBreakdown[taxRate].base += taxBase;
                vatBreakdown[taxRate].tax += taxAmount;
            }
        });

        const currentCumulative = previousCumulative + dailyTotal;

        // 5. Rapor HTML'ini Oluştur (Termal Fiş Formatı)
        let kdvRowsHtml = '';
        Object.keys(vatBreakdown).sort((a,b) => a-b).forEach(rate => {
            kdvRowsHtml += `
                <tr>
                    <td>%${rate}</td>
                    <td>${vatBreakdown[rate].base.toFixed(2)}</td>
                    <td>${vatBreakdown[rate].tax.toFixed(2)}</td>
                </tr>
            `;
        });

        const reportHtml = `
            <div id="z-report-print-area">
                <div class="receipt-header">
                    <span class="receipt-title">LEZZET BAHÇESİ</span>
                    <div class="receipt-info">Örnek Mah. Lezzet Sok. No:1</div>
                    <div class="receipt-info">Vergi Dairesi: İstanbul / VKN: 1234567890</div>
                    <div class="receipt-info">Tarih: ${new Date().toLocaleString('tr-TR')}</div>
                    <br>
                    <span class="receipt-title">MALİ GÜN SONU RAPORU (Z)</span>
                </div>

                <div class="receipt-body">
                    <div class="receipt-row">
                        <span>Z NO:</span>
                        <span>${String(newZNo).padStart(4, '0')}</span>
                    </div>
                     <div class="receipt-row">
                        <span>Rapor Tarihi:</span>
                        <span>${selectedDateStr}</span>
                    </div>
                    
                    <div class="receipt-divider"></div>

                    <div class="receipt-row">
                        <span>GÜNLÜK TOPLAM SATIŞ:</span>
                        <span style="font-size: 1.1em; font-weight: bold;">*${dailyTotal.toFixed(2)} TL</span>
                    </div>

                    <div class="receipt-divider"></div>
                    <div style="text-align:center; font-weight:bold; margin-bottom:5px;">ÖDEME DETAYLARI</div>
                    
                    <div class="receipt-row">
                        <span>NAKİT:</span>
                        <span>${cashTotal.toFixed(2)} TL</span>
                    </div>
                    <div class="receipt-row">
                        <span>KREDİ KARTI:</span>
                        <span>${creditTotal.toFixed(2)} TL</span>
                    </div>

                    <div class="receipt-divider"></div>
                    <div style="text-align:center; font-weight:bold; margin-bottom:5px;">KDV DÖKÜMÜ</div>
                    
                    <table class="kdv-table">
                        <thead>
                            <tr>
                                <th>Oran</th>
                                <th>Matrah</th>
                                <th>KDV Tutarı</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${kdvRowsHtml}
                        </tbody>
                    </table>

                    <div class="receipt-divider"></div>

                    <div class="receipt-row bold">
                        <span>Z KÜMÜLATİF TOPLAM:</span>
                        <span>${currentCumulative.toFixed(2)} TL</span>
                    </div>
                    
                    <div class="receipt-row">
                        <span>EKÜ NO:</span>
                        <span>1234-5678</span>
                    </div>
                </div>

                <div class="receipt-footer">
                    <div class="receipt-info">BU BELGE Z RAPORU NİTELİĞİNDEDİR</div>
                    <div class="receipt-info">MALİ HAFIZA KAYDI YAPILMIŞTIR</div>
                    <div style="margin-top:10px; font-weight:bold;">*** MALİYE ONAYLI ***</div>
                </div>
            </div>
            
            <div style="margin-top:20px; text-align:center;">
                <button id="save-z-report-btn" class="action-button" style="background:#e53e3e;"> Günü Kapat ve Kaydet</button>
            </div>
        `;

        reportContent.innerHTML = reportHtml;

        // 6. "Günü Kapat ve Kaydet" Butonu Mantığı
        // Raporu sadece görüntülüyoruz, kullanıcı "Kaydet" derse veritabanına işliyoruz.
        const saveBtn = document.getElementById('save-z-report-btn');
        saveBtn.addEventListener('click', async () => {
            if(!confirm('DİKKAT! Gün sonu işlemi yapılacak ve Z Raporu kaydedilecek. Bu işlem geri alınamaz. Onaylıyor musunuz?')) return;
            
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Kaydediliyor...';

                // Veritabanına Z Raporunu Kaydet
                await addDoc(collection(db, 'z_reports'), {
                    zNo: newZNo,
                    date: selectedDateStr, // Raporun ait olduğu gün
                    generatedAt: Timestamp.now(), // Raporun oluşturulduğu an
                    dailyTotal: dailyTotal,
                    cumulativeTotal: currentCumulative,
                    cashTotal: cashTotal,
                    creditTotal: creditTotal,
                    vatBreakdown: vatBreakdown,
                    orderCount: orderCount
                });

                showNotification(`Z Raporu No: ${newZNo} başarıyla kaydedildi ve gün kapatıldı.`, 'success');
                saveBtn.style.display = 'none'; // Çift kaydı önlemek için butonu gizle
                
                // İsterseniz burada otomatik PDF indirmeyi tetikleyebilirsiniz
                document.getElementById('download-pdf').click();

            } catch (error) {
                console.error('Z Raporu kayıt hatası:', error);
                showNotification('Z Raporu kaydedilirken hata oluştu!', 'error');
                saveBtn.disabled = false;
            }
        });

        showNotification('Z Raporu önizlemesi oluşturuldu.', 'success');

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        showNotification('Rapor oluşturulurken bir hata oluştu: ' + error.message, 'error');
    } finally {
        generateReport.disabled = false;
        generateReport.textContent = btnOriginalText;
    }
});

generateSalesReport.addEventListener('click', async () => {
    generateSalesReport.disabled = true;
    generateSalesReport.textContent = 'Hazırlanıyor...';
    
    // ... (rest of the code remains the same)
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

function loadKitchenOrders() {
    if (!kitchenOrdersList) return;
    
    // Clear existing content
    kitchenOrdersList.innerHTML = '';
    
    // Get orders from Firestore
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', 'in', ['preparing', 'pending']));
    
    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
            const activeOrders = [];
            
            querySnapshot.forEach((doc) => {
                activeOrders.push({ id: doc.id, ...doc.data() });
            });
            
            // Clear previous content
            kitchenOrdersList.innerHTML = '';
            
            if (activeOrders.length === 0) {
                const emptyMsg = createElement('p', {
                    textContent: 'Bekleyen sipariş yok.',
                    style: 'text-align: center; color: #999; padding: 20px;'
                });
                kitchenOrdersList.appendChild(emptyMsg);
                return;
            }
            
            // Process each order
            activeOrders.forEach(order => {
                const orderDiv = createElement('div', {
                    className: 'order-card',
                    style: 'background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: flex-start;'
                });
                
                const orderInfo = createElement('div', { style: 'flex: 1;' });
                orderInfo.appendChild(createElement('strong', {
                    textContent: `Sipariş #${order.id.substring(0, 8)}`,
                    style: 'font-size: 1.1em; display: block; margin-bottom: 5px;'
                }));
                
                orderInfo.appendChild(createElement('p', {
                    textContent: `Masa: ${order.tableNumber || 'Bilinmiyor'}`,
                    style: 'margin: 5px 0; color: #4b5563;'
                }));
                
                if (order.items && order.items.length > 0) {
                    const itemsList = createElement('ul', { 
                        style: 'margin: 10px 0; padding-left: 20px; list-style-type: none;'
                    });
                    
                    order.items.forEach(item => {
                        const li = createElement('li', { 
                            textContent: `• ${item.quantity}x ${item.name || item}`,
                            style: 'margin: 5px 0; padding: 3px 0;'
                        });
                        itemsList.appendChild(li);
                    });
                    orderInfo.appendChild(itemsList);
                }
                
                const readyBtn = createElement('button', {
                    className: 'action-button',
                    style: 'background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;',
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
    
    // Return unsubscribe function in case you want to stop listening later
    return unsubscribe;
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

// Müşteri Yönetimi
async function loadCustomers() {
    try {
        const customersList = document.getElementById('customers-list');
        if (!customersList) return;
        
        const querySnapshot = await getDocs(collection(db, 'customers'));
        customersList.innerHTML = '';
        
        if (querySnapshot.empty) {
            customersList.innerHTML = '<p>Henüz kayıtlı müşteri bulunmamaktadır.</p>';
            return;
        }
        
        const customersTable = createElement('table', {
            className: 'data-table',
            style: 'width: 100%; border-collapse: collapse; margin-top: 10px;'
        });
        
        const thead = createElement('thead');
        const headerRow = createElement('tr');
        ['Ad Soyad', 'Telefon', 'E-posta', 'Puan', 'Son Ziyaret', 'İşlemler'].forEach(text => {
            const th = createElement('th', {
                textContent: text,
                style: 'text-align: left; padding: 10px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;'
            });
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        customersTable.appendChild(thead);
        
        const tbody = createElement('tbody');
        
        querySnapshot.forEach(doc => {
            const customer = { id: doc.id, ...doc.data() };
            const tr = createElement('tr', {
                style: 'border-bottom: 1px solid #e5e7eb;'
            });
            
            const nameCell = createElement('td', {
                textContent: customer.name || 'Belirtilmemiş',
                style: 'padding: 10px;'
            });
            
            const phoneCell = createElement('td', {
                textContent: customer.phone || '-',
                style: 'padding: 10px;'
            });
            
            const emailCell = createElement('td', {
                textContent: customer.email || '-',
                style: 'padding: 10px;'
            });
            
            const pointsCell = createElement('td', {
                textContent: customer.points || '0',
                style: 'padding: 10px; text-align: center;'
            });
            
            const lastVisitCell = createElement('td', {
                textContent: customer.lastVisit ? new Date(customer.lastVisit.toDate()).toLocaleString() : '-',
                style: 'padding: 10px;'
            });
            
            const actionsCell = createElement('td', {
                style: 'padding: 10px; white-space: nowrap;'
            });
            
            const viewBtn = createElement('button', {
                textContent: '👁️ Görüntüle',
                className: 'action-button',
                style: 'margin-right: 5px;',
                onclick: () => viewCustomerDetails(customer)
            });
            
            const editBtn = createElement('button', {
                textContent: '✏️ Düzenle',
                className: 'action-button',
                style: 'margin-right: 5px; background-color: #f59e0b;',
                onclick: () => editCustomer(customer)
            });
            
            const deleteBtn = createElement('button', {
                textContent: '🗑️ Sil',
                className: 'action-button',
                style: 'background-color: #ef4444;',
                onclick: () => deleteCustomer(customer.id)
            });
            
            actionsCell.appendChild(viewBtn);
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
            
            tr.appendChild(nameCell);
            tr.appendChild(phoneCell);
            tr.appendChild(emailCell);
            tr.appendChild(pointsCell);
            tr.appendChild(lastVisitCell);
            tr.appendChild(actionsCell);
            
            tbody.appendChild(tr);
        });
        
        customersTable.appendChild(tbody);
        customersList.appendChild(customersTable);
        
    } catch (error) {
        console.error('Müşteriler yüklenirken hata oluştu:', error);
        showNotification('Müşteriler yüklenirken bir hata oluştu!', 'error');
    }
}

// Müşteri detaylarını göster
function viewCustomerDetails(customer) {
    // Bu fonksiyonu ihtiyacınıza göre düzenleyebilirsiniz
    alert(`Müşteri Detayları:\n\n` +
          `Ad Soyad: ${customer.name || 'Belirtilmemiş'}\n` +
          `Telefon: ${customer.phone || '-'}\n` +
          `E-posta: ${customer.email || '-'}\n` +
          `Puan: ${customer.points || '0'}\n` +
          `Son Ziyaret: ${customer.lastVisit ? new Date(customer.lastVisit.toDate()).toLocaleString() : 'Kayıt yok'}`);
}

// Müşteri düzenle
function editCustomer(customer) {
    // Müşteri düzenleme modalını aç
    const modal = document.getElementById('edit-customer-modal');
    if (!modal) return;
    
    // Form alanlarını doldur
    document.getElementById('edit-customer-id').value = customer.id;
    document.getElementById('edit-customer-name').value = customer.name || '';
    document.getElementById('edit-customer-phone').value = customer.phone || '';
    document.getElementById('edit-customer-email').value = customer.email || '';
    document.getElementById('edit-customer-points').value = customer.points || '0';
    
    // Modalı göster
    modal.style.display = 'block';
}

// Müşteri sil
async function deleteCustomer(customerId) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'customers', customerId));
        showNotification('Müşteri başarıyla silindi.', 'success');
        loadCustomers(); // Listeyi yenile
    } catch (error) {
        console.error('Müşteri silinirken hata oluştu:', error);
        showNotification('Müşteri silinirken bir hata oluştu!', 'error');
    }
}

// Sipariş fişi yazdırma fonksiyonu
async function printOrderReceipt(orderId) {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (!orderDoc.exists()) {
            showNotification('Sipariş bulunamadı!', 'error');
            return;
        }
        
        const order = { id: orderDoc.id, ...orderDoc.data() };
        
        if (typeof printReceipt === 'function') {
            printReceipt({
                orderNumber: order.id,
                tableNumber: order.tableNumber || 'Yok',
                waiter: order.waiter || 'Yok',
                items: order.items.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity || 1
                })),
                status: order.status,
                createdAt: order.createdAt?.toDate() || new Date()
            });
        } else {
            console.error('printReceipt fonksiyonu bulunamadı');
        }
    } catch (error) {
        console.error('Fiş yazdırma hatası:', error);
        showNotification('Fiş yazdırılırken bir hata oluştu!', 'error');
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

// Yazıcı Ayarları
function loadPrinterSettings() {
    // Load saved printer settings
    const savedPrinterType = localStorage.getItem('printerType');
    const savedPrinterIP = localStorage.getItem('printerIP');
    const savedPrinterPort = localStorage.getItem('printerPort');
    
    if (savedPrinterType === 'network' && savedPrinterIP) {
        const networkSettings = document.getElementById('network-printer-settings');
        const printerIP = document.getElementById('printer-ip');
        const printerPort = document.getElementById('printer-port');
        
        if (networkSettings) networkSettings.style.display = 'block';
        if (printerIP) printerIP.value = savedPrinterIP;
        if (printerPort) printerPort.value = savedPrinterPort || '9100';
    } else if (savedPrinterType === 'usb') {
        const usbStatus = document.getElementById('usb-printer-status');
        if (usbStatus) usbStatus.style.display = 'block';
    }
}

// USB Printer Connection
const connectUSBPrinterBtn = document.getElementById('connect-usb-printer');
if (connectUSBPrinterBtn) {
    connectUSBPrinterBtn.addEventListener('click', async () => {
        if (!window.thermalPrinter) {
            showNotification('Thermal printer kütüphanesi yüklenmedi!', 'error');
            return;
        }
        
        connectUSBPrinterBtn.disabled = true;
        connectUSBPrinterBtn.textContent = 'Bağlanıyor...';
        
        const result = await window.thermalPrinter.connectUSB();
        
        if (result.success) {
            localStorage.setItem('printerType', 'usb');
            const usbStatus = document.getElementById('usb-printer-status');
            if (usbStatus) usbStatus.style.display = 'block';
            showNotification(result.message, 'success');
        } else {
            showNotification(result.message, 'error');
        }
        
        connectUSBPrinterBtn.disabled = false;
        connectUSBPrinterBtn.textContent = '🔌 USB Yazıcı Bağla';
    });
}

// Network Printer Setup
const setupNetworkPrinterBtn = document.getElementById('setup-network-printer');
if (setupNetworkPrinterBtn) {
    setupNetworkPrinterBtn.addEventListener('click', () => {
        const networkSettings = document.getElementById('network-printer-settings');
        if (networkSettings) networkSettings.style.display = 'block';
    });
}

// Save Network Printer
const saveNetworkPrinterBtn = document.getElementById('save-network-printer');
if (saveNetworkPrinterBtn) {
    saveNetworkPrinterBtn.addEventListener('click', async () => {
        const printerIP = document.getElementById('printer-ip')?.value.trim();
        const printerPort = document.getElementById('printer-port')?.value || '9100';
        
        if (!printerIP) {
            showNotification('Lütfen IP adresi girin!', 'error');
            return;
        }
        
        if (!window.thermalPrinter) {
            showNotification('Thermal printer kütüphanesi yüklenmedi!', 'error');
            return;
        }
        
        const result = await window.thermalPrinter.connectNetwork(printerIP, parseInt(printerPort));
        
        if (result.success) {
            localStorage.setItem('printerType', 'network');
            localStorage.setItem('printerIP', printerIP);
            localStorage.setItem('printerPort', printerPort);
            showNotification(result.message, 'success');
        } else {
            showNotification(result.message, 'error');
        }
    });
}

// Test Network Printer
const testNetworkPrinterBtn = document.getElementById('test-network-printer');
if (testNetworkPrinterBtn) {
    testNetworkPrinterBtn.addEventListener('click', async () => {
        const printerIP = document.getElementById('printer-ip')?.value.trim();
        const printerPort = document.getElementById('printer-port')?.value || '9100';
        
        if (!printerIP) {
            showNotification('Lütfen önce IP adresini kaydedin!', 'error');
            return;
        }
        
        if (!window.thermalPrinter) {
            showNotification('Thermal printer kütüphanesi yüklenmedi!', 'error');
            return;
        }
        
        testNetworkPrinterBtn.disabled = true;
        testNetworkPrinterBtn.textContent = 'Test ediliyor...';
        
        await window.thermalPrinter.connectNetwork(printerIP, parseInt(printerPort));
        
        const testResult = await window.thermalPrinter.printReceipt({
            tableNumber: 'TEST',
            waiter: 'Test',
            items: [
                { name: 'Test Ürün', price: 10.00, quantity: 1 }
            ],
            subtotal: 10.00,
            total: 10.80,
            receiptNumber: 'TEST-001'
        });
        
        if (testResult.success) {
            showNotification('Test fişi gönderildi!', 'success');
        } else {
            showNotification(testResult.message, 'error');
        }
        
        testNetworkPrinterBtn.disabled = false;
        testNetworkPrinterBtn.textContent = 'Test Yazdır';
    });
}

// Use Browser Print
const useBrowserPrintBtn = document.getElementById('use-browser-print');
if (useBrowserPrintBtn) {
    useBrowserPrintBtn.addEventListener('click', () => {
        localStorage.setItem('printerType', 'browser');
        showNotification('Tarayıcı yazdırma modu aktif!', 'success');
    });
}

// Disconnect USB
const disconnectUSBBtn = document.getElementById('disconnect-usb');
if (disconnectUSBBtn) {
    disconnectUSBBtn.addEventListener('click', async () => {
        if (window.thermalPrinter && window.thermalPrinter.usbDevice) {
            try {
                await window.thermalPrinter.usbDevice.close();
                window.thermalPrinter.usbDevice = null;
                window.thermalPrinter.printerType = null;
                localStorage.removeItem('printerType');
                
                const usbStatus = document.getElementById('usb-printer-status');
                if (usbStatus) usbStatus.style.display = 'none';
                
                showNotification('USB yazıcı bağlantısı kesildi.', 'success');
            } catch (error) {
                showNotification('Bağlantı kesilirken hata: ' + error.message, 'error');
            }
        }
    });
}

// Update printReceipt function to use thermal printer if available
const originalPrintReceipt = window.printReceipt;
window.printReceipt = function(orderData) {
    const printerType = localStorage.getItem('printerType');
    
    if (printerType === 'usb' || printerType === 'network') {
        // Use thermal printer
        if (window.thermalPrinter) {
            const receiptData = {
                tableNumber: orderData.tableNumber || '-',
                waiter: orderData.waiter || '-',
                items: orderData.items || [],
                subtotal: orderData.subtotal || 0,
                total: orderData.total || 0,
                cashReceived: orderData.cashReceived,
                changeDue: orderData.changeDue,
                paymentMethod: orderData.paymentMethod,
                receiptNumber: orderData.receiptNumber || 'RCPT-' + Date.now().toString().slice(-6)
            };
            
            window.thermalPrinter.printReceipt(receiptData).then(result => {
                if (result.success) {
                    showNotification(result.message, 'success');
                } else {
                    showNotification(result.message, 'error');
                    // Fallback to browser print
                    if (originalPrintReceipt) originalPrintReceipt(orderData);
                }
            }).catch(error => {
                console.error('Thermal printer error:', error);
                showNotification('Thermal yazıcı hatası, tarayıcı yazdırmaya geçiliyor...', 'error');
                if (originalPrintReceipt) originalPrintReceipt(orderData);
            });
            return;
        }
    }
    
    // Fallback to original browser print
    if (originalPrintReceipt) {
        originalPrintReceipt(orderData);
    } else {
        // Use browser print fallback
        if (window.printReceiptBrowser) {
            window.printReceiptBrowser(orderData);
        }
    }
};

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