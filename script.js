import { app, db } from './firebase.js';
import { collection, onSnapshot, addDoc, Timestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentViewMode = 'normal';
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// QR kod ile masa numarasını alma
function getTableNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('table') || '1';
}

// Sepet güncelleme fonksiyonu (optimized with DocumentFragment)
function updateCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (!cartItemsContainer || !cartTotal || !checkoutButton) return;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    let total = 0;
    
    cart.forEach((item, index) => {
        total += parseFloat(item.price) || 0;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name + 
            (item.customization && item.customization !== 'Özelleştirme yok' 
                ? ` (Özelleştirme: ${item.customization})` : '');
        
        const priceDiv = document.createElement('div');
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${item.price} TL`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-from-cart';
        removeBtn.setAttribute('data-index', index);
        removeBtn.textContent = 'Sil';
        
        priceDiv.appendChild(priceSpan);
        priceDiv.appendChild(removeBtn);
        
        cartItem.appendChild(nameSpan);
        cartItem.appendChild(priceDiv);
        fragment.appendChild(cartItem);
    });
    
    // Batch DOM update
    cartItemsContainer.innerHTML = '';
    cartItemsContainer.appendChild(fragment);
    
    cartTotal.textContent = `Toplam: ${total} TL`;
    if (cartSummary) {
        cartSummary.textContent = `Sepet: ${cart.length} Ürün - ${total} TL`;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    checkoutButton.disabled = cart.length === 0;
}

// Menü öğelerini Firestore'dan yükle
function loadMenuItems() {
    const allMenuGrid = document.getElementById('all-menu-grid');
    const galleryMenuGrid = document.getElementById('gallery-menu-grid');

    onSnapshot(collection(db, "menuItems"), (querySnapshot) => {
        allMenuGrid.innerHTML = '';
        galleryMenuGrid.innerHTML = '';
        
        if (querySnapshot.empty) {
            showNotification('Menü öğeleri bulunamadı. Lütfen Firebase\'de veri ekleyin.', 'error');
            return;
        }

        // Use DocumentFragment for better performance
        const normalFragment = document.createDocumentFragment();
        const galleryFragment = document.createDocumentFragment();
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name && data.price && data.category && data.image) {
                const item = { id: doc.id, ...data };
                
                // Normal mod için küçük kart
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.setAttribute('data-id', item.id);
                menuItem.setAttribute('data-category', item.category);
                menuItem.setAttribute('data-ingredients', item.ingredients || 'Malzemeler belirtilmemiş');
                menuItem.setAttribute('data-image', item.image);
                menuItem.setAttribute('data-name', item.name); // Add for search optimization
                menuItem.setAttribute('data-price', item.price);
                menuItem.innerHTML = `
                    <div class="item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300x180?text=Resim+Yok';">
                    </div>
                    <div class="item-content">
                        <div class="menu-item-details">
                            <div class="item-name">${item.name}</div>
                            <div class="item-description">${item.description || 'Lezzetli bir seçim'}</div>
                            <div class="item-price">${item.price} TL</div>
                        </div>
                        <button class="add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-category="${item.category}">Sepete Ekle</button>
                    </div>
                `;
                normalFragment.appendChild(menuItem);

                // Gallery mod için büyük resim
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.setAttribute('data-id', item.id);
                galleryItem.setAttribute('data-category', item.category);
                galleryItem.setAttribute('data-ingredients', item.ingredients || 'Malzemeler belirtilmemiş');
                galleryItem.setAttribute('data-image', item.image);
                galleryItem.setAttribute('data-name', item.name); // Add for search optimization
                galleryItem.setAttribute('data-price', item.price);
                galleryItem.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/800x400?text=Resim+Yok';">
                    <div class="gallery-overlay">
                        <div class="gallery-info">
                            <div>
                                <div class="gallery-name">${item.name}</div>
                                <div class="gallery-price">${item.price} TL</div>
                            </div>
                            <button class="gallery-add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-category="${item.category}">Sepete Ekle</button>
                        </div>
                    </div>
                `;
                galleryFragment.appendChild(galleryItem);
            }
        });

        allMenuGrid.appendChild(normalFragment);
        galleryMenuGrid.appendChild(galleryFragment);

        updateMenuFunctionality();
    });
}

