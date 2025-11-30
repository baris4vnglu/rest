import { db, auth } from './firebase.js';
import {
    collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, getDocs, getDoc, orderBy, limit, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- YARDIMCI FONKSİYONLAR ---
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

// Stil Animasyonları
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

// --- GLOBAL DEĞİŞKENLER ---
let selectedTableId = null;
let selectedOrderForPayment = null;

// --- DOM ELEMENTLERİ (Hata almamak için güvenli seçim) ---
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminPanel = document.getElementById('admin-panel');
const logoutButton = document.getElementById('logout-button');

// Ana Menü Butonları
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
const printerSettingsModal = document.getElementById('printer-settings-modal');

// Formlar ve Listeler
const addProductForm = document.getElementById('add-product-form');
const menuItemsList = document.getElementById('menu-items-list');
const newOrderForm = document.getElementById('new-order-form');
const reservationForm = document.getElementById('reservation-form');
const reservationsList = document.getElementById('reservations-list');
const cashForm = document.getElementById('cash-form');
const addInventoryForm = document.getElementById('add-inventory-form');
const inventoryList = document.getElementById('inventory-list');
const addCustomerForm = document.getElementById('add-customer-form');
const customersList = document.getElementById('customers-list');
const kitchenOrdersList = document.getElementById('kitchen-orders-list');

// Masa Yönetimi Elementleri
const tableCountInput = document.getElementById('table-count');
const websiteUrlInput = document.getElementById('website-url');
const saveTableCountBtn = document.getElementById('save-table-count');
const updateTableCountBtn = document.getElementById('update-table-count-btn');
const tableGrid = document.getElementById('table-grid');
const tableList = document.getElementById('table-list');
const pageInfo = document.getElementById('page-info');
const tableDetailModal = document.getElementById('table-detail-modal');
const tableDetailContent = document.getElementById('table-detail-content');

// --- BAŞLANGIÇ AYARLARI ---

// QR Kod için Base URL
function getBaseUrl() {
    const savedUrl = websiteUrlInput?.value.trim();
    if (savedUrl) return savedUrl.replace(/\/$/, '');
    
    const storedUrl = localStorage.getItem('websiteBaseUrl');
    if (storedUrl) return storedUrl.replace(/\/$/, '');

    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('file://')) {
        console.warn('⚠️ QR kodlar için geçerli bir URL gerekli!');
    }
    return origin;
}

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
            loadMenuItems();
            loadReservations();
            loadPayments();
            loadInventory(); // Bu fonksiyon aşağıda tanımlandı
            loadCustomers();
            loadKitchenOrders();
            loadTableSettings();
            
            // Grafikleri ve Sesi Başlat
            initDashboardCharts();
            listenForNewOrders();
        }
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (adminPanel) adminPanel.classList.add('hidden');
    }
});

// Login İşlemi
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const loginButton = document.getElementById('login-button');

        loginButton.disabled = true;
        loginButton.textContent = 'Giriş yapılıyor...';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification('Başarıyla giriş yapıldı!', 'success');
        } catch (error) {
            let errorMessage = 'Giriş başarısız.';
            if (error.code === 'auth/invalid-email') errorMessage = 'Geçersiz e-posta.';
            if (error.code === 'auth/wrong-password') errorMessage = 'Hatalı şifre.';
            showNotification(errorMessage, 'error');
            if (loginError) {
                loginError.textContent = errorMessage;
                loginError.classList.remove('hidden');
            }
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Giriş Yap';
        }
    });
}

// Çıkış İşlemi
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error(error);
        }
    });
}

// --- MODAL İŞLEMLERİ ---
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

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        const modal = closeBtn.closest('.modal');
        closeModal(modal);
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => closeModal(modal));
    }
});

// --- MENÜ BUTONLARI ---
if (productBtn) productBtn.addEventListener('click', () => openModal(productModal));
if (orderStatusBtn) orderStatusBtn.addEventListener('click', () => { openModal(orderStatusModal); loadTableSettings(); });
if (reservationBtn) reservationBtn.addEventListener('click', () => openModal(reservationModal));
if (kitchenBtn) kitchenBtn.addEventListener('click', () => openModal(kitchenModal));
if (inventoryBtn) inventoryBtn.addEventListener('click', () => openModal(inventoryModal));
if (crmBtn) crmBtn.addEventListener('click', () => openModal(crmModal));
if (cashOpenBtn) cashOpenBtn.addEventListener('click', () => openModal(cashModal));
// Yazıcı ayarları butonu (Header içinde olabilir)
const printerBtn = document.getElementById('printer-settings-btn');
if (printerBtn) printerBtn.addEventListener('click', () => openModal(printerSettingsModal));


