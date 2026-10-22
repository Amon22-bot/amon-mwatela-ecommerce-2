
/* =========================================================
   AM ELECTRONICS AND ACCESSORIES
   PRODUCT DETAILS JAVASCRIPT
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    "use strict";

    /* =====================================================
       1. CONFIGURATION
    ===================================================== */

    const CART_KEY = "amElectronicsCart";
    const MIN_QUANTITY = 1;
    const MAX_QUANTITY = 10;

    const catalogue = Array.isArray(window.products)
        ? window.products
        : (typeof products !== "undefined" ? products : []);
    let currentProduct = null;

    /* =====================================================
       2. PAGE ELEMENTS
    ===================================================== */

    const mainProductImg =
        document.getElementById("mainProductImg");

    const thumbnailRow = document.getElementById("thumbnailRow");
    const getThumbnails = () => document.querySelectorAll(".thumb");

    const swatches =
        document.querySelectorAll(".swatch");

    const quantityInput =
        document.getElementById("quantity");

    const addToCartButton =
        document.querySelector(".btn-add-cart");

    const cartCount =
        document.getElementById("cartCount");

    /* =====================================================
       3. HELPERS
    ===================================================== */

    function formatMoney(amount) {

        return "KSh " + Number(amount).toLocaleString("en-KE", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

    }

    function getCart() {

        try {

            const storedCart = localStorage.getItem(CART_KEY);

            if (!storedCart) return [];

            const parsedCart = JSON.parse(storedCart);

            return Array.isArray(parsedCart) ? parsedCart : [];

        } catch (error) {

            console.error("Unable to read cart:", error);

            return [];

        }

    }

    function saveCart(cart) {

        try {

            localStorage.setItem(
                CART_KEY,
                JSON.stringify(cart)
            );

            return true;

        } catch (error) {

            console.error("Unable to save cart:", error);

            showMessage(
                "Unable to save your cart. Please try again.",
                "error"
            );

            return false;

        }

    }

    function updateCartCount() {

        if (!cartCount) return;

        const totalItems = getCart().reduce(function (total, item) {

            const quantity = Number(item.quantity);

            return total + (
                Number.isFinite(quantity) && quantity > 0
                    ? Math.floor(quantity)
                    : 0
            );

        }, 0);

        cartCount.textContent = totalItems;

    }

    function showMessage(message, type) {

        let notification = document.getElementById(
            "productCartNotification"
        );

        if (!notification) {

            notification = document.createElement("div");

            notification.id = "productCartNotification";

            notification.setAttribute("role", "status");
            notification.setAttribute("aria-live", "polite");

            Object.assign(notification.style, {
                position: "fixed",
                right: "20px",
                bottom: "20px",
                zIndex: "99999",
                maxWidth: "min(360px, calc(100vw - 40px))",
                padding: "14px 20px",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
                opacity: "0",
                transform: "translateY(10px)",
                transition: "opacity 0.2s ease, transform 0.2s ease"
            });

            document.body.appendChild(notification);

        }

        notification.style.background =
            type === "error" ? "#c62828" : "#087b42";

        notification.textContent = message;

        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";

        clearTimeout(notification.hideTimer);

        notification.hideTimer = setTimeout(function () {

            notification.style.opacity = "0";
            notification.style.transform = "translateY(10px)";

        }, 3000);

    }

    /* =====================================================
       4. FIND SELECTED PRODUCT
    ===================================================== */

    function getSelectedProduct() {
        return currentProduct;
    }

    function getRequestedProductId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id") || params.get("product");
    }

    function normalizeProduct(product) {
        if (!product) return null;

        const inStock = typeof product.stockStatus === "string"
            ? product.stockStatus === "in-stock"
            : product.inStock !== false;

        return {
            ...product,
            id: String(product._id || product.id || ""),
            name: product.title || product.name || "Product",
            oldPrice: product.originalPrice ?? product.oldPrice ?? product.price,
            inStock,
            colors: Array.isArray(product.colors) ? product.colors : [],
            features: Array.isArray(product.features) ? product.features : [],
            specifications: Array.isArray(product.specifications) ? product.specifications : [],
            extraImages: Array.isArray(product.extraImages) ? product.extraImages : []
        };
    }

    function categoryLabel(category) {
        const labels = {
            "top-selling": "Top Selling Products",
            covers: "Phone Covers",
            "new-arrivals": "New Arrivals",
            "screen-protectors": "Screen Protectors",
            "headphones-earpods": "Headphones and Earpods",
            smartwatches: "Smartwatches",
            "chargers-cables": "Chargers and Cables",
            "you-may-like": "You May Also Like",
            phones: "Phones",
            "bluetooth-speakers": "Bluetooth Speakers",
            "ring-lights": "Ring Lights"
        };
        return labels[category] || "Shop Product";
    }

    /* =====================================================
       5. LOAD PRODUCT INFORMATION
    ===================================================== */

    function loadProductDetails(product) {

        if (!product) return;

        const title = document.querySelector(".product-title");
        const currentPrice = document.querySelector(".current-price");
        const oldPrice = document.querySelector(".old-price");
        const discountBadge = document.querySelector(".detail-discount-badge");
        const description = document.querySelector(".product-description");

        if (title) {
            title.textContent = product.name;
            document.title = product.name + " | AM Electronics";
        }

        if (currentPrice) {
            currentPrice.textContent = formatMoney(product.price);
        }

        if (oldPrice) {

            if (
                Number(product.oldPrice) > Number(product.price)
            ) {

                oldPrice.textContent = formatMoney(product.oldPrice);
                oldPrice.hidden = false;
                oldPrice.style.display = "";

            } else {

                oldPrice.textContent = "";
                oldPrice.hidden = true;
                oldPrice.style.display = "";

            }

        }

        const hasDiscount = Number(product.oldPrice) > Number(product.price) && Number(product.oldPrice) > 0;
        if (discountBadge) {
            if (hasDiscount) {
                discountBadge.textContent = `-${Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}%`;
                discountBadge.style.display = "inline-block";
            } else {
                discountBadge.textContent = "";
                discountBadge.style.display = "none";
            }
        }
        if (description) {
            description.textContent = product.description || "";
        }

        if (mainProductImg && product.image) {

            mainProductImg.src = product.image;
            mainProductImg.alt = product.name;

        }

        const galleryImages = [product.image, ...product.extraImages].filter(Boolean);
        if (thumbnailRow) {
            thumbnailRow.replaceChildren(...galleryImages.map((src, index) => {
                const thumbnail = document.createElement("img");
                thumbnail.className = `thumb${index === 0 ? " active" : ""}`;
                thumbnail.src = src;
                thumbnail.dataset.fullImage = src;
                thumbnail.alt = `${product.name} image ${index + 1}`;
                thumbnail.loading = "lazy";
                thumbnail.tabIndex = 0;
                thumbnail.setAttribute("role", "button");
                return thumbnail;
            }));
        }

        const extraInfo = document.getElementById("productExtraInfo");
        const brandModel = document.getElementById("productBrandModel");
        const brandModelText = [product.brand, product.model].filter(Boolean).join(" · ");
        if (brandModel) brandModel.textContent = brandModelText;
        if (brandModel) brandModel.hidden = !brandModelText;

        const featuresList = document.getElementById("productFeatures");
        if (featuresList) featuresList.replaceChildren(...product.features.map((feature) => {
            const item = document.createElement("li");
            item.textContent = feature;
            return item;
        }));
        const featuresSection = document.getElementById("featuresSection");
        if (featuresSection) featuresSection.hidden = !product.features.length;

        const specsBody = document.getElementById("productSpecifications");
        if (specsBody) specsBody.replaceChildren(...product.specifications.map((spec) => {
            const row = document.createElement("tr");
            if (typeof spec === "string") {
                const value = document.createElement("td");
                value.className = "spec-value";
                value.colSpan = 2;
                value.textContent = spec;
                row.append(value);
            } else if (spec && typeof spec.label === "string" && typeof spec.value === "string") {
                const label = document.createElement("td");
                const value = document.createElement("td");
                label.className = "spec-label";
                value.className = "spec-value";
                label.textContent = spec.label;
                value.textContent = spec.value;
                row.append(label, value);
            }
            return row;
        }).filter((row) => row.childElementCount));
        const specsSection = document.getElementById("specificationsSection");
        if (specsSection) specsSection.hidden = !product.specifications.length;

        const colorsSection = document.getElementById("colorsSection");
        const colorsText = document.getElementById("productColors");
        if (colorsText) colorsText.textContent = product.colors.join(", ");
        if (colorsSection) colorsSection.hidden = !product.colors.length;

        const warrantySection = document.getElementById("warrantySection");
        const warrantyText = document.getElementById("productWarranty");
        if (warrantyText) warrantyText.textContent = product.warranty || "";
        if (warrantySection) warrantySection.hidden = !product.warranty;

        const verifiedBadge = document.getElementById("detailsVerifiedBadge");
        if (verifiedBadge) verifiedBadge.hidden = product.detailsVerified !== true;
        if (extraInfo) extraInfo.hidden = !(brandModelText || product.features.length || product.specifications.length || product.colors.length || product.warranty || product.detailsVerified);

        const specName = document.getElementById("specProductName");
        const specCategory = document.getElementById("specProductCategory");
        const specStock = document.getElementById("specProductStock");
        if (specName) specName.textContent = product.name;
        if (specCategory) specCategory.textContent = categoryLabel(product.category);
        if (specStock) specStock.textContent = product.inStock ? "In Stock" : "Out of Stock";

        /* Update product availability if the status element exists. */

        const stockElement = document.querySelector(
            ".product-status, .stock-status"
        );

        if (stockElement) {

            stockElement.textContent = product.inStock
                ? "In Stock"
                : "Out of Stock";

            stockElement.style.color = product.inStock
                ? "#087b42"
                : "#c62828";

        }

        /* Remember which product is currently displayed. */

        document.body.dataset.productId = product.id;

        /* Build colour options from the catalogue. */

        renderColours(product);

        /* Prevent adding products that are out of stock. */

        if (addToCartButton) {

            addToCartButton.disabled = !product.inStock;

            addToCartButton.textContent = product.inStock
                ? "Add to Cart"
                : "Out of Stock";

        }

    }

    /* =====================================================
       6. COLOUR SELECTION
    ===================================================== */

    function renderColours(product) {

        const colourContainer = document.querySelector(
            ".product-colors, .color-options"
        );

        if (!colourContainer) return;

        colourContainer.replaceChildren();

        const colours = Array.isArray(product.colors)
            ? product.colors
            : [];

        if (colours.length === 0) {

            const message = document.createElement("p");
            message.textContent = "Colour options not specified.";

            colourContainer.appendChild(message);

            return;

        }

        colours.forEach(function (colour, index) {

            const button = document.createElement("button");

            button.type = "button";
            button.className = "swatch";

            button.dataset.color = colour;
            button.setAttribute("aria-label", colour);
            button.setAttribute("title", colour);
            button.setAttribute("aria-pressed", "false");

            button.textContent = colour;

            if (index === 0) {
                button.classList.add("selected");
                button.setAttribute("aria-pressed", "true");
            }

            button.addEventListener("click", function () {

                selectSwatch(button);

            });

            colourContainer.appendChild(button);

        });

    }

    function selectSwatch(element) {

        if (!element) return;

        document.querySelectorAll(".swatch").forEach(
            function (swatch) {

                swatch.classList.remove("selected");

                swatch.setAttribute("aria-pressed", "false");

            }
        );

        element.classList.add("selected");

        element.setAttribute("aria-pressed", "true");

    }

    /* =====================================================
       7. IMAGE GALLERY
    ===================================================== */

    function changeImage(element) {

        if (!mainProductImg || !element) return;

        const source =
            element.getAttribute("data-full-image") ||
            element.getAttribute("src");

        if (!source) return;

        mainProductImg.src = source;

        mainProductImg.alt =
            element.alt || "Product image";

        getThumbnails().forEach(function (thumbnail) {

            thumbnail.classList.remove("active");

        });

        element.classList.add("active");

    }

    if (thumbnailRow) {
        thumbnailRow.addEventListener("click", (event) => {
            const thumbnail = event.target.closest(".thumb");
            if (thumbnail) changeImage(thumbnail);
        });
        thumbnailRow.addEventListener("keydown", (event) => {
            const thumbnail = event.target.closest(".thumb");
            if (thumbnail && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                changeImage(thumbnail);
            }
        });
    }

    /* =====================================================
       8. QUANTITY CONTROLS
    ===================================================== */

    function getQuantity() {

        if (!quantityInput) return MIN_QUANTITY;

        let quantity = parseInt(quantityInput.value, 10);

        if (!Number.isFinite(quantity)) {
            quantity = MIN_QUANTITY;
        }

        quantity = Math.max(
            MIN_QUANTITY,
            Math.min(MAX_QUANTITY, quantity)
        );

        quantityInput.value = quantity;

        return quantity;

    }

    function updateQty(change) {

        if (!quantityInput) return;

        const newQuantity = getQuantity() + Number(change);

        if (
            Number.isInteger(newQuantity) &&
            newQuantity >= MIN_QUANTITY &&
            newQuantity <= MAX_QUANTITY
        ) {

            quantityInput.value = newQuantity;

        }

    }

    if (quantityInput) {

        quantityInput.min = MIN_QUANTITY;
        quantityInput.max = MAX_QUANTITY;
        quantityInput.step = 1;

        quantityInput.addEventListener("change", getQuantity);

    }

    /* =====================================================
       9. ADD TO CART
    ===================================================== */

    function addProductToCart() {

        const product = getSelectedProduct();

        if (!product) {

            showMessage(
                "Product not found. Please return to the shop and select a product.",
                "error"
            );

            return;

        }

        if (!product.inStock) {

            showMessage(
                "Sorry, this product is currently out of stock.",
                "error"
            );

            return;

        }

        if (quantityInput && !quantityInput.reportValidity()) {
            return;
        }

        const quantity = getQuantity();

        const selectedSwatch = document.querySelector(
            ".swatch.selected"
        );

        const colour = selectedSwatch
            ? selectedSwatch.dataset.color ||
              selectedSwatch.getAttribute("title") ||
              selectedSwatch.textContent.trim()
            : "";

        const cart = getCart();

        const existingProduct = cart.find(function (item) {

            return String(item.id) === String(product.id) &&
                String(item.color || "") === String(colour || "");

        });

        if (existingProduct) {

            existingProduct.quantity =
                Number(existingProduct.quantity || 0) + quantity;

            existingProduct.price = Number(product.price);
            existingProduct.image = product.image;

        } else {

            cart.push({

                id: product.id,
                name: product.name,
                price: Number(product.price),
                image: product.image,
                color: colour,
                quantity: quantity

            });

        }

        if (!saveCart(cart)) return;

        updateCartCount();

        showMessage(
            product.name + " added to your cart.",
            "success"
        );

        if (addToCartButton) {

            addToCartButton.textContent = "✓ Added to Cart";

            addToCartButton.disabled = true;

            setTimeout(function () {

                addToCartButton.textContent = "Add to Cart";

                addToCartButton.disabled = false;

            }, 1200);

        }

    }

    if (addToCartButton) {

        addToCartButton.addEventListener(
            "click",
            addProductToCart
        );

    }

    /* =====================================================
       10. INITIALIZE PAGE
    ===================================================== */

    async function initializeProductDetails() {
        const requestedId = getRequestedProductId();
        const title = document.querySelector(".product-title");
        const description = document.querySelector(".product-description");

        if (!requestedId) {
            if (title) title.textContent = "Product not selected";
            if (description) description.textContent = "Open this page by selecting a product from the Home or Shop page.";
            if (addToCartButton) addToCartButton.textContent = "Product unavailable";
            return;
        }

        try {
            const response = await fetch(`${window.AM_API_BASE_URL}/api/products/${encodeURIComponent(requestedId)}`);
            if (!response.ok) throw new Error(`Product request failed (${response.status})`);
            currentProduct = normalizeProduct(await response.json());
        } catch (error) {
            console.error("Could not load product from the backend:", error);
            const fallback = catalogue.find((item) => String(item.id || item._id) === requestedId);
            currentProduct = normalizeProduct(fallback);
        }

        if (!currentProduct) {
            if (title) title.textContent = "Product not found";
            if (description) description.textContent = "This product may have been removed. Return to the Home or Shop page and choose another product.";
            if (addToCartButton) addToCartButton.textContent = "Product unavailable";
            return;
        }

        loadProductDetails(currentProduct);
    }

    initializeProductDetails();

    if (quantityInput) {

        quantityInput.value = MIN_QUANTITY;

    }

    updateCartCount();

    /* Preserve compatibility with existing inline handlers. */

    window.changeImage = changeImage;
    window.selectSwatch = selectSwatch;
    window.updateQty = updateQty;

    console.log(
        "AM Electronics product details initialized."
    );

});