// Tüm menü işlevselliğini güncelle (optimized - only setup once)
let menuFunctionalitySetup = false;
function updateMenuFunctionality() {
    // Prevent duplicate event listener setup
    if (menuFunctionalitySetup) {
        setupCategoryFilter(); // Re-setup category filter for new items
        return;
    }
    menuFunctionalitySetup = true;
    
    setupCategoryFilter();
    setupSearch();
    setupViewToggle();
    setupModal();
    setupCart();
    setupPayment();
}

// Kategori filtreleme (optimized with event delegation)
let categoryFilterSetup = false;
function setupCategoryFilter() {
    // Use event delegation to prevent duplicate listeners
    if (categoryFilterSetup) return;
    categoryFilterSetup = true;
    
    const categoryContainer = document.querySelector('.category-filters') || document.body;
    categoryContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.category-btn');
        if (!button) return;
        
        e.preventDefault();
        const category = button.getAttribute('data-category');
        const filterButtons = document.querySelectorAll('.category-btn');
        
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const allItems = document.querySelectorAll('.menu-item, .gallery-item');
        allItems.forEach(item => {
            if (category === 'all') {
                item.classList.remove('hidden');
            } else {
                const itemCategory = item.getAttribute('data-category');
                item.classList.toggle('hidden', itemCategory !== category);
            }
        });
    });
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Arama işlevi (optimized with debouncing)
function setupSearch() {
    const searchInput = document.querySelector('.search-bar');
    if (!searchInput) return;
    
    const performSearch = debounce((searchTerm) => {
        const allItems = document.querySelectorAll('.menu-item, .gallery-item');
        const term = searchTerm.toLowerCase();
        
        allItems.forEach(item => {
            // Use data attributes for better performance
            const itemName = item.getAttribute('data-name')?.toLowerCase() || '';
            item.classList.toggle('hidden', !itemName.includes(term));
        });
    }, 300); // 300ms debounce delay
    
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });
}

// Görünüm modu değiştirme
function setupViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn');
    const normalContainer = document.getElementById('normal-menu-container');
    const galleryContainer = document.getElementById('gallery-menu-container');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');
            
            viewButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (view === 'normal') {
                normalContainer.classList.remove('hidden');
                galleryContainer.classList.add('hidden');
                currentViewMode = 'normal';
            } else {
                normalContainer.classList.add('hidden');
                galleryContainer.classList.remove('hidden');
                currentViewMode = 'gallery';
            }
        });
    });
}

