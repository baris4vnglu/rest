// Optimized version of index.html script
// This file contains optimized JavaScript for better performance

// Import Firebase from shared config (if using same project)
// import { db } from './firebase.js';
// import { collection, onSnapshot, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Or use inline config if different project
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdJNK1JaNXQ_4BJorQpbLZZeTsBhbpJoU",
    authDomain: "osman-8ae42.firebaseapp.com",
    projectId: "osman-8ae42",
    storageBucket: "osman-8ae42.firebasestorage.app",
    messagingSenderId: "889948550440",
    appId: "1:889948550440:web:99eb79aef16fd193810c1d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========== STATE MANAGEMENT ==========
let currentViewMode = 'normal';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let menuItems = []; // Cache menu items
let unsubscribeMenuItems = null; // Store unsubscribe function

// ========== DOM ELEMENT CACHE ==========
const DOMCache = {
    // Lazy getters to avoid querying DOM before it's ready
    get allMenuGrid() { return document.getElementById('all-menu-grid'); },
    get galleryMenuGrid() { return document.getElementById('gallery-menu-grid'); },
    get cartItemsContainer() { return document.getElementById('cart-items'); },
    get cartTotal() { return document.getElementById('cart-total'); },
    get checkoutButton() { return document.getElementById('checkout-button'); },
    get cartSummary() { return document.querySelector('.cart-summary'); },
    get cartPanel() { return document.getElementById('cart-panel'); },
    get cartToggle() { return document.getElementById('cart-toggle'); },
    get searchInput() { return document.querySelector('.search-bar'); },
    get normalContainer() { return document.getElementById('normal-menu-container'); },
    get galleryContainer() { return document.getElementById('gallery-menu-container'); },
    get modal() { return document.getElementById('modal'); },
    get modalTitle() { return document.getElementById('modal-title'); },
    get modalIngredients() { return document.getElementById('modal-ingredients'); },
    get modalImage() { return document.getElementById('modal-image'); },
    get modalCustomization() { return document.getElementById('modal-customization'); },
    get closeModal() { return document.getElementById('close-modal'); },
    get commentInput() { return document.getElementById('comment'); },
    get submitComment() { return document.getElementById('submit-comment'); },
    get commentList() { return document.getElementById('comment-list'); },
    get modalAddToCart() { return document.getElementById('modal-add-to-cart'); },
    get paymentModal() { return document.getElementById('payment-modal'); },
    get closePaymentModal() { return document.getElementById('close-payment-modal'); },
    get tableNumber() { return document.getElementById('table-number'); }
};

// ========== UTILITY FUNCTIONS ==========
function getTableNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('table') || '1';
}

// Debounce function for search
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

// Safe text content setter (prevents XSS)
function setTextContent(element, text) {
    if (element) {
        element.textContent = text;
    }
}

// Safe HTML setter with sanitization (basic)
function setSafeHTML(element, html) {
    if (!element) return;
    // For production, use a proper sanitization library like DOMPurify
    const temp = document.createElement('div');
    temp.textContent = html; // This escapes HTML
    element.innerHTML = temp.innerHTML; // For now, we'll use innerHTML but could improve
}

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'success') {
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
}

