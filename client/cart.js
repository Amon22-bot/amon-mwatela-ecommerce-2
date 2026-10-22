
/* =========================================================
   AM ELECTRONICS AND ACCESSORIES
   COMPLETE CART JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    "use strict";

    const CART_KEY = "amElectronicsCart";

    let cart = loadCart();

    /* =====================================================
       1. LOAD AND SAVE CART
       ===================================================== */

    function loadCart() {
        try {
            const savedCart = JSON.parse(localStorage.getItem(CART_KEY));

            if (!Array.isArray(savedCart)) {
                return [];
            }

            return savedCart
                .filter(item =>
                    item &&
                    item.name &&
                    Number.isFinite(Number(item.price)) &&
                    Number(item.price) >= 0
                )
                .map(item => ({
                    id: String(item.id || createProductId(item.name)),
                    name: String(item.name),
                    price: Number(item.price),
                    image: String(item.image || ""),
                    color: String(item.color || ""),
                    quantity: Math.max(
                        1,
                        Math.min(10000, Math.floor(Number(item.quantity) || 1))
                    )
                }));

        } catch (error) {
            console.error("Unable to load cart:", error);
            return [];
        }
    }

    function saveCart() {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            return true;
        } catch (error) {
            console.error("Unable to save cart:", error);
            showCartMessage("Unable to save your cart. Please check your browser storage.");
            return false;
        }
    }

    function createProductId(name) {
        return String(name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    /* =====================================================
       2. PRICE FORMATTING
       ===================================================== */

    function formatPrice(price) {
        return "KSh " + Number(price || 0).toLocaleString("en-KE", {
            maximumFractionDigits: 2
        });
    }

    /* =====================================================
       3. UPDATE NAVBAR CART COUNT
       ===================================================== */

    function updateCartCount() {
        const cartCountElements = document.querySelectorAll("#cartCount");

        const totalItems = cart.reduce((total, item) => {
            return total + item.quantity;
        }, 0);

        cartCountElements.forEach(element => {
            element.textContent = totalItems;
        });
    }

    /* =====================================================
       4. SAFE HTML ELEMENT CREATION
       ===================================================== */

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        return element;
    }

    /* =====================================================
       5. DISPLAY CART ITEMS
       ===================================================== */

    function displayCart() {

        const cartItemsContainer = document.getElementById("cartItems");
        const emptyCartMessage = document.getElementById("emptyCartMessage");

        // The product details and checkout pages do not necessarily
        // contain the cart items container.
        if (!cartItemsContainer) {
            updateCartCount();
            return;
        }

        cartItemsContainer
            .querySelectorAll(".cart-item")
            .forEach(item => item.remove());

        if (cart.length === 0) {

            if (emptyCartMessage) {
                emptyCartMessage.style.display = "block";
            }

            updateCartTotals();
            updateCartCount();
            return;
        }

        if (emptyCartMessage) {
            emptyCartMessage.style.display = "none";
        }

        cart.forEach((item, index) => {

            const cartItem = createElement("div", "cart-item");

            /* Product image */

            const imageContainer = createElement(
                "div",
                "cart-item-image"
            );

            if (item.image) {
                const image = createElement("img");

                image.src = item.image;
                image.alt = item.name;
                image.loading = "lazy";

                image.addEventListener("error", function () {
                    image.style.display = "none";
                });

                imageContainer.appendChild(image);
            }

            /* Product information */

            const details = createElement(
                "div",
                "cart-item-details"
            );

            const name = createElement("h3", "", item.name);

            const price = createElement(
                "p",
                "cart-item-price",
                formatPrice(item.price)
            );

            details.appendChild(name);
            details.appendChild(price);

            // Display the selected colour when one is available.
            if (item.color) {
                const color = createElement(
                    "p",
                    "cart-item-color",
                    "Colour: " + item.color
                );

                details.appendChild(color);
            }

            /* Quantity controls */

            const controls = createElement(
                "div",
                "cart-item-controls"
            );

            const minusButton = createElement(
                "button",
                "quantity-minus",
                "−"
            );

            minusButton.type = "button";
            minusButton.dataset.index = index;
            minusButton.setAttribute(
                "aria-label",
                "Decrease quantity of " + item.name
            );

            const quantity = createElement(
                "span",
                "cart-item-quantity",
                item.quantity
            );

            const plusButton = createElement(
                "button",
                "quantity-plus",
                "+"
            );

            plusButton.type = "button";
            plusButton.dataset.index = index;
            plusButton.setAttribute(
                "aria-label",
                "Increase quantity of " + item.name
            );

            const removeButton = createElement(
                "button",
                "remove-cart-item",
                "Remove"
            );

            removeButton.type = "button";
            removeButton.dataset.index = index;

            controls.appendChild(minusButton);
            controls.appendChild(quantity);
            controls.appendChild(plusButton);
            controls.appendChild(removeButton);

            details.appendChild(controls);

            /* Total for this product */

            const itemTotal = createElement(
                "div",
                "cart-item-total",
                formatPrice(item.price * item.quantity)
            );

            /* Assemble the cart item */

            cartItem.appendChild(imageContainer);
            cartItem.appendChild(details);
            cartItem.appendChild(itemTotal);

            cartItemsContainer.appendChild(cartItem);
        });

        updateCartTotals();
        updateCartCount();
    }

    /* =====================================================
       6. CALCULATE CART TOTALS
       ===================================================== */

    function updateCartTotals() {

        const subtotal = cart.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        const subtotalElement = document.getElementById("cartSubtotal");
        const totalElement = document.getElementById("cartTotal");
        const deliveryElement = document.getElementById("cartDelivery");

        if (subtotalElement) {
            subtotalElement.textContent = formatPrice(subtotal);
        }

        // Delivery has not yet been calculated, so the displayed
        // total represents the product subtotal only.
        if (totalElement) {
            totalElement.textContent = formatPrice(subtotal);
        }

        if (deliveryElement) {
            deliveryElement.textContent = "To be confirmed";
        }
    }

    /* =====================================================
       7. ADD A PRODUCT TO THE CART
       ===================================================== */

    function addToCart(button) {

        const productCard = button.closest(".product-card");

        const productName =
            button.dataset.product ||
            button.dataset.name ||
            productCard?.querySelector(".product-name")?.textContent.trim();

        const rawPrice =
            button.dataset.price ||
            productCard?.querySelector(".product-price")?.textContent;

        const productPrice = Number(
            String(rawPrice || "").replace(/[^\d.]/g, "")
        );

        const productImage =
            button.dataset.image ||
            productCard?.querySelector("img")?.getAttribute("src") ||
            "";

        const productColor = button.dataset.color || "";

        if (
            !productName ||
            !Number.isFinite(productPrice) ||
            productPrice < 0
        ) {
            showCartMessage("Product information is incomplete.");
            return;
        }

        // Refresh from storage before modifying the cart.
        cart = loadCart();

        const productId = button.dataset.id || createProductId(productName);

        // Products with different colours must remain separate.
        const existingItem = cart.find(item =>
            item.id === productId &&
            item.color === productColor
        );

        if (existingItem) {

            if (existingItem.quantity >= 10000) {
                showCartMessage("Maximum quantity reached.");
                return;
            }

            existingItem.quantity += 1;

        } else {

            cart.push({
                id: productId,
                name: productName,
                price: productPrice,
                image: productImage,
                color: productColor,
                quantity: 1
            });
        }

        if (!saveCart()) {
            cart = loadCart();
            return;
        }

        updateCartCount();
        displayCart();

        showCartMessage(productName + " added to your cart.");
    }

    /* =====================================================
       8. CHANGE PRODUCT QUANTITY
       ===================================================== */

    function changeQuantity(index, change) {

        cart = loadCart();

        if (!cart[index]) {
            return;
        }

        const newQuantity = cart[index].quantity + change;

        // Keep the quantity between 1 and 10,000.
        // Customers can use Remove to delete the product.
        if (newQuantity < 1) {
            return;
        }

        if (newQuantity > 10000) {
            showCartMessage("Maximum quantity reached.");
            return;
        }

        cart[index].quantity = newQuantity;

        if (!saveCart()) {
            cart = loadCart();
            return;
        }

        displayCart();
        updateCartCount();
    }

    /* =====================================================
       9. REMOVE ONE PRODUCT
       ===================================================== */

    function removeProduct(index) {

        cart = loadCart();

        if (!cart[index]) {
            return;
        }

        const removedProduct = cart[index].name;

        cart.splice(index, 1);

        if (!saveCart()) {
            cart = loadCart();
            return;
        }

        displayCart();
        updateCartCount();

        showCartMessage(removedProduct + " removed from your cart.");
    }

    /* =====================================================
       10. CLEAR THE ENTIRE CART
       ===================================================== */

    function clearCart() {

        if (cart.length === 0) {
            showCartMessage("Your cart is already empty.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to remove all products from your cart?"
        );

        if (!confirmed) {
            return;
        }

        const previousCart = cart;

        cart = [];

        if (!saveCart()) {
            cart = previousCart;
            return;
        }

        displayCart();
        updateCartCount();

        showCartMessage("Your cart has been cleared.");
    }

    /* =====================================================
       11. CART NOTIFICATION
       ===================================================== */

    function showCartMessage(message) {

        let toast = document.getElementById("cartToast");

        if (!toast) {

            toast = createElement("div");
            toast.id = "cartToast";

            toast.style.cssText = `
                position: fixed;
                bottom: 25px;
                right: 25px;
                z-index: 99999;
                max-width: 320px;
                background: #0077CC;
                color: #FFFFFF;
                padding: 14px 20px;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.18);
                font-size: 14px;
                font-weight: 600;
                line-height: 1.5;
            `;

            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.display = "block";

        clearTimeout(toast.hideTimer);

        toast.hideTimer = setTimeout(function () {
            toast.style.display = "none";
        }, 2800);
    }

    /* =====================================================
       12. HANDLE CART BUTTONS
       ===================================================== */

    document.addEventListener("click", function (event) {

        const button = event.target.closest("button");

        if (!button) {
            return;
        }

        if (button.classList.contains("quantity-minus")) {

            event.preventDefault();

            changeQuantity(
                Number(button.dataset.index),
                -1
            );

            return;
        }

        if (button.classList.contains("quantity-plus")) {

            event.preventDefault();

            changeQuantity(
                Number(button.dataset.index),
                1
            );

            return;
        }

        if (button.classList.contains("remove-cart-item")) {

            event.preventDefault();

            removeProduct(Number(button.dataset.index));

            return;
        }

        // Compatibility for any existing button using this class.
        // Product-details.js handles its own .btn-add-cart button.
        if (
            button.classList.contains("add-to-cart") &&
            !button.classList.contains("btn-add-cart")
        ) {
            event.preventDefault();
            addToCart(button);
        }
    });

    /* =====================================================
       13. CLEAR CART BUTTON
       ===================================================== */

    const clearCartButton = document.getElementById("clearCartButton");

    if (clearCartButton) {
        clearCartButton.addEventListener("click", function (event) {
            event.preventDefault();
            clearCart();
        });
    }

    /* =====================================================
       14. CHECKOUT LINK
       ===================================================== */

    const checkoutButton = document.querySelector(
        ".checkout-btn, #checkoutButton"
    );

    if (checkoutButton) {

        checkoutButton.addEventListener("click", function (event) {

            cart = loadCart();

            if (cart.length === 0) {
                event.preventDefault();

                showCartMessage(
                    "Your cart is empty. Please add a product before checkout."
                );
            }

            // When the cart has products, allow the normal link
            // to open Checkout.html.
        });
    }

    /* =====================================================
       15. MOBILE NAVIGATION
       ===================================================== */

    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const navbarMenu = document.getElementById("navbarMenu");

    if (mobileMenuButton && navbarMenu) {

        mobileMenuButton.addEventListener("click", function () {

            const isOpen = navbarMenu.classList.toggle("active");

            mobileMenuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });
    }

    /* =====================================================
       16. REFRESH CART WHEN RETURNING TO THE PAGE
       ===================================================== */

    window.addEventListener("pageshow", function () {
        cart = loadCart();
        displayCart();
        updateCartCount();
    });

    window.addEventListener("storage", function (event) {

        if (event.key === CART_KEY || event.key === null) {
            cart = loadCart();
            displayCart();
            updateCartCount();
        }
    });

    /* =====================================================
       17. INITIALIZE CART
       ===================================================== */

    updateCartCount();
    displayCart();

});