// Modal işlevselliği
function setupModal() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalIngredients = document.getElementById('modal-ingredients');
    const modalImage = document.getElementById('modal-image');
    const modalCustomization = document.getElementById('modal-customization');
    const closeModal = document.getElementById('close-modal');
    const ratingStars = document.querySelectorAll('#modal-rating .star');
    const commentInput = document.getElementById('comment');
    const submitComment = document.getElementById('submit-comment');
    const commentList = document.getElementById('comment-list');
    const modalAddToCart = document.getElementById('modal-add-to-cart');
    
    let currentItemId = null;
    let currentRating = 0;
    let currentItem = null;

    // Tıklama event'larını hem normal hem gallery item'lar için ekle
    function setupItemClickEvents() {
        const allItems = document.querySelectorAll('.menu-item, .gallery-item');
        allItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-to-cart') || e.target.classList.contains('gallery-add-to-cart')) return;
                
                currentItemId = item.getAttribute('data-id');
                currentItem = {
                    id: currentItemId,
                    name: item.classList.contains('gallery-item') ? 
                        item.querySelector('.gallery-name').textContent : 
                        item.querySelector('.item-name').textContent,
                    price: parseInt(item.classList.contains('gallery-item') ? 
                        item.querySelector('.gallery-price').textContent.replace(' TL', '') : 
                        item.querySelector('.item-price').textContent.replace(' TL', '')),
                    image: item.getAttribute('data-image'),
                    ingredients: item.getAttribute('data-ingredients')
                };
                
                modalTitle.textContent = currentItem.name;
                modalIngredients.textContent = currentItem.ingredients;
                modalImage.src = currentItem.image;
                modalCustomization.value = '';
                modal.classList.remove('hidden');
                ratingStars.forEach(star => star.classList.remove('filled'));
                commentInput.value = '';
                currentRating = 0;
                loadComments(currentItemId);
            });
        });
    }

    setupItemClickEvents();

    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-value'));
            ratingStars.forEach(s => {
                s.classList.toggle('filled', parseInt(s.getAttribute('data-value')) <= currentRating);
            });
        });
    });

    submitComment.addEventListener('click', () => {
        const comment = commentInput.value.trim();
        if (comment && currentRating > 0 && currentItemId) {
            saveComment(currentItemId, currentRating, comment);
            loadComments(currentItemId);
            commentInput.value = '';
            ratingStars.forEach(star => star.classList.remove('filled'));
            currentRating = 0;
            showNotification(`${currentItem.name} için yorum ve puan kaydedildi!`, 'success');
        } else {
            showNotification('Lütfen bir yorum yazın ve puan verin.', 'error');
        }
    });

    modalAddToCart.addEventListener('click', () => {
        if (!currentItem) return;
        const customization = modalCustomization.value.trim();
        const itemWithCustomization = { 
            ...currentItem, 
            customization: customization || 'Özelleştirme yok'
        };
        cart.push(itemWithCustomization);
        updateCart();
        showNotification(`${currentItem.name} sepete eklendi!`, 'success');
        modal.classList.add('hidden');
    });
}