// ========== CART MANAGEMENT ==========
function updateCart() {
    const { cartItemsContainer, cartTotal, checkoutButton, cartSummary } = DOMCache;
    
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
    
    // Clear and append in one operation
    cartItemsContainer.innerHTML = '';
    cartItemsContainer.appendChild(fragment);
    
    setTextContent(cartTotal, `Toplam: ${total} TL`);
    if (cartSummary) {
        setTextContent(cartSummary, `Sepet: ${cart.length} Ürün - ${total} TL`);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    checkoutButton.disabled = cart.length === 0;
}

// ========== MENU ITEM CREATION (Optimized) ==========
function createMenuItemElement(item, isGallery = false) {
    const element = document.createElement('div');
    element.className = isGallery ? 'gallery-item' : 'menu-item';
    element.setAttribute('data-id', item.id);
    element.setAttribute('data-category', item.category);
    element.setAttribute('data-ingredients', item.ingredients || 'Malzemeler belirtilmemiş');
    element.setAttribute('data-image', item.image);
    element.setAttribute('data-name', item.name);
    element.setAttribute('data-price', item.price);
    
    if (isGallery) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.onerror = () => { img.src = 'https://via.placeholder.com/800x400?text=Resim+Yok'; };
        
        const overlay = document.createElement('div');
        overlay.className = 'gallery-overlay';
        
        const info = document.createElement('div');
        info.className = 'gallery-info';
        
        const infoDiv = document.createElement('div');
        const nameDiv = document.createElement('div');
        nameDiv.className = 'gallery-name';
        nameDiv.textContent = item.name;
        const priceDiv = document.createElement('div');
        priceDiv.className = 'gallery-price';
        priceDiv.textContent = `${item.price} TL`;
        
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(priceDiv);
        
        const addBtn = document.createElement('button');
        addBtn.className = 'gallery-add-to-cart';
        addBtn.setAttribute('data-id', item.id);
        addBtn.setAttribute('data-name', item.name);
        addBtn.setAttribute('data-price', item.price);
        addBtn.textContent = 'Sepete Ekle';
        
        info.appendChild(infoDiv);
        info.appendChild(addBtn);
        overlay.appendChild(info);
        
        element.appendChild(img);
        element.appendChild(overlay);
    } else {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'item-image';
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.onerror = () => { img.src = 'https://via.placeholder.com/300x180?text=Resim+Yok'; };
        imageDiv.appendChild(img);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'item-content';
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'menu-item-details';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'item-name';
        nameDiv.textContent = item.name;
        
        const descDiv = document.createElement('div');
        descDiv.className = 'item-description';
        descDiv.textContent = item.description || 'Lezzetli bir seçim';
        
        const priceDiv = document.createElement('div');
        priceDiv.className = 'item-price';
        priceDiv.textContent = `${item.price} TL`;
        
        detailsDiv.appendChild(nameDiv);
        detailsDiv.appendChild(descDiv);
        detailsDiv.appendChild(priceDiv);
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-to-cart';
        addBtn.setAttribute('data-id', item.id);
        addBtn.setAttribute('data-name', item.name);
        addBtn.setAttribute('data-price', item.price);
        addBtn.textContent = 'Sepete Ekle';
        
        contentDiv.appendChild(detailsDiv);
        contentDiv.appendChild(addBtn);
        
        element.appendChild(imageDiv);
        element.appendChild(contentDiv);
    }
    
    return element;
}

// ========== MENU LOADING (Optimized) ==========
function loadMenuItems() {
    const { allMenuGrid, galleryMenuGrid } = DOMCache;
    
    if (!allMenuGrid || !galleryMenuGrid) return;
    
    // Unsubscribe from previous listener if exists
    if (unsubscribeMenuItems) {
        unsubscribeMenuItems();
    }
    
    unsubscribeMenuItems = onSnapshot(
        collection(db, "menuItems"),
        (querySnapshot) => {
            menuItems = []; // Clear cache
            const normalFragment = document.createDocumentFragment();
            const galleryFragment = document.createDocumentFragment();
            
            if (querySnapshot.empty) {
                showNotification('Menü öğeleri bulunamadı. Lütfen Firebase\'de veri ekleyin.', 'error');
                allMenuGrid.innerHTML = '';
                galleryMenuGrid.innerHTML = '';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name && data.price && data.category && data.image) {
                    const item = { id: doc.id, ...data };
                    menuItems.push(item); // Cache items
                    
                    normalFragment.appendChild(createMenuItemElement(item, false));
                    galleryFragment.appendChild(createMenuItemElement(item, true));
                }
            });
            
            // Batch DOM updates
            allMenuGrid.innerHTML = '';
            galleryMenuGrid.innerHTML = '';
            allMenuGrid.appendChild(normalFragment);
            galleryMenuGrid.appendChild(galleryFragment);
            
            // Setup event listeners once (event delegation)
            setupEventDelegation();
        },
        (error) => {
            console.error('Menü yükleme hatası:', error);
            showNotification('Menü yüklenirken bir hata oluştu.', 'error');
        }
    );
}

