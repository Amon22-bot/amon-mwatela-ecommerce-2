"use strict";

const homepageProductSections = {
    "top-selling": {
        container: "#topSellingTrack",
        description: ".top-selling-details > p",
        price: ".top-selling-price"
    },
    covers: {
        container: ".phone-covers-grid",
        description: ".phone-cover-details > p",
        price: ".product-price"
    },
    "new-arrivals": {
        container: ".new-arrivals-track",
        description: ".new-arrival-details > p",
        price: ".new-arrival-price"
    },
    "screen-protectors": {
        container: ".screen-protectors-section .product-carousel",
        description: ".screen-protector-description",
        price: ".screen-protector-price"
    },
    "headphones-earpods": {
        container: ".headphones-section .products-container",
        description: ".product-description",
        price: ".product-price"
    },
    smartwatches: {
        container: ".smartwatches-section .smartwatches-grid",
        description: ".smartwatch-description",
        price: ".smartwatch-price"
    },
    "chargers-cables": {
        container: ".chargers-cables-section .chargers-cables-grid",
        description: ".chargers-cables-description",
        price: ".chargers-cables-price"
    },
    "you-may-like": {
        container: ".you-may-also-like .recommended-products-grid",
        description: ".product-description",
        price: ".product-price"
    }
};

document.addEventListener("DOMContentLoaded", () => {
    Object.entries(homepageProductSections).forEach(([category, config]) => {
        loadHomepageCategory(category, config);
    });
});

async function loadHomepageCategory(category, config) {
    const container = document.querySelector(config.container);
    const template = container?.firstElementChild;
    if (!container || !template) return;

    try {
        const response = await fetch(
            `${window.AM_API_BASE_URL}/api/products/homepage/${encodeURIComponent(category)}`
        );
        if (!response.ok) throw new Error(`Request failed (${response.status})`);

        const products = await response.json();
        if (!products.length) return;

        const cards = products.map((product) => {
            const card = template.cloneNode(true);
            updateHomepageCard(card, product, config);
            return card;
        });
        container.replaceChildren(...cards);
    } catch (error) {
        console.error(`Could not load homepage section ${category}:`, error);
    }
}

function updateHomepageCard(card, product, config) {
    if (product.isDemo) {
        card.classList.add("demo-preview-card");
        if (!card.querySelector(":scope > .demo-preview-badge")) {
            const badge = document.createElement("span");
            badge.className = "demo-preview-badge";
            badge.textContent = "DEMO PREVIEW";
            card.appendChild(badge);
        }
    }
    const productUrl = `Product-details.html?id=${encodeURIComponent(product._id)}`;
    // Some homepage templates are anchors themselves, so update the root link too.
    if (card.tagName === "A") {
        card.href = productUrl;
    }
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", `View details for ${product.title}`);
    card.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) return;
        window.location.href = productUrl;
    });
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.location.href = productUrl;
        }
    });
    const image = card.querySelector("img");
    if (image) {
        image.src = product.image;
        image.alt = product.title;
        image.loading = "lazy";
    }

    const title = card.querySelector("h3");
    if (title) title.textContent = product.title;

    const description = card.querySelector(config.description);
    if (description) description.textContent = product.description;

    const priceBox = card.querySelector(config.price);
    if (priceBox) updatePriceMarkup(priceBox, product);

    card.querySelectorAll("a").forEach((link) => {
        link.href = productUrl;
    });

    if (card.hasAttribute("data-product-id")) {
        card.dataset.productId = product._id;
    }
    card.querySelectorAll("[data-product-id]").forEach((element) => {
        element.dataset.productId = product._id;
    });
    card.querySelectorAll("[data-product]").forEach((element) => {
        element.dataset.product = product.title;
    });
    card.querySelectorAll("[data-price]").forEach((element) => {
        element.dataset.price = product.price;
    });

    const availability = card.querySelector(
        ".phone-cover-badge, .screen-protector-availability, .smartwatch-availability, .chargers-cables-availability, .product-availability"
    );
    if (availability) {
        const stockText = product.stockStatus === "out-of-stock"
            ? "Out of stock"
            : "In stock";
        const indicator = availability.querySelector("span");
        if (indicator) {
            availability.replaceChildren(indicator, document.createTextNode(` ${stockText}`));
        } else {
            availability.textContent = stockText;
        }
    }
}

function updatePriceMarkup(priceBox, product) {
    const original = Number(product.originalPrice);
    const current = Number(product.price);
    const hasDiscount = Number.isFinite(original) && original > current;
    const isStackedPrice = priceBox.classList.contains("top-selling-price") ||
        priceBox.classList.contains("new-arrival-price");

    const contentBox = priceBox.querySelector(":scope > p") || priceBox;
    contentBox.replaceChildren();

    if (hasDiscount) {
        const oldPrice = document.createElement("strong");
        const del = document.createElement("del");
        del.textContent = formatKES(original);
        oldPrice.append(del);
        contentBox.append(oldPrice);
        if (!isStackedPrice) contentBox.append(document.createElement("br"));

        const badge = document.createElement("span");
        badge.className = "discount-badge";
        badge.textContent = `-${Math.round(((original - current) / original) * 100)}%`;
        contentBox.append(badge);
        if (!isStackedPrice) contentBox.append(document.createElement("br"));
    }

    const currentPrice = document.createElement("strong");
    currentPrice.textContent = formatKES(current);
    contentBox.append(currentPrice);
}

function formatKES(amount) {
    return "KSh " + Number(amount).toLocaleString("en-KE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}