if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', () => {
        openModal(placeOrderModal);
        loadOrderItems();
    });
}

if (paymentBtn) {
    paymentBtn.addEventListener('click', () => {
        openModal(paymentModal);
        loadPaymentTables();
        const tabTables = document.getElementById('payment-tab-tables');
        if (tabTables) tabTables.click(); // Reset to tables tab
    });
}

if (reportsBtn) {
    reportsBtn.addEventListener('click', () => {
        openModal(reportsModal);
        const btnZ = document.getElementById('btn-z-report');
        if (btnZ) btnZ.click();
    });
}

// --- ÜRÜN YÖNETİMİ ---
if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('product-name').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const category = document.getElementById('product-category').value;
        const submitBtn = addProductForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        try {
            await addDoc(collection(db, 'menuItems'), {
                name, price, category,
                ingredients: document.getElementById('product-ingredients').value.trim() || '',
                image: document.getElementById('product-image').value.trim() || '',
                createdAt: Timestamp.now()
            });
            addProductForm.reset();
            showNotification('Ürün eklendi!', 'success');
        } catch (error) {
            showNotification('Hata oluştu', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}

function loadMenuItems() {
    if (!menuItemsList) return;
    onSnapshot(query(collection(db, 'menuItems'), orderBy('createdAt', 'desc')), (snapshot) => {
        menuItemsList.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const div = createElement('div', { className: 'menu-item' });

            div.innerHTML = `
                <div style="flex:1">
                    <strong>${item.name}</strong>
                    <p>${item.price} TL • ${item.category}</p>
                </div>

                <button class="edit-item" style="
                    background:#3b82f6; 
                    color:white; 
                    margin-right:6px;
                    border:none;
                    padding:5px 10px;
                    border-radius:5px;
                    cursor:pointer;"
                >Düzenle</button>

                <button class="delete-item" style="
                    background:#ef4444;
                    color:white;
                    border:none;
                    padding:5px 10px;
                    border-radius:5px;
                    cursor:pointer;"
                >Sil</button>
            `;

            // Edit tıklayınca düzenleme modalı açılacak
            div.querySelector('.edit-item').onclick = () => editItem(docSnap.id, item);

            // Silme
            div.querySelector('.delete-item').onclick = () => deleteItem(docSnap.id);

            menuItemsList.appendChild(div);
        });
    });
}


window.deleteItem = async (id) => {
    if(confirm('Silmek istiyor musunuz?')) {
        await deleteDoc(doc(db, 'menuItems', id));
        showNotification('Silindi', 'success');
    }
};

async function loadOrderItems() {
    const select = document.getElementById('order-items');
    if (!select) return;
    const snapshot = await getDocs(query(collection(db, 'menuItems'), orderBy('name')));
    select.innerHTML = '';
    snapshot.forEach(doc => {
        const item = doc.data();
        select.appendChild(createElement('option', { value: doc.id, textContent: `${item.name} - ${item.price} TL` }));
    });
}

// --- SİPARİŞ VERME (Manuel) ---
if (newOrderForm) {
    newOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedOpts = Array.from(document.getElementById('order-items').selectedOptions);
        if (selectedOpts.length === 0) return showNotification('Ürün seçiniz', 'error');

        const items = selectedOpts.map(opt => ({
            id: opt.value,
            name: opt.text.split(' - ')[0],
            price: parseFloat(opt.text.split(' - ')[1])
        }));
        
        const total = items.reduce((sum, item) => sum + item.price, 0);

        try {
            await addDoc(collection(db, 'orders'), {
                customerName: e.target[0].value,
                items, total, status: 'Hazırlanıyor', createdAt: Timestamp.now(), paid: false
            });
            newOrderForm.reset();
            showNotification('Sipariş oluşturuldu', 'success');
            closeModal(placeOrderModal);
        } catch (error) {
            console.error(error);
        }
    });
}

// --- MASA YÖNETİMİ ---
let currentTablePage = 1;
const tablesPerPage = 20;

async function loadTableSettings() {
    if (!tableCountInput) return;
    const settingsSnap = await getDocs(collection(db, 'tableSettings'));
    if (!settingsSnap.empty) {
        const settings = settingsSnap.docs[0].data();
        tableCountInput.value = settings.tableCount || '';
        if (websiteUrlInput) websiteUrlInput.value = settings.websiteUrl || localStorage.getItem('websiteBaseUrl') || '';
        
        if (settings.tableCount && tableGrid) {
            document.getElementById('table-settings').style.display = 'none';
            tableGrid.style.display = 'block';
            loadTables();
        }
    }
}

