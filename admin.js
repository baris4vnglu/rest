import { db, auth } from './firebase.js';
import {
  collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const ordersList = document.getElementById('orders-list');
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
const orderModifyForm = document.getElementById('order-modify-form');
const paymentSplitForm = document.getElementById('payment-split-form');
const addInventoryForm = document.getElementById('add-inventory-form');
const inventoryList = document.getElementById('inventory-list');
const addCustomerForm = document.getElementById('add-customer-form');
const customersList = document.getElementById('customers-list');
const kitchenOrdersList = document.getElementById('kitchen-orders-list');
const markReady = document.getElementById('mark-ready');

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
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => loginError.classList.add('hidden'))
        .catch((error) => {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        });
});

// Çıkış
logoutButton.addEventListener('click', () => signOut(auth).then(() => window.location.reload()));

// Modal Aç/Kapat
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal(e.target);
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal(closeBtn.closest('.modal'));
    });
});

// Buton Event'leri
productBtn.addEventListener('click', () => openModal(productModal));
orderStatusBtn.addEventListener('click', () => openModal(orderStatusModal));
placeOrderBtn.addEventListener('click', () => openModal(placeOrderModal));
reservationBtn.addEventListener('click', () => openModal(reservationModal));
paymentBtn.addEventListener('click', () => openModal(paymentModal));
reportsBtn.addEventListener('click', () => openModal(reportsModal));
kitchenBtn.addEventListener('click', () => openModal(kitchenModal));
inventoryBtn.addEventListener('click', () => openModal(inventoryModal));
crmBtn.addEventListener('click', () => openModal(crmModal));
cashOpenBtn.addEventListener('click', () => openModal(cashModal));

// Ürün Yönetimi
addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const productData = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        category: document.getElementById('product-category').value,
        ingredients: document.getElementById('product-ingredients').value,
        image: document.getElementById('product-image').value,
        createdAt: new Date().toISOString()
    };
    addDoc(collection(db, 'menuItems'), productData).then(() => {
        addProductForm.reset();
        alert('Ürün eklendi!');
        loadMenuItems();
    }).catch((error) => console.error('Ürün ekleme hatası:', error));
});

// Menü Öğelerini Yükle
function loadMenuItems() {
    onSnapshot(collection(db, 'menuItems'), (snapshot) => {
        menuItemsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const item = doc.data();
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = `
                <p>${item.name} - ${item.price} TL</p>
                <button onclick="deleteItem('${doc.id}')">Sil</button>
            `;
            menuItemsList.appendChild(itemDiv);
        });
    });
}

// Ürün Sil
window.deleteItem = (id) => {
    deleteDoc(doc(db, 'menuItems', id)).then(() => loadMenuItems());
};

// Sipariş Yönetimi
orderModifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = document.getElementById('order-id').value;
    const status = document.getElementById('order-status').value;
    updateDoc(doc(db, 'orders', orderId), { status }).then(() => {
        alert('Sipariş güncellendi!');
        loadOrders();
    }).catch((error) => console.error('Sipariş güncelleme hatası:', error));
});

// Siparişleri Yükle
function loadOrders() {
    onSnapshot(collection(db, 'orders'), (snapshot) => {
        ordersList.innerHTML = '';
        snapshot.forEach((doc) => {
            const order = doc.data();
            const orderDiv = document.createElement('div');
            orderDiv.innerHTML = `
                <p>ID: ${doc.id} - Durum: ${order.status || 'Hazırlanıyor'}</p>
            `;
            ordersList.appendChild(orderDiv);
        });
    });
}

// Yeni Sipariş
newOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const orderData = {
        customerName: e.target[0].value,
        address: e.target[1].value,
        phone: e.target[2].value,
        notes: e.target[3].value,
        items: Array.from(document.getElementById('order-items').selectedOptions).map(opt => opt.value),
        status: 'Hazırlanıyor',
        createdAt: new Date().toISOString()
    };
    addDoc(collection(db, 'orders'), orderData).then(() => {
        newOrderForm.reset();
        alert('Sipariş oluşturuldu!');
        loadOrders();
    }).catch((error) => console.error('Sipariş oluşturma hatası:', error));
});

// Rezervasyon
reservationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const resData = {
        date: document.getElementById('res-date').value,
        time: document.getElementById('res-time').value,
        people: document.getElementById('res-people').value,
        name: document.getElementById('res-name').value,
        phone: document.getElementById('res-phone').value,
        createdAt: new Date().toISOString()
    };
    addDoc(collection(db, 'reservations'), resData).then(() => {
        reservationForm.reset();
        alert('Rezervasyon eklendi!');
        loadReservations();
    }).catch((error) => console.error('Rezervasyon ekleme hatası:', error));
});

