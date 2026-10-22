

/* =========================================================
   AM ELECTRONICS AND ACCESSORIES
   SHOP PAGE JAVASCRIPT
   File: shop.js

   FEATURES
   - Shared product catalogue
   - Dynamic product cards
   - Category filtering
   - Product details navigation
   - Cart count synchronization
   - Notifications
   - Mobile navigation

   GLOBAL SEARCH
   - Managed separately by global-search.js
   - Does not redirect customers to another page
   - Does not interfere with the shop category filters
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       1. SETTINGS
    ===================================================== */

    const CART_KEY = "amElectronicsCart";

    const PRODUCT_DETAILS_PAGE = "product-details.html";

    const productGrid =
        document.getElementById("shopProductGrid");

    const noProducts =
        document.getElementById("shopNoProducts");

    const filterButtons = Array.from(
        document.querySelectorAll(".shop-filter-button")
    );

    const heading =
        document.querySelector(".shop-products-heading h2");

    const description =
        document.querySelector(".shop-products-heading p");


    /* =====================================================
       2. SHARED PRODUCT CATALOGUE
    ===================================================== */

    /*
       products.js declares the shared catalogue using:

       const products = [...];

       A top-level const does not automatically become
       window.products. Check the lexical binding directly.
    */

    let catalogue = [];

    try {

        if (
            typeof products !== "undefined" &&
            Array.isArray(products)
        ) {

            catalogue = products;

        }

    } catch (error) {

        console.error(
            "Unable to access the shared product catalogue:",
            error
        );

    }


    /*
       Stop shop initialization if products.js has not
       loaded or the catalogue is unavailable.
    */

    if (catalogue.length === 0) {

        console.error(
            "Product catalogue unavailable. Check that products.js loads before shop.js."
        );

        if (productGrid) {

            productGrid.replaceChildren();

            productGrid.style.display = "none";

        }

        if (noProducts) {

            noProducts.textContent =
                "Products could not be loaded. Please refresh the page.";

            noProducts.style.display = "block";

        }

        return;

    }


    /* =====================================================
       3. CATEGORY MAPPING
    ===================================================== */

    const categoryMap = {

        all: [],

        phones: [
            "phones",
            "smartphones"
        ],

        smartwatches: [
            "smartwatches",
            "smart watches"
        ],

        headphones: [
            "headphones and earphones",
            "headphones",
            "earbuds",
            "wireless earbuds"
        ],

        chargers: [
            "chargers",
            "power banks",
            "portable power banks"
        ],

        cables: [
            "cables",
            "charging cables",
            "usb cables"
        ],

        covers: [
            "phone covers",
            "covers",
            "phone cases"
        ],

        "screen-protectors": [
            "screen protectors",
            "screen protector"
        ],

        speakers: [
            "bluetooth speakers",
            "speakers"
        ],

        "ring-lights": [
            "ring lights",
            "ring light"
        ],

        gaming: [
            "gaming",
            "game consoles"
        ]

    };


    /* =====================================================
       4. TEXT NORMALIZATION
    ===================================================== */

    function normalizeText(value) {

        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       5. CART STORAGE
    ===================================================== */

    function getCart() {

        try {

            const stored = JSON.parse(
                localStorage.getItem(CART_KEY) || "[]"
            );

            return Array.isArray(stored)
                ? stored
                : [];

        } catch (error) {

            console.error(
                "Unable to read shopping cart:",
                error
            );

            return [];

        }

    }


    /* =====================================================
       6. CART COUNTER
    ===================================================== */

    function updateCartCount() {

        const cartCount =
            document.getElementById("cartCount");

        if (!cartCount) return;

        const cart = getCart();

        const total = cart.reduce(
            function (sum, item) {

                const quantity = Number(item.quantity);

                if (
                    Number.isFinite(quantity) &&
                    quantity > 0
                ) {

                    return sum + Math.floor(quantity);

                }

                return sum;

            },
            0
        );

        cartCount.textContent = total;

    }


    /*
       Make the update function available to other scripts
       when they need to refresh the displayed cart count.
    */

    window.updateAMElectronicsCartCount = updateCartCount;


    /* =====================================================
       7. PRICE FORMATTING
    ===================================================== */

    function formatPrice(price) {

        /*
           Use the shared formatter from products.js when
           it is available.
        */

        try {

            if (
                typeof formatProductPrice === "function"
            ) {

                return formatProductPrice(price);

            }

        } catch (error) {

            console.warn(
                "Using the fallback price formatter.",
                error
            );

        }


        return "KSh " + new Intl.NumberFormat("en-KE")
            .format(Number(price) || 0);

    }


    /* =====================================================
       8. PRODUCT DETAILS URL
    ===================================================== */

    function getProductURL(product) {

        return PRODUCT_DETAILS_PAGE +
            "?id=" +
            encodeURIComponent(product.id);

    }


    /* =====================================================
       9. CREATE PRODUCT CARD
    ===================================================== */

    function createProductCard(product) {

        const article =
            document.createElement("article");

        article.className = "shop-product-card";

        article.dataset.productId = product.id;

        article.dataset.category = product.category || "";

        article.dataset.name = product.name || "";


        /* -----------------------------------------------
           PRODUCT IMAGE
        ----------------------------------------------- */

        const imageWrapper =
            document.createElement("div");

        imageWrapper.className = "shop-product-image";


        const imageLink =
            document.createElement("a");

        imageLink.href = getProductURL(product);

        imageLink.setAttribute(
            "aria-label",
            "View " + product.name
        );


        const image =
            document.createElement("img");

        image.src = product.image || "";

        image.alt = product.name || "Electronics product";

        image.loading = "lazy";

        image.decoding = "async";


        image.addEventListener(
            "error",
            function () {

                image.classList.add("image-unavailable");

                image.alt = "Product image unavailable";

            },
            { once: true }
        );


        imageLink.appendChild(image);

        imageWrapper.appendChild(imageLink);


        /* -----------------------------------------------
           STOCK BADGE
        ----------------------------------------------- */

        const badge =
            document.createElement("span");

        badge.className = "shop-product-badge";

        const inStock = product.inStock === true;

        badge.textContent = inStock
            ? "In Stock"
            : "Out of Stock";

        badge.classList.toggle(
            "out-of-stock",
            !inStock
        );

        imageWrapper.appendChild(badge);


        /* -----------------------------------------------
           PRODUCT DETAILS
        ----------------------------------------------- */

        const details =
            document.createElement("div");

        details.className = "shop-product-details";


        /* Product category */

        const category =
            document.createElement("span");

        category.className = "shop-product-category";

        category.textContent =
            product.category || "Electronics";


        /* Product name */

        const nameLink =
            document.createElement("a");

        nameLink.className = "shop-product-name-link";

        nameLink.href = getProductURL(product);

        nameLink.style.color = "inherit";

        nameLink.style.textDecoration = "none";


        const name =
            document.createElement("h3");

        name.textContent =
            product.name || "Unnamed Product";

        nameLink.appendChild(name);


        /* Product description */

        const productDescription =
            document.createElement("p");

        productDescription.textContent =
            product.description ||
            "Contact us for more information.";


        /* -----------------------------------------------
           PRICE AND VIEW PRODUCT BUTTON
        ----------------------------------------------- */

        const bottom =
            document.createElement("div");

        bottom.className = "shop-product-bottom";


        const price =
            document.createElement("strong");

        price.className = "shop-product-price";


        const currentPrice =
            Number(product.price) || 0;

        const oldPriceValue =
            Number(product.oldPrice) || 0;


        if (oldPriceValue > currentPrice) {

            const oldPrice =
                document.createElement("del");

            oldPrice.textContent =
                formatPrice(oldPriceValue);


            const newPrice =
                document.createElement("ins");

            newPrice.textContent =
                formatPrice(currentPrice);

            newPrice.style.textDecoration = "none";


            price.appendChild(oldPrice);

            price.appendChild(
                document.createElement("br")
            );

            price.appendChild(newPrice);

        } else {

            price.textContent =
                formatPrice(currentPrice);

        }


        /*
           This button deliberately opens product details.

           Customers select available product options and
           add the product to their cart from that page.
        */

        const viewButton =
            document.createElement("a");

        viewButton.className = "shop-add-cart";

        viewButton.href = getProductURL(product);

        viewButton.innerHTML =
            '<i class="fa-solid fa-eye" aria-hidden="true"></i> View Product';

        viewButton.setAttribute(
            "aria-label",
            "View details for " + product.name
        );


        if (!inStock) {

            viewButton.classList.add(
                "product-unavailable"
            );

            viewButton.setAttribute(
                "aria-label",
                "View details and availability for " +
                product.name
            );

        }


        /* -----------------------------------------------
           ASSEMBLE THE CARD
        ----------------------------------------------- */

        bottom.appendChild(price);

        bottom.appendChild(viewButton);

        details.appendChild(category);

        details.appendChild(nameLink);

        details.appendChild(productDescription);

        details.appendChild(bottom);

        article.appendChild(imageWrapper);

        article.appendChild(details);


        return article;

    }


    /* =====================================================
       10. RENDER PRODUCTS
    ===================================================== */

    function renderProducts(productList) {

        if (!productGrid) return;


        const fragment =
            document.createDocumentFragment();


        productList.forEach(function (product) {

            fragment.appendChild(
                createProductCard(product)
            );

        });


        productGrid.replaceChildren(fragment);


        const hasProducts = productList.length > 0;


        productGrid.style.display =
            hasProducts ? "grid" : "none";


        if (noProducts) {

            noProducts.style.display =
                hasProducts ? "none" : "block";

            noProducts.textContent =
                "No products found in this category. Please try another category.";

        }


        updateCartCount();

    }


    /* =====================================================
       11. CATEGORY MATCHING
    ===================================================== */

    function productMatchesCategory(
        product,
        selectedCategory
    ) {

        if (
            !selectedCategory ||
            selectedCategory === "all"
        ) {

            return true;

        }


        const allowedCategories =
            categoryMap[selectedCategory];


        if (!allowedCategories) {

            return normalizeText(product.category) ===
                normalizeText(selectedCategory);

        }


        const normalizedProductCategory =
            normalizeText(product.category);


        return allowedCategories.some(
            function (category) {

                return normalizedProductCategory ===
                    normalizeText(category);

            }
        );

    }


    /* =====================================================
       12. UPDATE PAGE HEADING
    ===================================================== */

    function updateHeading(
        title,
        subtitle
    ) {

        if (heading) {

            heading.textContent = title;

        }

        if (description) {

            description.textContent = subtitle;

        }

    }


    /* =====================================================
       13. ACTIVE CATEGORY BUTTON
    ===================================================== */

    function setActiveCategory(category) {

        filterButtons.forEach(function (button) {

            const isActive =
                (button.dataset.category || "all") === category;


            button.classList.toggle(
                "active",
                isActive
            );


            button.setAttribute(
                "aria-pressed",
                isActive ? "true" : "false"
            );

        });

    }


    /* =====================================================
       14. CATEGORY FILTERING
    ===================================================== */

    let activeCategory = "all";


    function applyCategoryFilter(options) {

        options = options || {};


        /*
           Filter the shared product catalogue using the
           selected category button.
        */

        const filteredProducts =
            catalogue.filter(function (product) {

                return productMatchesCategory(
                    product,
                    activeCategory
                );

            });


        /* Update the page heading */

        if (activeCategory === "all") {

            updateHeading(
                "All Products",
                "Browse our available electronics and accessories."
            );

        } else {

            const activeButton =
                filterButtons.find(function (button) {

                    return (
                        button.dataset.category || "all"
                    ) === activeCategory;

                });


            updateHeading(
                activeButton
                    ? activeButton.textContent.trim()
                    : "Products",

                "Browse products in this category."
            );

        }


        renderProducts(filteredProducts);


        /*
           Scroll to the shop product section when a
           category button is clicked.
        */

        if (options.scrollToResults) {

            const shopSection =
                document.querySelector(".shop-products");

            if (shopSection) {

                shopSection.scrollIntoView({

                    behavior: "smooth",

                    block: "start"

                });

            }

        }

    }


    /* =====================================================
       15. CATEGORY BUTTONS
    ===================================================== */

    filterButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                activeCategory =
                    button.dataset.category || "all";


                setActiveCategory(activeCategory);


                /*
                   Category selection remains separate from
                   global search. The global-search.js script
                   handles the search input and result grid.
                */

                applyCategoryFilter({

                    scrollToResults: true

                });

            }
        );

    });


    /* =====================================================
       16. NOTIFICATIONS
    ===================================================== */

    function showNotification(message) {

        let notification =
            document.getElementById("shopCartNotification");


        if (!notification) {

            notification =
                document.createElement("div");

            notification.id =
                "shopCartNotification";

            notification.setAttribute(
                "role",
                "status"
            );

            notification.setAttribute(
                "aria-live",
                "polite"
            );


            notification.style.cssText = `
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 20px;
                border-radius: 10px;
                background: #005FA3;
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                opacity: 0;
                transform: translateY(15px);
                transition:
                    opacity .25s ease,
                    transform .25s ease;
            `;


            const icon =
                document.createElement("i");

            icon.className =
                "fa-solid fa-circle-check";

            icon.setAttribute(
                "aria-hidden",
                "true"
            );


            const messageText =
                document.createElement("span");

            messageText.textContent = message;


            notification.appendChild(icon);

            notification.appendChild(messageText);

            document.body.appendChild(notification);

        } else {

            const messageText =
                notification.querySelector("span");

            if (messageText) {

                messageText.textContent = message;

            }

        }


        notification.style.opacity = "1";

        notification.style.transform = "translateY(0)";


        clearTimeout(window.shopNotificationTimer);


        window.shopNotificationTimer =
            setTimeout(function () {

                notification.style.opacity = "0";

                notification.style.transform =
                    "translateY(15px)";

            }, 2500);

    }


    /*
       Make the notification function available for other
       shop scripts if it is needed in the future.
    */

    window.showShopNotification = showNotification;


    /* =====================================================
       17. MOBILE NAVIGATION
    ===================================================== */

    const mobileMenuButton =
        document.getElementById("mobileMenuButton");

    const navbarMenu =
        document.getElementById("navbarMenu");


    if (mobileMenuButton && navbarMenu) {

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );


        mobileMenuButton.addEventListener(
            "click",
            function () {

                const isOpen =
                    navbarMenu.classList.toggle("active");


                mobileMenuButton.setAttribute(
                    "aria-expanded",
                    isOpen ? "true" : "false"
                );


                mobileMenuButton.classList.toggle(
                    "active",
                    isOpen
                );

            }
        );


        navbarMenu.querySelectorAll("a").forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        navbarMenu.classList.remove("active");

                        mobileMenuButton.classList.remove("active");

                        mobileMenuButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }
                );

            }
        );


        /*
           Close the menu when clicking outside it.
        */

        document.addEventListener(
            "click",
            function (event) {

                const clickedInsideMenu =
                    navbarMenu.contains(event.target);

                const clickedMenuButton =
                    mobileMenuButton.contains(event.target);


                if (
                    !clickedInsideMenu &&
                    !clickedMenuButton
                ) {

                    navbarMenu.classList.remove("active");

                    mobileMenuButton.classList.remove("active");

                    mobileMenuButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

    }


    /* =====================================================
       18. CART COUNT SYNCHRONIZATION
    ===================================================== */

    updateCartCount();


    window.addEventListener(
        "storage",
        function (event) {

            if (event.key === CART_KEY) {

                updateCartCount();

            }

        }
    );


    window.addEventListener(
        "pageshow",
        updateCartCount
    );


    document.addEventListener(
        "visibilitychange",
        function () {

            if (!document.hidden) {

                updateCartCount();

            }

        }
    );


    /* =====================================================
       19. INITIALIZE SHOP PAGE
    ===================================================== */

    setActiveCategory("all");

    applyCategoryFilter();


    console.info(
        "AM Electronics shop initialized successfully.",
        catalogue.length,
        "catalogue products available."
    );

});