if (saveTableCountBtn) {
    saveTableCountBtn.addEventListener('click', async () => {
        const count = parseInt(tableCountInput.value);
        if (!count || count <= 0) return showNotification('Geçerli sayı girin', 'error');
        
        const url = websiteUrlInput?.value.trim();
        if (url) localStorage.setItem('websiteBaseUrl', url);

        try {
            const settingsQuery = await getDocs(collection(db, 'tableSettings'));
            if (!settingsQuery.empty) {
                await updateDoc(doc(db, 'tableSettings', settingsQuery.docs[0].id), { tableCount: count, websiteUrl: url });
            } else {
                await addDoc(collection(db, 'tableSettings'), { tableCount: count, websiteUrl: url });
            }

            const tablesSnap = await getDocs(collection(db, 'tables'));
            const existingNums = new Set();
            tablesSnap.forEach(d => existingNums.add(d.data().number));

            const promises = [];
            for (let i = 1; i <= count; i++) {
                if (!existingNums.has(i)) {
                    promises.push(addDoc(collection(db, 'tables'), { number: i, status: 'Boş', createdAt: Timestamp.now() }));
                }
            }
            await Promise.all(promises);
            
            document.getElementById('table-settings').style.display = 'none';
            if (tableGrid) tableGrid.style.display = 'block';
            loadTables();
            showNotification('Masalar oluşturuldu', 'success');

        } catch (error) {
            console.error(error);
            showNotification('Hata oluştu', 'error');
        }
    });
}

function loadTables() {
    if (!tableList) return;
    onSnapshot(query(collection(db, 'tables'), orderBy('number', 'asc')), (snapshot) => {
        tableList.innerHTML = '';
        const tables = [];
        snapshot.forEach(d => tables.push({ id: d.id, ...d.data() }));

        const pageTables = tables.slice((currentTablePage - 1) * tablesPerPage, currentTablePage * tablesPerPage);
        
        pageTables.forEach(table => {
            const card = createElement('div', {
                className: 'table-card',
                style: `padding:15px; margin:5px; border-radius:10px; background:${table.status === 'Dolu' ? '#e53e3e' : '#10b981'}; color:white; cursor:pointer; text-align:center; min-width:100px; display:inline-block;`,
                onclick: () => showTableDetails(table)
            });
            card.innerHTML = `<strong>Masa ${table.number}</strong><br><small>${table.status}</small>`;
            
            const qrBtn = createElement('button', {
                textContent: '📱 QR',
                style: 'margin-top:5px; padding:2px 8px; border:1px solid white; background:transparent; color:white; border-radius:4px; font-size:10px;',
                onclick: (e) => { e.stopPropagation(); showTableQRCode(table); }
            });
            card.appendChild(document.createElement('br'));
            card.appendChild(qrBtn);
            
            tableList.appendChild(card);
        });
        
        if (pageInfo) pageInfo.textContent = `Sayfa ${currentTablePage}`;
    });
}

async function showTableDetails(table) {
    selectedTableId = table.id;
    tableDetailContent.innerHTML = `
        <h2>Masa #${table.number}</h2>
        <p>Durum: <strong>${table.status}</strong></p>
        <div id="table-orders-section">
            <h3>Siparişler</h3>
            <div id="table-orders-list">Yükleniyor...</div>
        </div>
    `;
    
    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('tableNumber', '==', table.number), where('paid', '==', false)));
    const ordersListDiv = document.getElementById('table-orders-list');
    ordersListDiv.innerHTML = '';
    
    if (ordersSnap.empty) {
        ordersListDiv.innerHTML = '<p>Aktif sipariş yok.</p>';
    } else {
        let total = 0;
        ordersSnap.forEach(doc => {
            const o = doc.data();
            total += o.total || 0;
            const div = createElement('div', { style: 'border-bottom:1px solid #eee; padding:5px;' });
            div.innerHTML = `
                <strong>#${doc.id.substring(0,5)}</strong> - ${o.status}
                <div style="float:right">${(o.total||0).toFixed(2)} TL</div>
                <div style="font-size:12px; color:#666;">
                    ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
            `;
            ordersListDiv.appendChild(div);
        });
        
        tableDetailContent.innerHTML += `<h3 style="text-align:right; margin-top:20px;">Toplam: ${total.toFixed(2)} TL</h3>`;
    }
    
    openModal(tableDetailModal);
}

