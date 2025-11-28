// Firebase Entegrasyonu
import { db } from './firebase.js'; // db nesnesini firebase.js'den alıyoruz
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyBRcHElPziOGJd7Q8rCcIluLZ2XnI9j4wE",
    authDomain: "restorant-8e71c.firebaseapp.com",
    projectId: "restorant-8e71c",
    storageBucket: "restorant-8e71c.firebasestorage.app",
    messagingSenderId: "149835762840",
    appId: "1:149835762840:web:f8f053d46011bc693a94ed"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Menü Öğelerini Yükle
function loadMenuItems() {
    const grids = {
        baslangiclar: document.getElementById('baslangiclar-grid'),
        salatalar: document.getElementById('salatalar-grid'),
        kahvaltilar: document.getElementById('kahvaltilar-grid'),
        denizurunleri: document.getElementById('denizurunleri-grid'),
        pizzalar: document.getElementById('pizzalar-grid'),
        burgerler: document.getElementById('burgerler-grid'),
        icecekler: document.getElementById('icecekler-grid'),
        corbalar: document.getElementById('corbalar-grid'),
        kebaplar: document.getElementById('kebaplar-grid'),
        makarnalar: document.getElementById('makarnalar-grid'),
        mexicanmutfagi: document.getElementById('mexicanmutfagi-grid'),
        pidecesitleri: document.getElementById('pide-cesitleri-grid'),
        sandiviclervetostlar: document.getElementById('sandiviclervetostlar-grid'),
        steakler: document.getElementById('steakler-grid'),
        tavukyemekleri: document.getElementById('tavukyemekleri-grid'),
    };

    onSnapshot(collection(db, "menuItems"), (snapshot) => {
        Object.values(grids).forEach(grid => grid.innerHTML = '');
        if (snapshot.empty) {
            Object.values(grids).forEach(grid => {
                grid.innerHTML = '<div class="no-data">Menü öğeleri bulunamadı. Lütfen Firebase\'de veri ekleyin.</div>';
            });
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name && data.price && data.category && data.image) {
                const item = { id: doc.id, ...data };
                const grid = grids[item.category] || grids['baslangiclar'];
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.setAttribute('data-id', item.id);
                menuItem.setAttribute('data-ingredients', item.ingredients || 'Malzemeler yok');
                menuItem.setAttribute('data-image', item.image);
                menuItem.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/64?text=Yüklenemedi';">
                    <div class="menu-item-details">
                        <div class="name">${item.name}</div>
                        <div class="price">${item.price} TL</div>
                    </div>
                    <button class="add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Sepete Ekle</button>
                `;
                grid.appendChild(menuItem);
            }
        });

        updateMenuFunctionality();
    }, (error) => {
        console.error("Firestore hatası:", error);
        Object.values(grids).forEach(grid => {
            grid.innerHTML = '<div class="no-data">Menü yüklenemedi. Hata: ' + error.message + '</div>';
        });
    });
}

// Menü İşlevselliğini Güncelle
function updateMenuFunctionality() {
    const filterButtons = document.querySelectorAll('.category-filter');
    const menuSections = document.querySelectorAll('.menu-section');
    const menuItems = document.querySelectorAll('.menu-item');
    const searchInput = document.getElementById('searchInput');

    // Kategori Filtresi
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            
            menuSections.forEach(section => {
                if (category === 'all') {
                    section.classList.remove('hidden');
                } else {
                    section.classList.toggle('hidden', section.getAttribute('data-category') !== category);
                }
            });

            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Arama İşlevselliği
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();

        menuItems.forEach(item => {
            const itemName = item.querySelector('.menu-item-details .name').textContent.toLowerCase();
            const matches = itemName.includes(searchTerm);
            
            item.classList.toggle('hidden', !matches);
        });

        menuSections.forEach(section => section.classList.remove('hidden'));
    });

    // Modal İşlevselliği
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalIngredients = document.getElementById('modal-ingredients');
    const modalImage = document.getElementById('modal-image');
    const closeModal = document.getElementById('close-modal');
    const ratingStars = document.querySelectorAll('.star');
    const commentInput = document.getElementById('comment');
    const submitComment = document.getElementById('submit-comment');
    const commentList = document.getElementById('comment-list');
    let currentItemId = null;
    let currentRating = 0;

    function loadComments(itemId) {
        const comments = JSON.parse(localStorage.getItem(`comments_${itemId}`)) || [];
        commentList.innerHTML = '';
        comments.forEach(({ rating, comment }) => {
            const commentDiv = document.createElement('div');
            commentDiv.classList.add('border-b', 'border-gray-200', 'py-2');
            const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            commentDiv.innerHTML = `
                <div class="flex items-center mb-1">
                    <span class="comment-star">${stars}</span>
                    <span class="ml-2 text-sm text-gray-500">(${rating}/5)</span>
                </div>
                <p class="text-gray-600 text-sm">${comment}</p>
            `;
            commentList.appendChild(commentDiv);
        });
    }

    function saveComment(itemId, rating, comment) {
        const comments = JSON.parse(localStorage.getItem(`comments_${itemId}`)) || [];
        comments.push({ rating, comment });
        localStorage.setItem(`comments_${itemId}`, JSON.stringify(comments));
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) return;

            const name = item.querySelector('.menu-item-details .name').textContent;
            const ingredients = item.getAttribute('data-ingredients');
            const image = item.getAttribute('data-image');
            currentItemId = item.getAttribute('data-id');

            modalTitle.textContent = name;
            modalIngredients.textContent = ingredients;
            modalImage.src = image;
            modal.classList.remove('hidden');

            ratingStars.forEach(star => star.classList.remove('filled'));
            commentInput.value = '';
            currentRating = 0;

            loadComments(currentItemId);
        });
    });

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
            showNotification('Yorum ve puan kaydedildi!', 'success');
        } else {
            showNotification('Lütfen bir yorum yazın ve puan verin.', 'error');
        }
    });

    // Sepet İşlevselliği
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const cartPanel = document.getElementById('cart-panel');
    const cartToggle = document.getElementById('cart-toggle');

    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        cart.forEach((item, index) => {
            total += parseInt(item.price);
            const cartItem = document.createElement('div');
            cartItem.classList.add('cart-item');
            cartItem.innerHTML = `
                <span>${item.name}</span>
                <div>
                    <span>${item.price} TL</span>
                    <button class="remove-from-cart ml-2" data-index="${index}">Sil</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        cartTotal.textContent = `Toplam: ${total} TL`;
        localStorage.setItem('cart', JSON.stringify(cart));
        checkoutButton.disabled = cart.length === 0;
    }

    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const price = button.getAttribute('data-price');

            cart.push({ id, name, price });
            updateCart();

            showNotification(`${name} sepete eklendi!`, 'success');
        });
    });

    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-from-cart')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            const removedItem = cart[index].name;
            cart.splice(index, 1);
            updateCart();

            showNotification(`${removedItem} sepetten çıkarıldı!`, 'error');
        }
    });

    // Ödeme Modal İşlevselliği
    const paymentModal = document.getElementById('payment-modal');
    const closePaymentModal = document.getElementById('close-payment-modal');
    const paymentOptions = document.querySelectorAll('.payment-option');

    checkoutButton.addEventListener('click', () => {
        if (cart.length > 0) paymentModal.classList.remove('hidden');
    });

    closePaymentModal.addEventListener('click', () => paymentModal.classList.add('hidden'));
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.classList.add('hidden');
    });

    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            const method = option.querySelector('h3').textContent;
            showNotification(`Ödeme yöntemi seçildi: ${method}. İşleminiz tamamlandı!`, 'success');
            cart = [];
            updateCart();
            paymentModal.classList.add('hidden');
        });
    });

    // Cart Toggle Functionality
    cartToggle.addEventListener('click', () => {
        cartPanel.classList.toggle('active');
        if (!cartPanel.classList.contains('active')) {
            setTimeout(() => cartPanel.classList.add('hidden'), 300);
        } else {
            cartPanel.classList.remove('hidden');
        }
    });

    // Bildirim Fonksiyonu
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-5 right-5 px-4 py-2 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
}

// Sayfa yüklendiğinde menü öğelerini yükle
window.addEventListener('load', loadMenuItems);