// Rezervasyonları Yükle
function loadReservations() {
    onSnapshot(collection(db, 'reservations'), (snapshot) => {
        reservationsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const res = doc.data();
            const resDiv = document.createElement('div');
            resDiv.innerHTML = `<p>${res.name} - ${res.date} ${res.time}</p>`;
            reservationsList.appendChild(resDiv);
        });
    });
}

// Ödeme Bölme
paymentSplitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = document.getElementById('payment-order-id').value;
    const splitType = document.getElementById('split-type').value;
    const splitValue = document.getElementById('split-value').value;
    // Basit simülasyon: Gerçekte daha karmaşık mantık ekle
    updateDoc(doc(db, 'orders', orderId), { splitType, splitValue, paid: true }).then(() => {
        alert('Ödeme bölündü!');
        loadPayments();
    }).catch((error) => console.error('Ödeme bölme hatası:', error));
});

// Ödemeleri Yükle
function loadPayments() {
    onSnapshot(collection(db, 'orders'), (snapshot) => {
        paymentsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const order = doc.data();
            if (!order.paid) {
                const payDiv = document.createElement('div');
                payDiv.innerHTML = `<p>Sipariş ${doc.id} - Ödenmemiş</p>`;
                paymentsList.appendChild(payDiv);
            }
        });
    });
}

// Raporlar
generateReport.addEventListener('click', () => {
    const date = reportDate.value;
    // Z Raporu simülasyonu
    reportContent.innerHTML = `<p>Z Raporu: ${date} için toplam satış 5000 TL</p>`;
});

generateSalesReport.addEventListener('click', () => {
    reportContent.innerHTML = `<p>Satış Raporu: Günlük ciro 3000 TL</p>`;
});

generateInventoryReport.addEventListener('click', () => {
    reportContent.innerHTML = `<p>Stok Raporu: Kıyma 50 kg kaldı</p>`;
});

downloadPdf.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(reportContent.innerText, 10, 10);
    doc.save('rapor.pdf');
});

// Kasa Aç
cashForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const balance = document.getElementById('initial-balance').value;
    addDoc(collection(db, 'cashRegister'), { balance: parseFloat(balance), openedAt: new Date().toISOString() }).then(() => {
        alert('Kasa açıldı!');
        closeModal(cashModal);
    }).catch((error) => console.error('Kasa açma hatası:', error));
});

// Mutfak Yönetimi
function loadKitchenOrders() {
    onSnapshot(collection(db, 'orders'), (snapshot) => {
        kitchenOrdersList.innerHTML = '';
        snapshot.forEach((doc) => {
            const order = doc.data();
            if (order.status !== 'Hazır') {
                const orderDiv = document.createElement('div');
                orderDiv.innerHTML = `
                    <p>Sipariş ${doc.id} - ${order.status}</p>
                    <button onclick="markOrderReady('${doc.id}')">Hazır</button>
                `;
                kitchenOrdersList.appendChild(orderDiv);
            }
        });
    });
}

window.markOrderReady = (id) => {
    updateDoc(doc(db, 'orders', id), { status: 'Hazır' }).then(() => loadKitchenOrders());
};

// Stok Yönetimi
addInventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemData = {
        name: document.getElementById('item-name').value,
        quantity: parseFloat(document.getElementById('item-quantity').value),
        cost: parseFloat(document.getElementById('item-cost').value),
        createdAt: new Date().toISOString()
    };
    addDoc(collection(db, 'inventory'), itemData).then(() => {
        addInventoryForm.reset();
        alert('Malzeme eklendi!');
        loadInventory();
    }).catch((error) => console.error('Stok ekleme hatası:', error));
});

// Stok Yükle
function loadInventory() {
    onSnapshot(collection(db, 'inventory'), (snapshot) => {
        inventoryList.innerHTML = '';
        snapshot.forEach((doc) => {
            const item = doc.data();
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = `<p>${item.name} - ${item.quantity} adet - Maliyet: ${item.cost} TL</p>`;
            inventoryList.appendChild(itemDiv);
        });
    });
}

// CRM
addCustomerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const customerData = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        email: document.getElementById('customer-email').value,
        createdAt: new Date().toISOString()
    };
    addDoc(collection(db, 'customers'), customerData).then(() => {
        addCustomerForm.reset();
        alert('Müşteri eklendi!');
        loadCustomers();
    }).catch((error) => console.error('Müşteri ekleme hatası:', error));
});

// Müşterileri Yükle
function loadCustomers() {
    onSnapshot(collection(db, 'customers'), (snapshot) => {
        customersList.innerHTML = '';
        snapshot.forEach((doc) => {
            const customer = doc.data();
            const customerDiv = document.createElement('div');
            customerDiv.innerHTML = `<p>${customer.name} - ${customer.phone}</p>`;
            customersList.appendChild(customerDiv);
        });
    });
}