function showTableQRCode(table) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/index.html?table=${table.number}`;
    
    const qrDiv = createElement('div', { className: 'modal active', style: 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;' });
    const content = createElement('div', { className: 'modal-content', style: 'background:white;padding:20px;text-align:center;border-radius:10px;' });
    
    content.innerHTML = `<h3>Masa ${table.number} QR</h3><div id="qrcode-canvas"></div><p style="font-size:10px;color:#666;">${url}</p>`;
    
    const closeBtn = createElement('button', { textContent: 'Kapat', style:'margin-top:10px;padding:5px 15px;background:#e53e3e;color:white;border:none;border-radius:5px;', onclick: () => qrDiv.remove() });
    content.appendChild(closeBtn);
    qrDiv.appendChild(content);
    document.body.appendChild(qrDiv);
    
    setTimeout(() => {
        const container = content.querySelector('#qrcode-canvas');
        if (window.QRCode) {
            new QRCode(container, { text: url, width: 200, height: 200 });
        } else {
            container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />`;
        }
    }, 100);
}

// --- ÖDEME YÖNETİMİ ---
function loadPayments() {
    // loadPaymentTables modal açılınca çağrılır
}

async function loadPaymentTables() {
    const list = document.getElementById('payment-tables-list');
    if (!list) return;
    list.innerHTML = 'Yükleniyor...';
    
    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('paid', '==', false)));
    const tableOrders = {};
    ordersSnap.forEach(doc => {
        const o = doc.data();
        if (o.tableNumber) {
            if (!tableOrders[o.tableNumber]) tableOrders[o.tableNumber] = { total: 0, count: 0 };
            tableOrders[o.tableNumber].total += o.total || 0;
            tableOrders[o.tableNumber].count++;
        }
    });
    
    const tablesSnap = await getDocs(query(collection(db, 'tables'), orderBy('number')));
    list.innerHTML = '';
    
    tablesSnap.forEach(doc => {
        const t = doc.data();
        const info = tableOrders[t.number];
        
        const div = createElement('div', {
            style: `padding:15px; border-radius:8px; background:${info ? '#fef3c7' : '#f3f4f6'}; border:2px solid ${info ? '#f59e0b' : '#eee'}; cursor:pointer; text-align:center;`,
            onclick: () => {
                if(info) showTableOrdersForPayment(t.number);
                else showNotification('Ödeme yok', 'success');
            }
        });
        
        div.innerHTML = `<strong>Masa ${t.number}</strong><br>`;
        if (info) {
            div.innerHTML += `<span style="color:#e53e3e; font-weight:bold;">${info.total.toFixed(2)} TL</span><br><small>${info.count} Sipariş</small>`;
        } else {
            div.innerHTML += `<small>Boş</small>`;
        }
        list.appendChild(div);
    });
}