// ========== EVENT DELEGATION (Optimized) ==========
function setupEventDelegation() {
    // Use event delegation instead of individual listeners
    // This prevents memory leaks and duplicate listeners
    
    // Category filter delegation
    const categoryContainer = document.querySelector('.category-filters') || document.body;
    categoryContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        
        e.preventDefault();
        const category = btn.getAttribute('data-category');
        const filterButtons = document.querySelectorAll('.category-btn');
        
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
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
    
    // Add to cart delegation (for both normal and gallery items)
    const menuContainer = document.querySelector('.menu-container') || document.body;
    menuContainer.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-to-cart, .gallery-add-to-cart');
        if (addBtn) {
            e.stopPropagation();
            const id = addBtn.getAttribute('data-id');
            const name = addBtn.getAttribute('data-name');
            const price = parseFloat(addBtn.getAttribute('data-price'));
            
            cart.push({ id, name, price, customization: 'Özelleştirme yok' });
            updateCart();
            showNotification(`${name} sepete eklendi!`, 'success');
            return;
        }
        
        // Menu item click for modal
        const menuItem = e.target.closest('.menu-item, .gallery-item');
        if (menuItem && !e.target.closest('button')) {
            openItemModal(menuItem);
        }
    });
    
    // View toggle delegation
    const viewContainer = document.querySelector('.view-toggle') || document.body;
    viewContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        if (!viewBtn) return;
        
        const view = viewBtn.getAttribute('data-view');
        const viewButtons = document.querySelectorAll('.view-btn');
        const { normalContainer, galleryContainer } = DOMCache;
        
        viewButtons.forEach(btn => btn.classList.remove('active'));
        viewBtn.classList.add('active');
        
        if (view === 'normal') {
            normalContainer?.classList.remove('hidden');
            galleryContainer?.classList.add('hidden');
            currentViewMode = 'normal';
        } else {
            normalContainer?.classList.add('hidden');
            galleryContainer?.classList.remove('hidden');
            currentViewMode = 'gallery';
        }
    });
}

// ========== MODAL MANAGEMENT ==========
let currentItemId = null;
let currentRating = 0;
let currentItem = null;

function openItemModal(menuItem) {
    const { modal, modalTitle, modalIngredients, modalImage, modalCustomization, closeModal, commentInput } = DOMCache;
    const ratingStars = document.querySelectorAll('#modal-rating .star');
    
    if (!modal) return;
    
    currentItemId = menuItem.getAttribute('data-id');
    const itemName = menuItem.getAttribute('data-name');
    const itemPrice = parseFloat(menuItem.getAttribute('data-price'));
    
    currentItem = {
        id: currentItemId,
        name: itemName,
        price: itemPrice,
        image: menuItem.getAttribute('data-image'),
        ingredients: menuItem.getAttribute('data-ingredients')
    };
    
    setTextContent(modalTitle, currentItem.name);
    setTextContent(modalIngredients, currentItem.ingredients);
    if (modalImage) modalImage.src = currentItem.image;
    if (modalCustomization) modalCustomization.value = '';
    if (commentInput) commentInput.value = '';
    
    ratingStars.forEach(star => star.classList.remove('filled'));
    currentRating = 0;
    
    modal.classList.remove('hidden');
    loadComments(currentItemId);
}

// Modal event listeners (setup once)
function setupModalEvents() {
    const { modal, closeModal, modalAddToCart, submitComment, modalCustomization } = DOMCache;
    const ratingStars = document.querySelectorAll('#modal-rating .star');
    
    if (!modal) return;
    
    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
    
    // Rating stars
    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-value'));
            ratingStars.forEach(s => {
                s.classList.toggle('filled', parseInt(s.getAttribute('data-value')) <= currentRating);
            });
        });
    });
    
    // Submit comment
    if (submitComment) {
        submitComment.addEventListener('click', () => {
            const { commentInput } = DOMCache;
            const comment = commentInput?.value.trim();
            
            if (comment && currentRating > 0 && currentItemId) {
                saveComment(currentItemId, currentRating, comment);
                loadComments(currentItemId);
                if (commentInput) commentInput.value = '';
                ratingStars.forEach(star => star.classList.remove('filled'));
                currentRating = 0;
                showNotification(`${currentItem?.name} için yorum ve puan kaydedildi!`, 'success');
            } else {
                showNotification('Lütfen bir yorum yazın ve puan verin.', 'error');
            }
        });
    }
    
    // Add to cart from modal
    if (modalAddToCart) {
        modalAddToCart.addEventListener('click', () => {
            if (!currentItem) return;
            const customization = modalCustomization?.value.trim() || 'Özelleştirme yok';
            const itemWithCustomization = { ...currentItem, customization };
            cart.push(itemWithCustomization);
            updateCart();
            showNotification(`${currentItem.name} sepete eklendi!`, 'success');
            modal.classList.add('hidden');
        });
    }
}

// ========== COMMENTS ==========
function loadComments(itemId) {
    const { commentList } = DOMCache;
    if (!commentList) return;
    
    const comments = JSON.parse(localStorage.getItem(`comments_${itemId}`)) || [];
    const fragment = document.createDocumentFragment();
    
    comments.forEach(({ rating, comment }) => {
        const commentDiv = document.createElement('div');
        commentDiv.style.cssText = 'padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 10px;';
        
        const starsDiv = document.createElement('div');
        starsDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px;';
        
        const starsSpan = document.createElement('span');
        starsSpan.className = 'comment-star';
        starsSpan.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        
        const ratingSpan = document.createElement('span');
        ratingSpan.style.cssText = 'margin-left: 8px; font-size: 12px; color: var(--text-light);';
        ratingSpan.textContent = `(${rating}/5)`;
        
        starsDiv.appendChild(starsSpan);
        starsDiv.appendChild(ratingSpan);
        
        const commentP = document.createElement('p');
        commentP.style.cssText = 'color: var(--text-dark); font-size: 14px;';
        commentP.textContent = comment;
        
        commentDiv.appendChild(starsDiv);
        commentDiv.appendChild(commentP);
        fragment.appendChild(commentDiv);
    });
    
    commentList.innerHTML = '';
    commentList.appendChild(fragment);
}

