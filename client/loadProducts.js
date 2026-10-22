document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
});

async function fetchProducts() {
    const productsGrid = document.getElementById("shopProductGrid");
    
    try {
        const response = await fetch(`${window.AM_API_BASE_URL}/api/products`);
        if (!response.ok) throw new Error("Backend connection failed");
        
        const products = await response.json();
        
        if (products.length === 0) {
            productsGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; padding: 40px; color:#555; font-size:16px;">No products uploaded yet. Use the admin portal to add stock!</p>`;
            return;
        }

        displayProducts(products, productsGrid);
        setupControls(products, productsGrid);

    } catch (error) {
        console.error("Storefront error:", error);
        productsGrid.innerHTML = `<p style="text-align:center; color:red; grid-column: 1/-1; padding: 20px;">Failed to load storefront items. Ensure your local Node backend server is running.</p>`;
    }
}

function displayProducts(productsToRender, container) {
    container.replaceChildren();

    productsToRender.forEach(product => {
        const productCard = document.createElement("article");
        productCard.className = "shop-product-card";
        productCard.tabIndex = 0;
        productCard.setAttribute("role", "link");
        productCard.setAttribute("aria-label", `View details for ${product.title}`);
        const openProduct = () => {
            window.location.href = `Product-details.html?id=${encodeURIComponent(product._id)}`;
        };
        productCard.addEventListener("click", openProduct);
        productCard.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openProduct();
            }
        });
        
        productCard.setAttribute("data-category", product.category || "");
        productCard.setAttribute("data-placement", product.placement || 'regular');
        productCard.setAttribute("data-name", product.title.toLowerCase());

        const imageWrap = document.createElement("div");
        imageWrap.className = "shop-product-image";

        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.title;
        image.loading = "lazy";
        imageWrap.appendChild(image);

        if (product.isDemo) {
            const demoBadge = document.createElement("span");
            demoBadge.className = "shop-demo-badge";
            demoBadge.textContent = "DEMO PREVIEW";
            imageWrap.appendChild(demoBadge);
        }

        const productPlacements = [product.category, product.placement];
        let badgeText = "";
        let badgeType = "";
        if (product.shopBadge === "new-arrival" || productPlacements.includes("new-arrivals")) {
            badgeText = "NEW ARRIVAL";
            badgeType = "new-arrival";
        } else if (product.shopBadge === "top-seller" || productPlacements.includes("top-selling")) {
            badgeText = "TOP SELLER";
            badgeType = "top-seller";
        }
        if (badgeText) {
            const badge = document.createElement("span");
            badge.className = `shop-product-badge ${badgeType}`;
            badge.textContent = badgeText;
            imageWrap.appendChild(badge);
        }

        const details = document.createElement("div");
        details.className = "shop-product-details";

        const title = document.createElement("h3");
        title.textContent = product.title;

        const description = document.createElement("p");
        description.textContent = product.description;

        const priceBlock = document.createElement("div");
        priceBlock.className = "shop-product-price";

        const originalPrice = Number(product.originalPrice);
        const price = Number(product.price);
        if (Number.isFinite(originalPrice) && originalPrice > price) {
            const oldPrice = document.createElement("del");
            oldPrice.textContent = formatKES(originalPrice);

            const discount = document.createElement("span");
            discount.className = "discount-badge";
            discount.textContent = `-${Math.round(((originalPrice - price) / originalPrice) * 100)}%`;

            priceBlock.append(oldPrice, discount);
        }

        const currentPrice = document.createElement("ins");
        currentPrice.textContent = formatKES(price);
        priceBlock.appendChild(currentPrice);

        details.append(title, description, priceBlock);
        productCard.append(imageWrap, details);
        container.appendChild(productCard);
    });
}

function formatKES(amount) {
    return "KSh " + Number(amount).toLocaleString("en-KE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function hasShopBadge(product, badge) {
    if (product.shopBadge === badge) return true;
    const legacyPlacement = badge === "new-arrival" ? "new-arrivals" : "top-selling";
    return product.category === legacyPlacement || product.placement === legacyPlacement;
}

function setupControls(allProducts, container) {
    const searchInput = document.getElementById("shopProductSearch");
    const filterButtons = document.querySelectorAll(".shop-filter-button");
    
    let activeFilter = "all";
    let searchQuery = "";

    function applyFilters() {
        const filtered = allProducts.filter(product => {
            let matchesFilter = activeFilter === "all";
            if (activeFilter === "top-selling") {
                matchesFilter = hasShopBadge(product, "top-seller");
            } else if (activeFilter === "new-arrivals") {
                matchesFilter = hasShopBadge(product, "new-arrival");
            } else if (activeFilter === "you-may-like") {
                const productCategories = [product.category, product.placement]
                    .filter(category => category && category !== "regular");
                const onlyYouMayLikeOrUncategorized = productCategories.every(category =>
                    category === "you-may-like"
                );
                matchesFilter = onlyYouMayLikeOrUncategorized &&
                    !hasShopBadge(product, "top-seller") &&
                    !hasShopBadge(product, "new-arrival");
            } else if (activeFilter !== "all") {
                matchesFilter = product.category === activeFilter ||
                                product.placement === activeFilter;
            }
            
            const matchesSearch = product.title.toLowerCase().includes(searchQuery) || 
                                  product.description.toLowerCase().includes(searchQuery);
            
            return matchesFilter && matchesSearch;
        });
        displayProducts(filtered, container);
    }

    filterButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            e.currentTarget.classList.add("active");
            activeFilter = e.currentTarget.getAttribute("data-category");
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        });
    }
}