// Yorum işlevleri
function loadComments(itemId) {
    const comments = JSON.parse(localStorage.getItem(`comments_${itemId}`)) || [];
    const commentList = document.getElementById('comment-list');
    commentList.innerHTML = '';
    
    comments.forEach(({ rating, comment }) => {
        const commentDiv = document.createElement('div');
        commentDiv.style.padding = '10px';
        commentDiv.style.borderBottom = '1px solid var(--border)';
        commentDiv.style.marginBottom = '10px';
        
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        commentDiv.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <span class="comment-star">${stars}</span>
                <span style="margin-left: 8px; font-size: 12px; color: var(--text-light);">(${rating}/5)</span>
            </div>
            <p style="color: var(--text-dark); font-size: 14px;">${comment}</p>
        `;
        commentList.appendChild(commentDiv);
    });
}

function saveComment(itemId, rating, comment) {
    const comments = JSON.parse(localStorage.getItem(`comments_${itemId}`)) || [];
    comments.push({ rating, comment });
    localStorage.setItem(`comments_${itemId}`, JSON.stringify(comments));
}

// Sepet işlevselliği
function setupCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const cartPanel = document.getElementById('cart-panel');
    const cartToggle = document.getElementById('cart-toggle');
    const cartSummary = document.querySelector('.cart-summary');

    // Sepete ekleme butonları için event listener'lar
    function setupAddToCartEvents() {
        const addToCartButtons = document.querySelectorAll('.add-to-cart, .gallery-add-to-cart');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name');
                const price = parseInt(button.getAttribute('data-price'));
                const category = button.getAttribute('data-category');
                cart.push({ id, name, price, category, customization: 'Özelleştirme yok' });
                updateCart();
                showNotification(`${name} sepete eklendi!`, 'success');
            });
        });
    }

    setupAddToCartEvents();

    cartToggle.addEventListener('click', () => {
        cartPanel.classList.toggle('active');
        if (cartPanel.classList.contains('active')) {
            cartPanel.classList.remove('hidden');
        } else {
            setTimeout(() => cartPanel.classList.add('hidden'), 500);
        }
    });

    // Sepet silme butonları için event listener ekle
    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-from-cart')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            const removedItem = cart[index].name;
            cart.splice(index, 1);
            updateCart();
            showNotification(`${removedItem} sepetten çıkarıldı!`, 'error');
        }
    });

    updateCart();
}

// ============================================================
// 📍 KONUM (GPS) AYARLARI
// ============================================================
const RESTAURANT_LAT = 35.19991185959213;
const RESTAURANT_LNG = 33.359793531692866;
const MAX_DISTANCE_METERS = 100; // İzin verilen maksimum uzaklık (metre)

// İki nokta arasındaki mesafeyi ölçen formül (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Dünyanın yarıçapı (metre cinsinden)
    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const df = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(df / 2) * Math.sin(df / 2) +
              Math.cos(f1) * Math.cos(f2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Metre cinsinden mesafe döner
}

// ============================================================
// 💳 GÜVENLİ ÖDEME FONKSİYONU (GPS KONTROLLÜ)
// ============================================================
function setupPayment() {
    const paymentModal = document.getElementById('payment-modal');
    const closePaymentModal = document.getElementById('close-payment-modal');
    const paymentOptions = document.querySelectorAll('.payment-option');
    const checkoutButton = document.getElementById('checkout-button');

    // "QR ile Ödeme" ve "Kart ile Ödeme" seçeneklerini pasif yap (İsteğe bağlı)
    paymentOptions.forEach(option => {
        const title = option.querySelector('h3').textContent.trim();
        if (title === "QR ile Ödeme" || title === "Kart ile Ödeme") {
            option.classList.add("disabled");
            option.style.pointerEvents = "none";
            option.innerHTML += "<p style='color:red;font-weight:bold;font-size:12px;'>Yakında!</p>";
        }
    });

    // "Satın Al" butonuna basınca modalı aç
    checkoutButton.addEventListener('click', () => {
        if (cart.length > 0) paymentModal.classList.remove('hidden');
    });

    // Modalı kapatma işlemleri
    closePaymentModal.addEventListener('click', () => paymentModal.classList.add('hidden'));
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.classList.add('hidden');
    });

    // ÖDEME SEÇENEKLERİNE TIKLANINCA ÇALIŞAN KISIM
    paymentOptions.forEach(option => {
        option.addEventListener('click', async () => {
            // Eğer seçenek pasifse işlem yapma
            if (option.classList.contains('disabled')) return;

            const method = option.querySelector('h3').textContent;

            // 1. SEPET KONTROLÜ
            if (cart.length === 0) {
                paymentModal.classList.add('hidden');
                return;
            }

            // 2. MASA NUMARASI KONTROLÜ
            const tableNumber = getTableNumber();
            if (!tableNumber || tableNumber === '1' || tableNumber === null) {
                showNotification('Lütfen geçerli bir masa numarası seçin!', 'error');
                paymentModal.classList.add('hidden');
                return;
            }

            // 3. 📍 KONUM KONTROLÜ BAŞLIYOR
            if (!navigator.geolocation) {
                alert("Tarayıcınız konum servisini desteklemiyor. Sipariş verilemedi.");
                return;
            }

            showNotification("📍 Konum doğrulanıyor, lütfen bekleyin...", "warning");

            navigator.geolocation.getCurrentPosition(async (position) => {
                // --- KONUM ALINDI, MESAFE HESAPLANIYOR ---
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                const distance = calculateDistance(userLat, userLng, RESTAURANT_LAT, RESTAURANT_LNG);
                console.log(`Müşteri Konumu: ${userLat}, ${userLng}`);
                console.log(`Mesafe: ${Math.floor(distance)} metre`);

                // --- MESAFE KONTROLÜ ---
                if (distance > MAX_DISTANCE_METERS) {
                    alert(`⛔ UYARI: Restorandan çok uzaktasınız!\n\nTespit edilen mesafe: ${Math.floor(distance)} metre.\nSipariş vermek için restoranda olmalısınız.`);
                    return; // BURADA DUR! Sipariş gönderme.
                }

                // --- MESAFE UYGUNSA SİPARİŞİ GÖNDER ---
                try {
                    const items = cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: parseFloat(item.price),
                        qty: 1, // Adet bilgisi eklendi
                        category: item.category || "Diğer", // Yazıcı için kategori önemli
                        note: item.customization !== 'Özelleştirme yok' ? item.customization : ""
                    }));

                    const total = items.reduce((sum, item) => sum + item.price, 0);
                    
                    const orderData = {
                        items,
                        total,
                        totalPrice: total, // Yazıcı uyumluluğu için
                        status: 'Hazırlanıyor',
                        paid: false,
                        isPaid: false, // Yazıcı uyumluluğu için
                        isPrinted: false, // Yazıcı için yeni eklendi
                        createdAt: Timestamp.now(),
                        paymentMethod: method,
                        source: 'index.html',
                        tableNumber: parseInt(tableNumber),
                        tableNo: parseInt(tableNumber) // Yazıcı uyumluluğu için
                    };

                    // Offline kontrolü
                    if (!navigator.onLine) {
                        let pendingOrders = JSON.parse(localStorage.getItem("pendingOrders")) || [];
                        pendingOrders.push(orderData);
                        localStorage.setItem("pendingOrders", JSON.stringify(pendingOrders));
                        showNotification("İnternet yok, sipariş hafızaya alındı!", "warning");
                    } else {
                        // Firestore'a kaydet
                        await addDoc(collection(db, 'orders'), orderData);
                        showNotification(`✅ Siparişiniz Mutfağa İletildi!`, 'success');
                    }
                    
                    // Temizlik
                    cart = [];
                    updateCart();
                    paymentModal.classList.add('hidden');

                } catch (error) {
                    console.error('Sipariş hatası:', error);
                    showNotification('Sipariş gönderilemedi: ' + error.message, 'error');
                }

            }, (error) => {
                // --- KONUM ALINAMADIYSA ---
                console.error("Konum hatası:", error);
                if (error.code === 1) {
                    alert("⛔ KONUM İZNİ REDDEDİLDİ!\nSipariş verebilmek için tarayıcı ayarlarından konum izni vermelisiniz.");
                } else {
                    alert("⛔ Konumunuz alınamadı. Lütfen GPS'inizi açıp tekrar deneyin.");
                }
            }, {
                enableHighAccuracy: true, // Yüksek hassasiyet (GPS) kullan
                timeout: 10000,           // 10 saniye bekle
                maximumAge: 0             // Önbellekten eski konum kullanma
            });
        });
    });
}

// Bildirim fonksiyonu
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// Masa seçim modal'ı
let selectedTableForModal = null;
const tableSelectModal = document.getElementById('table-select-modal');
const tableNumberDisplay = document.getElementById('table-number-display');
const tablesListDiv = document.getElementById('tables-list');
const confirmTableBtn = document.getElementById('confirm-table-selection');
const closeTableModal = document.getElementById('close-table-modal');

// Masa numarasına tıklanınca modal aç
if (tableNumberDisplay) {
    tableNumberDisplay.addEventListener('click', () => {
        loadTablesForSelection();
        tableSelectModal.classList.remove('hidden');
    });
}

// Modal kapatma
if (closeTableModal) {
    closeTableModal.addEventListener('click', () => {
        tableSelectModal.classList.add('hidden');
        selectedTableForModal = null;
        confirmTableBtn.style.display = 'none';
    });
}

// Modal dışına tıklanınca kapat
if (tableSelectModal) {
    tableSelectModal.addEventListener('click', (e) => {
        if (e.target === tableSelectModal) {
            tableSelectModal.classList.add('hidden');
            selectedTableForModal = null;
            confirmTableBtn.style.display = 'none';
        }
    });
}

// Masaları yükle
async function loadTablesForSelection() {
    if (!tablesListDiv) return;
    
    try {
        tablesListDiv.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1; padding: 20px;">Yükleniyor...</p>';
        
        const tablesSnapshot = await getDocs(query(collection(db, 'tables'), orderBy('number', 'asc')));
        
        if (tablesSnapshot.empty) {
            tablesListDiv.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1; padding: 20px;">Henüz masa oluşturulmamış.</p>';
            return;
        }
        
        tablesListDiv.innerHTML = '';
        const currentTable = parseInt(getTableNumber());
        
        tablesSnapshot.forEach((docSnap) => {
            const table = docSnap.data();
            const tableNumber = table.number;
            const isSelected = currentTable === tableNumber;
            const isOccupied = table.status === 'Dolu';
            
            const tableBtn = document.createElement('button');
            tableBtn.className = 'table-select-btn';
            tableBtn.style.cssText = `
                padding: 15px;
                border: 2px solid ${isSelected ? '#2c5530' : isOccupied ? '#e53e3e' : '#d1d5db'};
                border-radius: 8px;
                background: ${isSelected ? '#2c5530' : isOccupied ? '#fee2e2' : '#f9fafb'};
                color: ${isSelected ? 'white' : isOccupied ? '#e53e3e' : '#374151'};
                font-size: 16px;
                font-weight: ${isSelected ? 'bold' : 'normal'};
                cursor: ${isOccupied ? 'not-allowed' : 'pointer'};
                transition: all 0.2s;
                position: relative;
            `;
            
            tableBtn.innerHTML = `
                <div style="font-size: 18px; font-weight: bold;">${tableNumber}</div>
                <div style="font-size: 12px; margin-top: 5px;">${table.status || 'Boş'}</div>
                ${isSelected ? '<div style="position: absolute; top: 5px; right: 5px; font-size: 20px;">✓</div>' : ''}
            `;
            
            if (!isOccupied) {
                tableBtn.addEventListener('click', () => {
                    // Önceki seçimi temizle
                    document.querySelectorAll('.table-select-btn').forEach(btn => {
                        if (btn !== tableBtn) {
                            btn.style.background = '#f9fafb';
                            btn.style.color = '#374151';
                            btn.style.borderColor = '#d1d5db';
                            btn.style.fontWeight = 'normal';
                            const lastDiv = btn.querySelector('div:last-child');
                            if (lastDiv && lastDiv.innerHTML.includes('✓')) {
                                lastDiv.innerHTML = lastDiv.innerHTML.replace(/<div[^>]*>✓<\/div>/, '');
                            }
                        }
                    });
                    
                    // Yeni seçimi işaretle
                    tableBtn.style.background = '#2c5530';
                    tableBtn.style.color = 'white';
                    tableBtn.style.borderColor = '#2c5530';
                    tableBtn.style.fontWeight = 'bold';
                    
                    const lastDiv = tableBtn.querySelector('div:last-child');
                    if (lastDiv && !lastDiv.innerHTML.includes('✓')) {
                        lastDiv.innerHTML = lastDiv.innerHTML + '<div style="position: absolute; top: 5px; right: 5px; font-size: 20px;">✓</div>';
                    }
                    
                    selectedTableForModal = tableNumber;
                    document.getElementById('selected-table-num').textContent = tableNumber;
                    confirmTableBtn.style.display = 'block';
                });
            }
            
            tablesListDiv.appendChild(tableBtn);
        });
    } catch (error) {
        console.error('Masalar yüklenirken hata:', error);
        let errorMessage = 'Masalar yüklenirken bir hata oluştu.';
        if (error.code === 'permission-denied') {
            errorMessage = 'İzin hatası: Firestore rules güncellenmemiş olabilir. Lütfen Firebase Console\'dan rules\'ı deploy edin.';
        }
        tablesListDiv.innerHTML = `<p style="text-align: center; color: #e53e3e; grid-column: 1 / -1; padding: 20px;">${errorMessage}</p>`;
    }
}

// Masa seçimini onayla
if (confirmTableBtn) {
    confirmTableBtn.addEventListener('click', () => {
        if (selectedTableForModal) {
            // URL'yi güncelle
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('table', selectedTableForModal);
            window.history.pushState({}, '', newUrl);
            
            // Masa numarasını güncelle
            document.getElementById('table-number').textContent = selectedTableForModal;
            
            // Modal'ı kapat
            tableSelectModal.classList.add('hidden');
            const tempTable = selectedTableForModal;
            selectedTableForModal = null;
            confirmTableBtn.style.display = 'none';
            
            showNotification(`Masa #${tempTable} seçildi!`, 'success');
        }
    });
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Prevent default browser error handling
    event.preventDefault();
});

// Sayfa yüklendiğinde menü öğelerini yükle
window.addEventListener('load', () => {
    document.getElementById('table-number').textContent = getTableNumber();
    loadMenuItems();
});