function saveComment(itemId, rating, comment) {
    const comments = JSON.parse(localStorage.getItem(`comments_${itemId}`)) || [];
    comments.push({ rating, comment });
    localStorage.setItem(`comments_${itemId}`, JSON.stringify(comments));
}

// ========== CART EVENTS ==========
function setupCartEvents() {
    const { cartToggle, cartPanel, cartItemsContainer, checkoutButton } = DOMCache;
    
    if (cartToggle && cartPanel) {
        cartToggle.addEventListener('click', () => {
            cartPanel.classList.toggle('active');
            if (cartPanel.classList.contains('active')) {
                cartPanel.classList.remove('hidden');
            } else {
                setTimeout(() => cartPanel.classList.add('hidden'), 500);
            }
        });
    }
    
    // Remove from cart delegation
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-from-cart');
            if (removeBtn) {
                const index = parseInt(removeBtn.getAttribute('data-index'));
                const removedItem = cart[index]?.name;
                if (removedItem) {
                    cart.splice(index, 1);
                    updateCart();
                    showNotification(`${removedItem} sepetten çıkarıldı!`, 'error');
                }
            }
        });
    }
    
    updateCart();
}

// ========== SEARCH (With Debouncing) ==========
function setupSearch() {
    const { searchInput } = DOMCache;
    if (!searchInput) return;
    
    const performSearch = debounce((searchTerm) => {
        const allItems = document.querySelectorAll('.menu-item, .gallery-item');
        const term = searchTerm.toLowerCase();
        
        allItems.forEach(item => {
            const itemName = item.getAttribute('data-name')?.toLowerCase() || '';
            item.classList.toggle('hidden', !itemName.includes(term));
        });
    }, 300); // 300ms debounce
    
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });
}

// ========== PAYMENT ==========
function setupPayment() {
    const { paymentModal, closePaymentModal, checkoutButton } = DOMCache;
    const paymentOptions = document.querySelectorAll('.payment-option');
    
    if (!checkoutButton) return;
    
    checkoutButton.addEventListener('click', () => {
        if (cart.length > 0 && paymentModal) {
            paymentModal.classList.remove('hidden');
        }
    });
    
    if (closePaymentModal && paymentModal) {
        closePaymentModal.addEventListener('click', () => paymentModal.classList.add('hidden'));
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) paymentModal.classList.add('hidden');
        });
    }
    
    paymentOptions.forEach(option => {
        option.addEventListener('click', async () => {
            const method = option.querySelector('h3')?.textContent;
            if (!method) return;
            
            if (cart.length === 0) {
                if (paymentModal) paymentModal.classList.add('hidden');
                return;
            }
            
            try {
                const items = cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: parseFloat(item.price)
                }));
                
                const total = items.reduce((sum, item) => sum + item.price, 0);
                const tableNumber = getTableNumber();
                
                const orderData = {
                    items,
                    total,
                    status: 'Hazırlanıyor',
                    createdAt: Timestamp.now(),
                    paymentMethod: method,
                    source: 'index.html'
                };
                
                if (tableNumber && tableNumber !== '1') {
                    orderData.tableNumber = parseInt(tableNumber);
                }
                
                await addDoc(collection(db, 'orders'), orderData);
                showNotification(`Siparişiniz alındı! Ödeme: ${method}`, 'success');
                
                cart = [];
                updateCart();
                if (paymentModal) paymentModal.classList.add('hidden');
            } catch (error) {
                console.error('Sipariş kaydetme hatası:', error);
                showNotification('Sipariş kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            }
        });
    });
}

// ========== INITIALIZATION ==========
function init() {
    // Set table number
    if (DOMCache.tableNumber) {
        setTextContent(DOMCache.tableNumber, getTableNumber());
    }
    
    // Setup all event listeners (once)
    setupModalEvents();
    setupCartEvents();
    setupSearch();
    setupPayment();
    
    // Load menu items
    loadMenuItems();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeMenuItems) {
        unsubscribeMenuItems();
    }
});