async function showTableOrdersForPayment(tableNumber) {
    document.getElementById('payment-tables-list').style.display = 'none';
    const detailSec = document.getElementById('selected-table-orders');
    detailSec.style.display = 'block';
    
    document.getElementById('selected-table-title').textContent = `Masa #${tableNumber} Ödeme`;
    const list = document.getElementById('table-orders-for-payment');
    list.innerHTML = 'Yükleniyor...';
    
    const q = query(collection(db, 'orders'), where('tableNumber', '==', tableNumber), where('paid', '==', false));
    const snap = await getDocs(q);
    
    list.innerHTML = '';
    let grandTotal = 0;
    const orders = [];
    
    snap.forEach(doc => {
        const o = { id: doc.id, ...doc.data() };
        orders.push(o);
        grandTotal += o.total || 0;
        
        const div = createElement('div', { style: 'background:white; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #ddd;' });
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>#${o.id.substring(0,5)}</strong>
                <span>${(o.total||0).toFixed(2)} TL</span>
            </div>
            <button onclick="selectOrderForPayment('${o.id}', ${o.total}, false)" style="width:100%; margin-top:5px; background:#3b82f6; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Bu Siparişi Öde</button>
        `;
        list.appendChild(div);
    });
    
    const payAllBtn = createElement('button', {
        textContent: `TÜMÜNÜ ÖDE (${grandTotal.toFixed(2)} TL)`,
        style: 'width:100%; padding:15px; background:#10b981; color:white; border:none; border-radius:5px; font-weight:bold; font-size:16px; margin-top:10px; cursor:pointer;',
        onclick: () => payAllTableOrders(tableNumber, orders)
    });
    list.appendChild(payAllBtn);
    
    document.getElementById('back-to-tables').onclick = () => {
        detailSec.style.display = 'none';
        document.getElementById('payment-tables-list').style.display = 'grid';
    };
}

async function payAllTableOrders(tableNumber, orders) {
    if (!confirm(`${tableNumber} nolu masa için ${orders.length} adet siparişi kapatmak istiyor musunuz?`)) return;
    
    try {
        const batchPromises = orders.map(o => updateDoc(doc(db, 'orders', o.id), {
            paid: true,
            status: 'completed',
            paymentMethod: 'nakit',
            paymentDate: Timestamp.now()
        }));
        
        await Promise.all(batchPromises);
        
        const tablesSnap = await getDocs(query(collection(db, 'tables'), where('number', '==', tableNumber)));
        if (!tablesSnap.empty) {
            await updateDoc(doc(db, 'tables', tablesSnap.docs[0].id), { status: 'Boş' });
        }
        
        showNotification('Masa hesabı kapatıldı!', 'success');
        document.getElementById('selected-table-orders').style.display = 'none';
        document.getElementById('payment-tables-list').style.display = 'grid';
        loadPaymentTables();
        
    } catch (e) {
        console.error(e);
        showNotification('Hata oluştu', 'error');
    }
}

window.selectOrderForPayment = (orderId, amount) => {
    selectedOrderForPayment = orderId;
    document.getElementById('selected-table-orders').style.display = 'none';
    const formContainer = document.getElementById('payment-form-container');
    formContainer.style.display = 'block';
    
    document.getElementById('total-amount-due').textContent = amount.toFixed(2) + ' TL';
    document.getElementById('selected-order-info').innerHTML = `Sipariş ID: ${orderId.substring(0,8)}`;
    
    const radios = document.getElementsByName('payment-method');
    radios.forEach(r => r.addEventListener('change', (e) => {
        const cashSec = document.getElementById('cash-received-section');
        cashSec.style.display = e.target.value === 'nakit' ? 'block' : 'none';
    }));
    
    document.getElementById('cancel-payment').onclick = () => {
        formContainer.style.display = 'none';
        document.getElementById('payment-tables-list').style.display = 'grid';
    };
};

// Ödeme Formu Submit (FİŞ YAZDIRMA ENTEGRE EDİLDİ)
const processPaymentForm = document.getElementById('process-payment-form');
if (processPaymentForm) {
    processPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const method = document.querySelector('input[name="payment-method"]:checked').value;
        const cashReceivedVal = parseFloat(document.getElementById('cash-received').value) || 0;
        const totalAmountVal = parseFloat(document.getElementById('total-amount-due').textContent) || 0;
        const changeDueVal = cashReceivedVal - totalAmountVal;
        
        try {
            await updateDoc(doc(db, 'orders', selectedOrderForPayment), {
                paid: true,
                status: 'completed',
                paymentMethod: method,
                paymentDate: Timestamp.now()
            });
            
            showNotification('Ödeme Alındı', 'success');

            // Fiş Yazdırma
            const orderSnap = await getDoc(doc(db, 'orders', selectedOrderForPayment));
            const orderData = orderSnap.data();
            const printData = {
                ...orderData,
                cashReceived: method === 'nakit' ? cashReceivedVal : null,
                changeDue: method === 'nakit' ? changeDueVal : null,
                paymentMethod: method
            };
            await printSystemReceipt(printData);
            
            document.getElementById('payment-form-container').style.display = 'none';
            document.getElementById('payment-tables-list').style.display = 'grid';
            loadPaymentTables();
        } catch (err) {
            console.error(err);
            showNotification('Hata', 'error');
        }
    });
}

// --- DİĞER FONKSİYONLAR ---
function loadReservations() {
    if(!reservationsList) return;
    onSnapshot(query(collection(db, 'reservations'), orderBy('createdAt', 'desc')), (snap) => {
        reservationsList.innerHTML = '';
        snap.forEach(doc => {
            const r = doc.data();
            const div = createElement('div', { className: 'menu-item', style: 'padding:10px;' });
            div.innerHTML = `<strong>${r.name}</strong> - ${r.date} ${r.time} (${r.people} kişi)`;
            reservationsList.appendChild(div);
        });
    });
}

if(reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'reservations'), {
                name: document.getElementById('res-name').value,
                date: document.getElementById('res-date').value,
                time: document.getElementById('res-time').value,
                people: document.getElementById('res-people').value,
                phone: document.getElementById('res-phone').value,
                createdAt: Timestamp.now()
            });
            reservationForm.reset();
            showNotification('Rezervasyon Eklendi', 'success');
        } catch(e) { showNotification('Hata', 'error'); }
    });
}

function loadKitchenOrders() {
    if (!kitchenOrdersList) return;
    onSnapshot(query(collection(db, 'orders'), where('status', 'in', ['Hazırlanıyor', 'preparing'])), (snap) => {
        kitchenOrdersList.innerHTML = '';
        snap.forEach(doc => {
            const o = doc.data();
            const div = createElement('div', { style: 'background:white; padding:15px; margin-bottom:10px; border-left:4px solid orange; box-shadow:0 2px 5px rgba(0,0,0,0.1);' });
            div.innerHTML = `
                <h3>Masa: ${o.tableNumber || 'Paket'} (#${doc.id.substring(0,4)})</h3>
                <ul>${o.items.map(i => `<li>${i.quantity}x ${i.name}</li>`).join('')}</ul>
                ${o.notes ? `<p style="color:red">Not: ${o.notes}</p>` : ''}
                <button onclick="markOrderReady('${doc.id}')" style="background:#10b981; color:white; border:none; padding:5px 10px; cursor:pointer;">HAZIR</button>
            `;
            kitchenOrdersList.appendChild(div);
        });
    });
}

window.markOrderReady = async (id) => {
    await updateDoc(doc(db, 'orders', id), { status: 'Hazır' });
    showNotification('Sipariş Hazır!', 'success');
};

// --- EKSİK OLAN STOK FONKSİYONU ---
function loadInventory() {
    if (!inventoryList) return;
    onSnapshot(query(collection(db, 'inventory'), orderBy('createdAt', 'desc')), (snapshot) => {
        inventoryList.innerHTML = '';
        if (snapshot.empty) {
            inventoryList.innerHTML = '<p style="padding:10px; color:#666;">Stok kaydı yok.</p>';
            return;
        }
        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const div = createElement('div', { className: 'menu-item' });
            div.innerHTML = `
                <div style="flex:1">
                    <strong>${item.name}</strong>
                    <p>Miktar: ${item.quantity} | Maliyet: ${item.cost}</p>
                </div>
            `;
            inventoryList.appendChild(div);
        });
    });
}

// Stok Ekleme Formu
if (addInventoryForm) {
    addInventoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('item-name').value;
        const qty = parseFloat(document.getElementById('item-quantity').value);
        const cost = parseFloat(document.getElementById('item-cost').value);
        try {
            await addDoc(collection(db, 'inventory'), {
                name, quantity: qty, cost, createdAt: Timestamp.now()
            });
            addInventoryForm.reset();
            showNotification('Stok Eklendi', 'success');
        } catch(e) { console.error(e); }
    });
}

// Müşteri (CRM) Yükleme (Basit)
function loadCustomers() {
    if(!customersList) return;
    onSnapshot(query(collection(db, 'customers'), orderBy('createdAt', 'desc')), (snap) => {
        customersList.innerHTML = '';
        snap.forEach(d => {
            const c = d.data();
            const div = createElement('div', { className: 'menu-item' });
            div.innerHTML = `<strong>${c.name}</strong> (${c.phone})`;
            customersList.appendChild(div);
        });
    });
}
if(addCustomerForm) {
    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'customers'), {
                name: document.getElementById('customer-name').value,
                phone: document.getElementById('customer-phone').value,
                email: document.getElementById('customer-email').value,
                createdAt: Timestamp.now()
            });
            addCustomerForm.reset();
            showNotification('Müşteri Eklendi', 'success');
        } catch(e) {}
    });
}

// Kasa Açma
if(cashForm) {
    cashForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Basitçe localStorage veya DB'ye log atabilir
        showNotification('Kasa Açıldı', 'success');
        closeModal(cashModal);
    });
}

// --- RAPORLAMA MODÜLÜ ---
document.addEventListener('DOMContentLoaded', () => {
    const btnZ = document.getElementById('btn-z-report');
    const btnX = document.getElementById('btn-x-report');
    const btnA = document.getElementById('btn-adisyon');
    const btnI = document.getElementById('btn-iptal');
    const btnPrint = document.getElementById('btn-print');
    const dateInput = document.getElementById('date-input');

    if (!document.getElementById('receipt-preview')) return;

    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    const formatCurrency = (amount) => amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
    const dashedLine = '<div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>';

    async function fetchOrdersForDate(dateVal) {
        try {
            const startDate = new Date(dateVal); startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateVal); endDate.setHours(23, 59, 59, 999);
            
            const q = query(
                collection(db, 'orders'),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('createdAt', '<=', Timestamp.fromDate(endDate))
            );
            const snap = await getDocs(q);
            const results = [];
            snap.forEach(d => results.push({ id: d.id, ...d.data() }));
            return results;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async function updatePreview(type) {
        const preview = document.getElementById('receipt-preview');
        const dateVal = dateInput?.value || new Date().toISOString().slice(0, 10);
        preview.innerHTML = '<div style="text-align:center; padding:20px;">Veriler yükleniyor...</div>';

        const orders = await fetchOrdersForDate(dateVal);
        
        let html = `
            <div class="center bold" style="font-size:14px; text-align:center;">LEZZET BAHÇESİ</div>
            <div class="center muted" style="text-align:center; font-size:12px;">Tarih: ${dateVal}</div>
            ${dashedLine}
        `;

        if (type === 'z') { 
            const paidOrders = orders.filter(o => o.paid === true || o.status === 'completed');
            let total = 0, cash = 0, card = 0;
            const itemMap = {};

            paidOrders.forEach(o => {
                const amount = o.total || 0;
                total += amount;
                if (o.paymentMethod === 'kredi-karti') card += amount; else cash += amount;
                if (o.items) {
                    o.items.forEach(i => {
                        if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, sum: 0 };
                        itemMap[i.name].qty += (i.quantity || 1);
                        itemMap[i.name].sum += (i.price * (i.quantity || 1));
                    });
                }
            });

            html += `<div style="text-align:center; font-weight:bold;">Z RAPORU (GÜN SONU)</div>`;
            html += dashedLine;
            Object.entries(itemMap).forEach(([name, val]) => {
                html += `<div style="display:flex; justify-content:space-between; font-size:11px;"><span>${val.qty}x ${name}</span><span>${formatCurrency(val.sum)}</span></div>`;
            });
            html += dashedLine;
            html += `
                <div>Nakit: ${formatCurrency(cash)}</div>
                <div>Kredi Kartı: ${formatCurrency(card)}</div>
                <div style="text-align:right; font-size:16px; font-weight:bold; margin-top:5px;">TOPLAM CİRO: ${formatCurrency(total)}</div>
                <div style="text-align:center; font-size:10px; margin-top:10px;">** MALİ DEĞERİ VARDIR **</div>
            `;

        } else if (type === 'x') {
            let total = 0;
            orders.forEach(o => total += (o.total || 0));
            html += `<div style="text-align:center; font-weight:bold;">X RAPORU (ANLIK)</div>`;
            html += `<div>Açık/Kapalı Toplam Sipariş: ${orders.length}</div>`;
            html += `<div style="text-align:right; font-size:16px; font-weight:bold;">TAHMİNİ TOPLAM: ${formatCurrency(total)}</div>`;
        } else if (type === 'adisyon') {
            html += `<div style="text-align:center; font-weight:bold;">ADİSYON LİSTESİ</div>`;
            html += dashedLine;
            orders.forEach(o => {
                html += `<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:5px;">
                    <span>#${o.id.substring(0,4)} Masa:${o.tableNumber||'-'}</span>
                    <span>${formatCurrency(o.total||0)}</span>
                </div>`;
            });
        }

        preview.innerHTML = html;
    }

    if(btnZ) btnZ.addEventListener('click', () => updatePreview('z'));
    if(btnX) btnX.addEventListener('click', () => updatePreview('x'));
    if(btnA) btnA.addEventListener('click', () => updatePreview('adisyon'));
    if(btnPrint) btnPrint.addEventListener('click', () => window.print());
});

// --- SESLİ BİLDİRİM & GRAFİKLER ---
function listenForNewOrders() {
    console.log("🎧 Sipariş dinleme modu aktif edildi...");
    const sound = document.getElementById('notification-sound');
    
    const q = query(
        collection(db, 'orders'), 
        where('status', '==', 'Hazırlanıyor'),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const orderDate = data.createdAt;
                if (orderDate) {
                    const orderMillis = orderDate.toMillis();
                    const nowMillis = Date.now();
                    // 60 sn tolerans
                    if (nowMillis - orderMillis < 60000) { 
                        if(sound) {
                            sound.currentTime = 0;
                            sound.play().catch(e => console.log('Ses izni yok'));
                        }
                        showNotification('🔔 YENİ SİPARİŞ GELDİ!', 'success');
                    }
                }
            }
        });
    });
}

async function initDashboardCharts() {
    const salesCanvas = document.getElementById('salesChart');
    const productsCanvas = document.getElementById('topProductsChart');

    if (!salesCanvas || !productsCanvas) return;

    // Chart.js yüklü mü kontrolü
    if (typeof Chart === 'undefined') return;

    const today = new Date();
    today.setHours(0,0,0,0);
    const q = query(collection(db, 'orders'), where('createdAt', '>=', Timestamp.fromDate(today)));
    const snap = await getDocs(q);

    const hourlySales = new Array(24).fill(0);
    const productCounts = {};

    snap.forEach(doc => {
        const d = doc.data();
        const date = d.createdAt.toDate();
        hourlySales[date.getHours()] += d.total || 0;
        if (d.items) {
            d.items.forEach(item => {
                productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
            });
        }
    });

    const sortedProducts = Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    new Chart(salesCanvas, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Ciro',
                data: hourlySales,
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // ÖNEMLİ
            plugins: { legend: { display: false } }
        }
    });

    new Chart(productsCanvas, {
        type: 'doughnut',
        data: {
            labels: sortedProducts.map(([name]) => name),
            datasets: [{
                data: sortedProducts.map(([,count]) => count),
                backgroundColor: ['#ff6f61', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // ÖNEMLİ
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// --- YAZICI VE DİĞER GLOBAL FONKSİYONLAR ---
document.addEventListener('DOMContentLoaded', () => {
    const btnConnectUSB = document.getElementById('connect-usb-printer');
    if (btnConnectUSB) {
        btnConnectUSB.addEventListener('click', async () => {
            if (!window.thermalPrinter) return alert('Yazıcı modülü yok!');
            const result = await window.thermalPrinter.connectUSB();
            if (result.success) {
                showNotification(result.message, 'success');
                btnConnectUSB.textContent = '🔌 Bağlandı';
                btnConnectUSB.style.backgroundColor = '#10b981';
                localStorage.setItem('printerType', 'usb');
            } else {
                showNotification(result.message, 'error');
            }
        });
    }
    const btnBrowserPrint = document.getElementById('use-browser-print');
    if (btnBrowserPrint) {
        btnBrowserPrint.addEventListener('click', () => {
            if(window.thermalPrinter) window.thermalPrinter.printerType = null;
            localStorage.setItem('printerType', 'browser');
            showNotification('Varsayılan: Tarayıcı', 'success');
        });
    }
});

async function printSystemReceipt(orderData) {
    const receiptData = {
        tableNumber: orderData.tableNumber || '-',
        waiter: orderData.waiter || 'Kasa',
        items: orderData.items || [],
        total: orderData.total || 0,
        subtotal: orderData.total ? (orderData.total / 1.08) : 0,
        cashReceived: orderData.cashReceived || 0,
        changeDue: orderData.changeDue || 0,
        paymentMethod: orderData.paymentMethod || 'nakit',
        receiptNumber: 'FIS-' + Math.floor(Math.random() * 10000)
    };

    if (window.thermalPrinter && window.thermalPrinter.printerType === 'usb' && window.thermalPrinter.usbDevice) {
        const result = await window.thermalPrinter.printReceipt(receiptData);
        if (!result.success) printReceiptBrowser(receiptData); 
    } else {
        if (typeof printReceiptBrowser === 'function') printReceiptBrowser(receiptData);
        else window.print();
    }
}
window.editItem = (id, item) => {
    openModal(productModal);

    document.getElementById('product-name').value = item.name;
    document.getElementById('product-price').value = item.price;
    document.getElementById('product-category').value = item.category;
    document.getElementById('product-ingredients').value = item.ingredients || '';
    document.getElementById('product-image').value = item.image || '';

    const submitBtn = addProductForm.querySelector("button[type='submit']");
    submitBtn.textContent = "Güncelle";

    // Düzenleme modunda update yap
    submitBtn.onclick = async (e) => {
        e.preventDefault();

        try {
            await updateDoc(doc(db, 'menuItems', id), {
                name: document.getElementById('product-name').value.trim(),
                price: parseFloat(document.getElementById('product-price').value),
                category: document.getElementById('product-category').value,
                ingredients: document.getElementById('product-ingredients').value.trim(),
                image: document.getElementById('product-image').value.trim(),
            });

            showNotification("Ürün güncellendi!", "success");

            // Formu resetle + butonu eski haline al
            submitBtn.textContent = "Ürünü Kaydet";
            submitBtn.onclick = null;
            addProductForm.reset();

            closeModal(productModal);
        } catch (err) {
            console.error(err);
            showNotification("Hata oluştu!", "error");
        }
    };
};