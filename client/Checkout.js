
/* ==========================================
   AM ELECTRONICS AND ACCESSORIES
   CHECKOUT AND ORDER SUBMISSION
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    // ======================================
    // CONFIGURATION
    // ======================================

    const CART_KEY = "amElectronicsCart";

    // ======================================
    // ELEMENTS
    // ======================================

    const checkoutForm = document.getElementById("checkoutForm");

    const checkoutProducts = document.getElementById("checkoutProducts");

    const checkoutSubtotal = document.getElementById("checkoutSubtotal");

    const checkoutTotal = document.getElementById("checkoutTotal");

    const emptyCartMessage = document.getElementById("emptyCartMessage");

    const checkoutError = document.getElementById("checkoutError");

    const placeOrderButton = document.getElementById("placeOrderButton");

    const currentYear = document.getElementById("currentYear");


    // ======================================
    // GENERAL HELPERS
    // ======================================

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    function formatMoney(amount) {

        return "KSh " + Number(amount).toLocaleString("en-KE", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

    }


    function getCart() {

        try {

            const storedCart = localStorage.getItem(CART_KEY);

            if (!storedCart) {
                return [];
            }

            const parsedCart = JSON.parse(storedCart);

            if (!Array.isArray(parsedCart)) {
                return [];
            }

            return parsedCart
                .filter(function (item) {

                    return item &&
                        typeof item === "object" &&
                        String(item.name || "").trim() !== "";

                })
                .map(function (item) {

                    return {
                        id: item.id ?? "",
                        name: String(item.name || "").trim(),
                        price: item.price,
                        image: item.image || "",
                        color: String(item.color || "").trim(),
                        quantity: Math.floor(Number(item.quantity))
                    };

                })
                .filter(function (item) {

                    return Number.isSafeInteger(item.quantity) &&
                        item.quantity > 0 &&
                        item.quantity <= 10000 &&
                        Number.isFinite(getPrice(item.price)) &&
                        getPrice(item.price) >= 0;

                });

        } catch (error) {

            console.error("Unable to read shopping cart:", error);

            return [];

        }

    }


    // Supports numeric prices and strings such as:
    // 2500, "2500", "KSh 2,500"

    function getPrice(price) {

        if (typeof price === "number") {
            return price;
        }

        const cleanedPrice = String(price ?? "")
            .replace(/,/g, "")
            .replace(/[^\d.-]/g, "");

        if (!cleanedPrice || cleanedPrice === "-" || cleanedPrice === ".") {
            return NaN;
        }

        return Number(cleanedPrice);

    }


    function calculateSubtotal(cart) {

        return cart.reduce(function (total, item) {

            return total + getPrice(item.price) * item.quantity;

        }, 0);

    }


    // ======================================
    // SAFE IMAGE DISPLAY
    // ======================================

    function createProductImage(imagePath, productName) {

        const imageContainer = document.createElement("div");

        imageContainer.className = "checkout-product-image";

        if (imagePath) {

            const image = document.createElement("img");

            image.src = imagePath;

            image.alt = productName;

            image.loading = "lazy";

            image.addEventListener("error", function () {

                image.remove();

                const icon = document.createElement("i");

                icon.className =
                    "fa-solid fa-image checkout-product-placeholder";

                icon.setAttribute("aria-hidden", "true");

                imageContainer.appendChild(icon);

            });

            imageContainer.appendChild(image);

        } else {

            const icon = document.createElement("i");

            icon.className =
                "fa-solid fa-image checkout-product-placeholder";

            icon.setAttribute("aria-hidden", "true");

            imageContainer.appendChild(icon);

        }

        return imageContainer;

    }


    // ======================================
    // RENDER PRODUCTS
    // ======================================

    function renderCheckout() {

        const cart = getCart();

        checkoutProducts.replaceChildren();

        const subtotal = calculateSubtotal(cart);

        checkoutSubtotal.textContent = formatMoney(subtotal);

        checkoutTotal.textContent = formatMoney(subtotal);


        if (cart.length === 0) {

            emptyCartMessage.hidden = false;

            checkoutProducts.hidden = true;

            placeOrderButton.disabled = true;

            return;

        }


        emptyCartMessage.hidden = true;

        checkoutProducts.hidden = false;

        placeOrderButton.disabled = false;


        cart.forEach(function (item) {

            const product = document.createElement("div");

            product.className = "checkout-product";


            // Product image

            product.appendChild(
                createProductImage(item.image, item.name)
            );


            // Product details

            const info = document.createElement("div");

            info.className = "checkout-product-info";


            const name = document.createElement("h3");

            name.textContent = item.name;


            const quantity = document.createElement("p");

            quantity.className = "checkout-product-quantity";

            quantity.textContent =
                "Qty: " + item.quantity +
                " × " + formatMoney(getPrice(item.price));


            const price = document.createElement("p");

            price.className = "checkout-product-price";

            price.textContent = formatMoney(
                getPrice(item.price) * item.quantity
            );


            info.appendChild(name);

            info.appendChild(quantity);

            info.appendChild(price);


            product.appendChild(info);

            checkoutProducts.appendChild(product);

        });

    }


    // Display the cart immediately.

    renderCheckout();


    // ======================================
    // GET CUSTOMER DETAILS
    // ======================================

    function getCustomerDetails() {

        return {

            name: document.getElementById("customerName")
                .value.trim(),

            phone: document.getElementById("customerPhone")
                .value.trim(),

            email: document.getElementById("customerEmail")
                .value.trim(),

            county: document.getElementById("county")
                .value.trim(),

            town: document.getElementById("town")
                .value.trim(),

            estate: document.getElementById("estate")
                .value.trim(),

            address: document.getElementById("deliveryAddress")
                .value.trim(),

            instructions: document.getElementById("deliveryInstructions")
                .value.trim()

        };

    }


    // ======================================
    // FORM VALIDATION
    // ======================================

    function validateCustomer(customer) {

        if (!customer.name ||
            !customer.phone ||
            !customer.county ||
            !customer.town ||
            !customer.estate ||
            !customer.address) {

            return "Please complete all required customer and delivery fields.";

        }


        // Accept Kenyan mobile formats such as:
        // 0712345678
        // 0112345678
        // +254712345678
        // 254712345678

        const normalizedPhone = customer.phone.replace(/[\s()-]/g, "");

        const kenyanMobilePattern =
            /^(?:0[17]\d{8}|\+?254[17]\d{8})$/;

        if (!kenyanMobilePattern.test(normalizedPhone)) {

            return "Please enter a valid Kenyan mobile number, e.g. 0712345678.";

        }


        if (customer.email) {

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(customer.email)) {

                return "Please enter a valid email address.";

            }

        }


        return "";

    }


    // ======================================
    // PLACE ORDER
    // ======================================

    checkoutForm.addEventListener("submit", function (event) {

        event.preventDefault();

        checkoutError.textContent = "";
        checkoutError.classList.remove("success");


        // Refresh cart to catch changes made in another tab.

        const cart = getCart();


        if (cart.length === 0) {

            checkoutError.textContent =
                "Your cart is empty. Please add products before placing an order.";

            renderCheckout();

            return;

        }


        const customer = getCustomerDetails();

        const validationMessage = validateCustomer(customer);


        if (validationMessage) {

            checkoutError.textContent = validationMessage;

            return;

        }


        if (!document.getElementById("confirmOrder").checked) {

            checkoutError.textContent =
                "Please confirm that you have reviewed your order.";

            return;

        }


        const buttonLabel = placeOrderButton.querySelector("span");
        placeOrderButton.disabled = true;
        if (buttonLabel) buttonLabel.textContent = "Submitting Order...";

        const payload = {
            customer: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email
            },
            delivery: {
                county: customer.county,
                town: customer.town,
                estate: customer.estate,
                address: customer.address,
                instructions: customer.instructions
            },
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                image: item.image,
                color: item.color || "",
                unitPrice: getPrice(item.price),
                quantity: item.quantity
            }))
        };

        fetch(`${window.AM_API_BASE_URL}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
            .then(async response => {
                const result = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(result.message || "Order submission failed.");
                }
                return result;
            })
            .then(result => {
                localStorage.removeItem(CART_KEY);
                checkoutForm.reset();
                renderCheckout();
                checkoutError.classList.add("success");
                checkoutError.textContent =
                    `Order submitted successfully. Your reference is ${result.order.reference}.`;
                if (buttonLabel) buttonLabel.textContent = "Order Submitted";
            })
            .catch(error => {
                checkoutError.textContent = error.message ||
                    "We could not submit your order. Your cart is saved; please try again.";
            })
            .finally(() => {
                if (getCart().length > 0) {
                    placeOrderButton.disabled = false;
                    if (buttonLabel) buttonLabel.textContent = "Submit Order";
                }
            });

    });


    // ======================================
    // UPDATE CART WHEN RETURNING TO CHECKOUT
    // ======================================

    window.addEventListener("pageshow", function () {

        renderCheckout();

    });


    window.addEventListener("storage", function (event) {

        if (event.key === CART_KEY) {

            renderCheckout();

        }

    });

});
