
/* =========================================================
   AM ELECTRONICS AND ACCESSORIES
   GLOBAL PRODUCT SEARCH

   Searches MongoDB directly, including product details,
   and includes matching products from the site catalogues.
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       1. CONFIGURATION
    ===================================================== */

    const API_BASE_URL = `${window.AM_API_BASE_URL}/api/products`;

    const PRODUCT_CARD_SELECTOR = [
        ".top-selling-card",
        ".phone-cover-card",
        ".new-arrival-card",
        ".screen-protector-card",
        ".product-card",
        ".smartwatch-card",
        ".chargers-cables-card",
        ".recommended-product-card",
        ".shop-product-card",
        ".headphone-card",
        ".product-item",
        "[data-product-id]"
    ].join(", ");


    /*
       These sections are hidden while search results
       are displayed.

       Hero containers are included so hero slides
       do not appear underneath the search results.
    */

    const HIDE_DURING_SEARCH_SELECTOR = [
        ".hero",
        ".hero-slider",
        ".hero-section",
        ".hero-carousel",
        ".hero-slides",
        ".hero-banner",

        ".top-selling-section",
        ".phone-covers-section",
        ".new-arrivals-section",
        ".screen-protectors-section",
        ".headphones-section",
        ".smartwatches-section",
        ".chargers-cables-section",
        ".you-may-also-like",

        ".shop-products"
    ].join(", ");


    const searchInputs = [
        document.getElementById("productSearch"),
        document.getElementById("shopProductSearch")
    ].filter(Boolean);


    const searchButtons = [
        document.getElementById("searchButton")
    ].filter(Boolean);


    let catalogue = [];

    let originalElementStates = new Map();

    let searchResultsContainer = null;
    let searchResultsGrid = null;
    let searchResultsMessage = null;
    let searchClearButton = null;

    let otherPageProductsPromise = null;

    let searchRequestNumber = 0;
    let searchDebounceTimer = null;


    /* =====================================================
       2. NORMALISE SEARCH TEXT
    ===================================================== */

    function normaliseText(value) {

        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9\s-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       3. GENERATE PRODUCT IDS WHEN NEEDED
    ===================================================== */

    function createProductId(name) {

        return normaliseText(name)
            .replace(/\s+/g, "-")
            .replace(/^-+|-+$/g, "");

    }


    /* =====================================================
       4. GET A SAFE PRODUCT DETAILS URL
    ===================================================== */

    function getProductDetailsURL(product) {

        const id = product.id || createProductId(product.name);

        return "product-details.html?id=" +
            encodeURIComponent(id);

    }


    /* =====================================================
       5. EXTRACT PRODUCTS FROM EXISTING HTML CARDS
    ===================================================== */

    function extractCardProduct(card, baseURL) {

        if (!card) {
            return null;
        }


        const nameElement = card.querySelector(
            ".product-name, " +
            ".shop-product-name, " +
            ".top-selling-name, " +
            ".new-arrival-name, " +
            ".phone-cover-name, " +
            "h3, h2"
        );


        const imageElement = card.querySelector("img");


        const name = nameElement
            ? nameElement.textContent.trim()
            : "";


        /*
           Ignore elements that are not actual product cards.
        */

        if (!name) {
            return null;
        }


        const image = imageElement
            ? (
                imageElement.getAttribute("src") ||
                imageElement.getAttribute("data-src") ||
                ""
            )
            : "";


        /*
           Read product IDs and links where available.
        */

        let productId =
            card.dataset.productId ||
            card.dataset.id ||
            "";


        let detailsURL = "";


        const productLink = card.matches("a[href]")
            ? card
            : card.querySelector("a[href]");


        if (productLink) {

            const href = productLink.getAttribute("href") || "";

            try {

                const parsedURL = new URL(
                    href,
                    baseURL || window.location.href
                );


                const linkedId =
                    parsedURL.searchParams.get("id") ||
                    parsedURL.searchParams.get("product");


                if (linkedId) {

                    productId = linkedId;

                }


                /*
                   Preserve a product details link only if
                   it actually points to a product details page.
                */

                if (
                    /product-details\.html$/i.test(
                        parsedURL.pathname
                    ) &&
                    linkedId
                ) {

                    detailsURL = parsedURL.href;

                }

            } catch (error) {

                console.warn(
                    "Unable to read product URL:",
                    error
                );

            }

        }


        if (!productId) {

            productId = createProductId(name);

        }


        /*
           Extract the price.
        */

        const priceElement = card.querySelector(
            ".current-price, " +
            ".product-price, " +
            ".smartwatch-price, " +
            ".top-selling-price, " +
            ".new-arrival-price, " +
            ".price, " +
            ".new-price, " +
            "ins"
        );


        let numericPrice = 0;
        let originalPrice = 0;


        if (priceElement) {

            const delElement = priceElement.querySelector("del");
            const oldPriceText = delElement?.textContent
                .replace(/,/g, "")
                .replace(/[^\d.]/g, "");
            originalPrice = Number(oldPriceText) || 0;

            const currentPriceElement = priceElement.querySelector(
                ".current-price, .new-price, ins"
            ) || Array.from(priceElement.querySelectorAll("strong"))
                .filter(element => !element.querySelector("del"))
                .pop();
            const currentPriceText = (currentPriceElement?.textContent ||
                priceElement.textContent.replace(delElement?.textContent || "", ""))
                .replace(/,/g, "")
                .replace(/[^\d.]/g, "");


            numericPrice = Number(currentPriceText);


            if (!Number.isFinite(numericPrice)) {

                numericPrice = 0;

            }

        }


        /*
           Extract category and description.
        */

        let category =
            card.dataset.category ||
            (
                card.querySelector(
                    ".product-category, .shop-product-category"
                )?.textContent.trim() || ""
            );

        // Built-in homepage cards do not always declare a category.
        // Infer it from their containing section so category searches
        // can find them even when the product name omits the category.
        if (!category) {
            const section = card.closest(
                ".smartwatches-section, .phone-covers-section, " +
                ".screen-protectors-section, .headphones-section, " +
                ".chargers-cables-section, .new-arrivals-section, " +
                ".top-selling-section, .you-may-also-like"
            );
            if (section) {
                const sectionCategories = [
                    [".smartwatches-section", "Smartwatches"],
                    [".phone-covers-section", "Phone covers"],
                    [".screen-protectors-section", "Screen protectors"],
                    [".headphones-section", "Headphones and earpods"],
                    [".chargers-cables-section", "Chargers and cables"],
                    [".new-arrivals-section", "New arrivals"],
                    [".top-selling-section", "Top selling products"],
                    [".you-may-also-like", "You may also like"]
                ];
                category = sectionCategories.find(([selector]) =>
                    section.matches(selector)
                )?.[1] || "";
            }
        }


        const descriptionElement = card.querySelector(
            ".product-description, .description, .smartwatch-description, " +
            ".screen-protector-description, .chargers-cables-description, " +
            ".top-selling-details > p, .new-arrival-details > p, " +
            ".phone-cover-details > p"
        );


        const description = descriptionElement
            ? descriptionElement.textContent.trim()
            : card.textContent.trim();


        /*
           Determine stock status.
        */

        const cardText = normaliseText(card.textContent);


        const isOutOfStock =
            /out of stock|sold out|unavailable/.test(cardText);


        return {

            id: productId,

            name: name,

            category: category,

            price: numericPrice,

            originalPrice: originalPrice,

            image: image,

            description: description,

            colors: [],

            inStock: !isOutOfStock,

            detailsURL: detailsURL

        };

    }


    /* =====================================================
       6. GET PRODUCTS FROM products.js
    ===================================================== */

    function getSharedCatalogueProducts() {

        /*
           products.js should load before global-search.js.

           A top-level const products declaration can be
           accessed here when both files are classic scripts.
        */

        if (
            typeof products !== "undefined" &&
            Array.isArray(products)
        ) {

            return products.map(function (product) {

                return {

                    ...product,

                    id: product.id ||
                        createProductId(product.name),

                    detailsURL: getProductDetailsURL(product)

                };

            });

        }


        console.warn(
            "products.js catalogue was not found. " +
            "Searching available HTML product cards instead."
        );


        return [];

    }


    /* =====================================================
       7. COLLECT PRODUCTS FROM THE CURRENT PAGE
    ===================================================== */

    function getCurrentPageProducts() {

        const cards = document.querySelectorAll(
            PRODUCT_CARD_SELECTOR
        );


        return Array.from(cards)
            .map(function (card) {

                return extractCardProduct(
                    card,
                    window.location.href
                );

            })
            .filter(Boolean);

    }


    /* =====================================================
       8. COLLECT PRODUCTS FROM THE OTHER HTML PAGE
    ===================================================== */

    async function getProductsFromOtherPage() {

        /*
           Cache the request so we do not fetch the other
           page again every time the customer searches.
        */

        if (otherPageProductsPromise) {

            return otherPageProductsPromise;

        }


        const currentPath = window.location.pathname
            .toLowerCase();


        const otherPage = currentPath.endsWith("shop.html")
            ? "index.html"
            : "shop.html";


        otherPageProductsPromise = (async function () {

            try {

                const otherPageURL = new URL(
                    otherPage,
                    window.location.href
                );


                const response = await fetch(
                    otherPageURL.href,
                    {
                        cache: "no-store"
                    }
                );


                if (!response.ok) {

                    throw new Error(
                        "Could not load " + otherPage
                    );

                }


                const html = await response.text();


                const parser = new DOMParser();


                const otherDocument = parser.parseFromString(
                    html,
                    "text/html"
                );


                const cards = otherDocument.querySelectorAll(
                    PRODUCT_CARD_SELECTOR
                );


                return Array.from(cards)
                    .map(function (card) {

                        return extractCardProduct(
                            card,
                            otherPageURL.href
                        );

                    })
                    .filter(Boolean);

            } catch (error) {

                console.warn(
                    "Could not collect products from " +
                    otherPage + ".",
                    error
                );


                /*
                   Searching the shared catalogue and
                   current page can still continue.
                */

                return [];

            }

        })();


        return otherPageProductsPromise;

    }


    /* =====================================================
       9. COMBINE PRODUCTS AND REMOVE DUPLICATES
    ===================================================== */

    function mergeProducts(...productGroups) {

        const mergedProducts = new Map();


        productGroups.flat().forEach(function (product) {

            if (!product || !product.name) {

                return;

            }


            const key = normaliseText(product.name);


            if (!key) {

                return;

            }


            if (!mergedProducts.has(key)) {

                mergedProducts.set(
                    key,
                    {
                        ...product
                    }
                );


                return;

            }


            const existing = mergedProducts.get(key);


            /*
               Keep useful information from either source
               when the existing entry is incomplete.
            */

            if (!existing.image && product.image) {

                existing.image = product.image;

            }


            if (
                (!existing.price || existing.price <= 0) &&
                product.price > 0
            ) {

                existing.price = product.price;

            }


            if (!existing.category && product.category) {

                existing.category = product.category;

            }


            if (!existing.description && product.description) {

                existing.description = product.description;

            }


            if (
                (!existing.colors ||
                    existing.colors.length === 0) &&
                Array.isArray(product.colors)
            ) {

                existing.colors = product.colors;

            }


            if (
                !existing.detailsURL &&
                product.detailsURL
            ) {

                existing.detailsURL = product.detailsURL;

            }


            /*
               Prefer a definite stock status from the
               shared catalogue when one is available.
            */

            if (
                typeof existing.inStock !== "boolean" &&
                typeof product.inStock === "boolean"
            ) {

                existing.inStock = product.inStock;

            }

        });


        return Array.from(mergedProducts.values());

    }


    /* =====================================================
       10. CREATE THE INDEPENDENT RESULTS SECTION
    ===================================================== */

    function createSearchResultsArea() {

        searchResultsContainer = document.createElement(
            "section"
        );


        searchResultsContainer.id = "globalSearchResults";


        searchResultsContainer.className =
            "global-search-results";


        searchResultsContainer.setAttribute(
            "aria-label",
            "Product search results"
        );


        searchResultsContainer.hidden = true;


        /* Heading */

        const heading = document.createElement("div");


        heading.className = "global-search-heading";


        const headingText = document.createElement("div");


        headingText.className =
            "global-search-heading-text";


        const title = document.createElement("h2");


        title.textContent = "Search Results";


        searchResultsMessage = document.createElement("p");


        searchResultsMessage.className =
            "global-search-message";


        headingText.appendChild(title);

        headingText.appendChild(searchResultsMessage);


        /* Clear Search button */

        searchClearButton = document.createElement("button");


        searchClearButton.type = "button";


        searchClearButton.className =
            "global-search-clear";


        searchClearButton.textContent = "Clear Search";


        searchClearButton.addEventListener(
            "click",
            clearSearch
        );


        heading.appendChild(headingText);

        heading.appendChild(searchClearButton);


        /* Independent product grid */

        searchResultsGrid = document.createElement("div");


        searchResultsGrid.id = "globalSearchGrid";


        searchResultsGrid.className =
            "global-search-grid";


        searchResultsContainer.appendChild(heading);

        searchResultsContainer.appendChild(
            searchResultsGrid
        );


        /*
           Place the search results immediately after
           the navbar, outside all product sections.
        */

        const navbar = document.querySelector(
            ".site-navbar"
        );


        if (navbar) {

            navbar.insertAdjacentElement(
                "afterend",
                searchResultsContainer
            );

        } else {

            document.body.prepend(
                searchResultsContainer
            );

        }

    }


    /* =====================================================
       11. FORMAT PRODUCT PRICES
    ===================================================== */

    function formatPrice(price) {

        const amount = Number(price);


        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {

            return "Price on request";

        }


        if (amount === 0) {

            return "Price on request";

        }


        return "KSh " + amount.toLocaleString(
            "en-KE",
            {
                maximumFractionDigits: 2
            }
        );

    }


    /* =====================================================
       12. CREATE A SEARCH RESULT PRODUCT CARD
    ===================================================== */

    function createSearchProductCard(product) {

        const card = document.createElement("article");


        card.className = "smartwatch-card global-search-card";


        const link = document.createElement("a");


        link.className = "smartwatch-product-link global-search-product-link";


        link.href = product.detailsURL ||
            getProductDetailsURL(product);
        link.setAttribute("aria-label", `View details for ${product.name}`);


        /* Product image */

        const imageWrapper = document.createElement("div");


        imageWrapper.className = "smartwatch-image global-search-image-wrapper";


        if (product.image) {

            const image = document.createElement("img");


            image.src = product.image;


            image.alt = product.name;


            image.loading = "lazy";


            image.onerror = function () {

                image.style.display = "none";


                if (
                    !imageWrapper.querySelector(
                        ".global-search-image-placeholder"
                    )
                ) {

                    const placeholder =
                        document.createElement("span");


                    placeholder.className =
                        "global-search-image-placeholder";


                    placeholder.textContent =
                        "Image unavailable";


                    imageWrapper.appendChild(
                        placeholder
                    );

                }

            };


            imageWrapper.appendChild(image);

        } else {

            const placeholder = document.createElement(
                "span"
            );


            placeholder.className =
                "global-search-image-placeholder";


            placeholder.textContent = "Image unavailable";


            imageWrapper.appendChild(placeholder);

        }


        /* Product information */

        const details = document.createElement("div");


        details.className = "smartwatch-details global-search-product-details";


        const name = document.createElement("h3");


        name.textContent = product.name;


        const description = document.createElement("p");
        description.className = "smartwatch-description";
        description.textContent = product.description || "";

        const price = document.createElement("p");
        price.className = "smartwatch-price";

        const originalPrice = Number(product.originalPrice);
        const currentPrice = Number(product.price);
        if (Number.isFinite(originalPrice) && originalPrice > currentPrice) {
            const oldPrice = document.createElement("strong");
            const oldPriceText = document.createElement("del");
            oldPriceText.textContent = formatPrice(originalPrice);
            oldPrice.appendChild(oldPriceText);
            price.append(oldPrice, document.createElement("br"));

            const discount = document.createElement("span");
            discount.className = "discount-badge";
            discount.textContent = `-${Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%`;
            price.append(discount, document.createElement("br"));
        }

        const currentPriceText = document.createElement("strong");
        currentPriceText.textContent = formatPrice(currentPrice);
        price.appendChild(currentPriceText);


        details.appendChild(name);

        details.appendChild(description);

        details.appendChild(price);


        link.appendChild(imageWrapper);

        link.appendChild(details);

        card.appendChild(link);


        return card;

    }


    /* =====================================================
       13. FIND MATCHING PRODUCTS
    ===================================================== */

    function findMatchingProducts(query) {

        const words = normaliseText(query)
            .split(/\s+/)
            .filter(Boolean);


        if (words.length === 0) {

            return [];

        }


        const normalizedQuery = normaliseText(query).replace(/[\s-]+/g, "");
        const categoryAliases = {
            smartwatches: ["smartwatch", "smartwatches"],
            covers: ["cover", "covers", "phonecover", "phonecovers", "phonecase", "phonecases"],
            screenprotectors: ["screenprotector", "screenprotectors", "screenguard", "screenguards"],
            headphones: ["headphone", "headphones", "earpod", "earpods", "earbud", "earbuds"],
            chargers: ["charger", "chargers", "cable", "cables"]
        };
        const categoryGroup = Object.entries(categoryAliases).find(([, aliases]) =>
            aliases.includes(normalizedQuery)
        )?.[0];

        return catalogue.filter(function (product) {

            const normalizedCategory = normaliseText(product.category).replace(/[\s-]+/g, "");
            const categoryMatches = categoryGroup && (
                (categoryGroup === "smartwatches" && normalizedCategory.includes("smartwatch")) ||
                (categoryGroup === "covers" && /cover|case/.test(normalizedCategory)) ||
                (categoryGroup === "screenprotectors" && /screenprotector|screenguard/.test(normalizedCategory)) ||
                (categoryGroup === "headphones" && /headphone|earpod|earbud|earphone/.test(normalizedCategory)) ||
                (categoryGroup === "chargers" && /charger|cable/.test(normalizedCategory))
            );

            if (categoryMatches) return true;

            const searchableText = normaliseText([

                product.name,

                product.category,

                product.description,

                product.id,

                ...(Array.isArray(product.colors)
                    ? product.colors
                    : [])

            ].join(" "));


            /*
               Every search word must match somewhere in
               the product information.

               Example:
               "wireless headphones" can match a product
               whose name contains both words.
            */

            return words.every(function (word) {

                return searchableText.includes(word);

            });

        });

    }


    /* =====================================================
       14. HIDE HERO SLIDES AND PRODUCT SECTIONS
    ===================================================== */

    function hideExistingSections() {

        


        document.querySelectorAll(
            HIDE_DURING_SEARCH_SELECTOR
        ).forEach(function (element) {

            /*
               Save the original inline display value
               so it can be restored accurately.
            */

            if (!originalElementStates.has(element)) {

                originalElementStates.set(
                    element,
                    {
                        display: element.style.display,
                        hidden: element.hidden
                    }
                );

            }


            element.style.display = "none";

        });

    }


    /* =====================================================
       15. RESTORE THE ORIGINAL PAGE LAYOUT
    ===================================================== */

    function restoreExistingSections() {

        originalElementStates.forEach(
            function (state, element) {

                element.style.display = state.display;

                element.hidden = state.hidden;

            }
        );


        originalElementStates.clear();

    }


    /* =====================================================
       16. DISPLAY SEARCH RESULTS
    ===================================================== */

    async function performGlobalSearch(searchTerm) {

        const query = String(
            searchTerm || ""
        ).trim();


        if (!query) {

            clearSearch();

            return;

        }


        const thisSearchRequest = ++searchRequestNumber;

        // Capture visible cards before their sections are hidden.
        const currentPageProducts = getCurrentPageProducts();


        searchResultsContainer.hidden = false;


        searchResultsGrid.replaceChildren();


        searchResultsMessage.textContent =
            "Searching products...";


        /*
           Hide the homepage hero and existing product
           sections so only the independent search grid
           appears beneath the navbar.
        */

        hideExistingSections();


        let matches;
        try {
            catalogue = currentPageProducts;
            const [response, otherPageProducts] = await Promise.all([
                fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`),
                getProductsFromOtherPage()
            ]);
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || "Search request failed.");
            if (thisSearchRequest !== searchRequestNumber) return;
            const databaseProducts = Array.isArray(result) ? result : [];
            catalogue = [...currentPageProducts, ...otherPageProducts];
            const pageMatches = findMatchingProducts(query);
            // Prefer database product records, then add matching built-in cards.
            matches = mergeProducts(databaseProducts, pageMatches);
        } catch (error) {
            if (thisSearchRequest !== searchRequestNumber) return;
            console.error("Global product search failed:", error);
            searchResultsGrid.replaceChildren();
            searchResultsMessage.textContent = "Search is unavailable. Make sure the backend is running, then try again.";
            return;
        }


        searchResultsGrid.replaceChildren();


        /* No matching products */

        if (matches.length === 0) {

            searchResultsMessage.textContent =
                'No products found for "' +
                query +
                '". Try another product name or category.';


            const emptyState = document.createElement(
                "div"
            );


            emptyState.className =
                "global-search-empty";


            const emptyIcon = document.createElement(
                "i"
            );


            emptyIcon.className =
                "fa-solid fa-box-open";


            emptyIcon.setAttribute(
                "aria-hidden",
                "true"
            );


            const emptyHeading = document.createElement(
                "h3"
            );


            emptyHeading.textContent =
                "No Products Found";


            const emptyMessage = document.createElement(
                "p"
            );


            emptyMessage.textContent =
                "Try searching for headphones, phones, " +
                "chargers, covers or speakers.";


            emptyState.appendChild(emptyIcon);

            emptyState.appendChild(emptyHeading);

            emptyState.appendChild(emptyMessage);


            searchResultsGrid.appendChild(emptyState);

        } else {

            searchResultsMessage.textContent =
                matches.length +
                (
                    matches.length === 1
                        ? " matching product found."
                        : " matching products found."
                );


            matches.forEach(function (product) {

                searchResultsGrid.appendChild(
                    createSearchProductCard(product)
                );

            });

        }


        /*
           Scroll to the independent results area.
        */

        searchResultsContainer.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }


    /* =====================================================
       17. HANDLE SEARCH SUBMISSION
    ===================================================== */

    function handleSearchSubmit(event, selectedInput) {

        clearTimeout(searchDebounceTimer);

        if (event) {

            event.preventDefault();

        }


        let input = selectedInput || null;


        if (!input) {

            input = searchInputs.find(function (element) {

                return element.value.trim() !== "";

            }) || searchInputs[0];

        }


        if (!input) {

            return;

        }


        performGlobalSearch(input.value);

    }


    /* =====================================================
       18. CONNECT SEARCH INPUTS
    ===================================================== */

    searchInputs.forEach(function (input) {

        /*
           Search when Enter is pressed.
        */

        input.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    handleSearchSubmit(
                        event,
                        input
                    );

                }

            }
        );


        /*
           If the customer clears the input, restore
           the original page layout.
        */

        input.addEventListener("input", function () {
            clearTimeout(searchDebounceTimer);
            const query = input.value.trim();
            if (!query) {
                clearSearch();
                return;
            }
            if (query.length < 2) {
                searchRequestNumber++;
                searchResultsContainer.hidden = true;
                searchResultsGrid.replaceChildren();
                searchResultsMessage.textContent = "";
                restoreExistingSections();
                return;
            }
            searchDebounceTimer = setTimeout(() => {
                handleSearchSubmit(null, input);
            }, 350);
        });

    });


    /* =====================================================
       19. CONNECT NAVBAR SEARCH BUTTON
    ===================================================== */

    searchButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                const input = document.getElementById(
                    "productSearch"
                );


                handleSearchSubmit(
                    event,
                    input
                );

            },
            true
        );

    });


    /* =====================================================
       20. CONNECT SHOP PAGE SEARCH BUTTON
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const button = event.target.closest(
                ".shop-search button, #shopSearchButton"
            );


            if (!button) {

                return;

            }


            const shopInput = document.getElementById(
                "shopProductSearch"
            );


            if (!shopInput) {

                return;

            }


            event.preventDefault();


            handleSearchSubmit(
                event,
                shopInput
            );

        },
        true
    );


    /* =====================================================
       21. PREVENT SEARCH FORM RELOADS
    ===================================================== */

    searchInputs.forEach(function (input) {

        const form = input.closest("form");


        if (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();


                    handleSearchSubmit(
                        event,
                        input
                    );

                }
            );

        }

    });


    /* =====================================================
       22. CLEAR SEARCH AND RESTORE THE PAGE
    ===================================================== */

    function clearSearch() {

        /*
           Invalidate any search still waiting for
           products from the other page to load.
        */

        searchRequestNumber++;


        searchInputs.forEach(function (input) {

            input.value = "";

        });


        if (searchResultsContainer) {

            searchResultsContainer.hidden = true;


            searchResultsGrid.replaceChildren();


            searchResultsMessage.textContent = "";

        }


        restoreExistingSections();

    }


    /* =====================================================
       23. INITIALISE GLOBAL SEARCH
    ===================================================== */

    createSearchResultsArea();




    console.log(
        "AM Electronics global product search initialized."
    );

});

