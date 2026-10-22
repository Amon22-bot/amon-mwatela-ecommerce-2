

/* =========================================================
   AM ELECTRONICS AND ACCESSORIES
   HOMEPAGE JAVASCRIPT
   File: index.js
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       1. SHARED SETTINGS
    ===================================================== */

    const CART_KEY = "amElectronicsCart";

    const PRODUCT_CARD_SELECTOR = [
        ".top-selling-card",
        ".phone-cover-card",
        ".new-arrival-card",
        ".screen-protector-card",
        ".product-card",
        ".smartwatch-card",
        ".chargers-cables-card",
        ".recommended-product-card"
    ].join(", ");


    /* =====================================================
       2. SHOPPING CART COUNT
    ===================================================== */

    function updateCartCount() {

        const cartCount = document.getElementById("cartCount");

        if (!cartCount) return;

        try {

            const cart = JSON.parse(
                localStorage.getItem(CART_KEY) || "[]"
            );

            if (!Array.isArray(cart)) {
                cartCount.textContent = "0";
                return;
            }

            const totalItems = cart.reduce(function (total, item) {

                const quantity = Number(item.quantity);

                if (
                    Number.isFinite(quantity) &&
                    quantity > 0
                ) {
                    return total + Math.floor(quantity);
                }

                return total;

            }, 0);

            cartCount.textContent = totalItems;

        } catch (error) {

            console.error(
                "Unable to update cart count:",
                error
            );

            cartCount.textContent = "0";

        }

    }


    updateCartCount();


    /*
       Update the cart count when another page or tab
       changes the shared shopping cart.
    */

    window.addEventListener("storage", function (event) {

        if (event.key === CART_KEY) {
            updateCartCount();
        }

    });


    /*
       Refresh the cart count when returning to the page.
    */

    window.addEventListener("pageshow", updateCartCount);


    document.addEventListener("visibilitychange", function () {

        if (!document.hidden) {
            updateCartCount();
        }

    });


    /*
       Allow other scripts on this page to refresh the
       displayed count when necessary.
    */

    window.updateAMElectronicsCartCount = updateCartCount;


    /* =====================================================
       3. HERO SLIDER
    ===================================================== */

    const heroSlides = Array.from(
        document.querySelectorAll(".hero-slide")
    );

    const heroDots = Array.from(
        document.querySelectorAll(".hero-dot")
    );

    const heroPrev = document.querySelector(".hero-prev");

    const heroNext = document.querySelector(".hero-next");

    const heroSlider = document.querySelector(
        ".hero-slider, .hero"
    );

    let currentHeroSlide = 0;

    let heroTimer = null;

    const HERO_INTERVAL = 5000;


    function showHeroSlide(index) {

        if (heroSlides.length === 0) return;

        currentHeroSlide =
            (index + heroSlides.length) % heroSlides.length;

        heroSlides.forEach(function (slide, slideIndex) {

            const isActive =
                slideIndex === currentHeroSlide;

            slide.classList.toggle("active", isActive);

            slide.setAttribute(
                "aria-hidden",
                isActive ? "false" : "true"
            );

        });


        heroDots.forEach(function (dot, dotIndex) {

            const isActive =
                dotIndex === currentHeroSlide;

            dot.classList.toggle("active", isActive);

            if (isActive) {

                dot.setAttribute("aria-current", "true");

            } else {

                dot.removeAttribute("aria-current");

            }

        });

    }


    function nextHeroSlide() {
        showHeroSlide(currentHeroSlide + 1);
    }


    function previousHeroSlide() {
        showHeroSlide(currentHeroSlide - 1);
    }


    function stopHeroSlider() {

        if (heroTimer !== null) {

            clearInterval(heroTimer);

            heroTimer = null;

        }

    }


    function startHeroSlider() {

        stopHeroSlider();

        if (heroSlides.length < 2) return;

        heroTimer = setInterval(function () {

            nextHeroSlide();

        }, HERO_INTERVAL);

    }


    if (heroSlides.length > 0) {

        showHeroSlide(0);

        startHeroSlider();


        if (heroNext) {

            heroNext.addEventListener("click", function () {

                nextHeroSlide();

                startHeroSlider();

            });

        }


        if (heroPrev) {

            heroPrev.addEventListener("click", function () {

                previousHeroSlide();

                startHeroSlider();

            });

        }


        heroDots.forEach(function (dot, index) {

            dot.addEventListener("click", function () {

                showHeroSlide(index);

                startHeroSlider();

            });

        });


        if (heroSlider) {

            heroSlider.addEventListener(
                "mouseenter",
                stopHeroSlider
            );

            heroSlider.addEventListener(
                "mouseleave",
                startHeroSlider
            );

            heroSlider.addEventListener(
                "focusin",
                stopHeroSlider
            );

            heroSlider.addEventListener(
                "focusout",
                function (event) {

                    if (
                        !heroSlider.contains(event.relatedTarget)
                    ) {
                        startHeroSlider();
                    }

                }
            );

        }

    }


    /* =====================================================
       4. REUSABLE CAROUSEL CONTROLS
    ===================================================== */

    function setupCarousel(
        track,
        previousButton,
        nextButton,
        step
    ) {

        if (!track) return;


        function getScrollStep() {

            if (step) return step;

            const firstCard = track.firstElementChild;

            if (!firstCard) {
                return track.clientWidth * 0.8;
            }

            const cardStyle =
                window.getComputedStyle(firstCard);

            const cardWidth =
                firstCard.getBoundingClientRect().width;

            const marginLeft =
                parseFloat(cardStyle.marginLeft) || 0;

            const marginRight =
                parseFloat(cardStyle.marginRight) || 0;

            const trackStyle =
                window.getComputedStyle(track);

            const gap =
                parseFloat(trackStyle.columnGap) ||
                parseFloat(trackStyle.gap) ||
                0;

            return cardWidth + marginLeft + marginRight + gap;

        }


        function updateButtons() {

            const maximumScroll = Math.max(
                0,
                track.scrollWidth - track.clientWidth
            );

            const currentScroll = track.scrollLeft;


            if (previousButton) {

                previousButton.disabled =
                    currentScroll <= 3;

                previousButton.setAttribute(
                    "aria-disabled",
                    previousButton.disabled ? "true" : "false"
                );

            }


            if (nextButton) {

                nextButton.disabled =
                    maximumScroll <= 3 ||
                    currentScroll >= maximumScroll - 3;

                nextButton.setAttribute(
                    "aria-disabled",
                    nextButton.disabled ? "true" : "false"
                );

            }

        }


        if (previousButton) {

            previousButton.addEventListener(
                "click",
                function () {

                    track.scrollBy({

                        left: -getScrollStep(),

                        behavior: "smooth"

                    });

                }
            );

        }


        if (nextButton) {

            nextButton.addEventListener(
                "click",
                function () {

                    track.scrollBy({

                        left: getScrollStep(),

                        behavior: "smooth"

                    });

                }
            );

        }


        track.addEventListener(
            "scroll",
            updateButtons,
            { passive: true }
        );

        window.addEventListener("resize", updateButtons);

        requestAnimationFrame(updateButtons);

        setTimeout(updateButtons, 300);


        /*
           Recalculate after product images load because
           image dimensions can affect the card layout.
        */

        track.querySelectorAll("img").forEach(function (img) {

            if (!img.complete) {

                img.addEventListener(
                    "load",
                    updateButtons,
                    { once: true }
                );

                img.addEventListener(
                    "error",
                    updateButtons,
                    { once: true }
                );

            }

        });


        /*
           Allow recalculation if products are added to
           a carousel dynamically.
        */

        if ("MutationObserver" in window) {

            const observer = new MutationObserver(function () {

                updateButtons();

            });

            observer.observe(track, {
                childList: true,
                subtree: true
            });

        }

    }


    /* =====================================================
       5. TOP SELLING CAROUSEL
    ===================================================== */

    setupCarousel(
        document.getElementById("topSellingTrack"),
        document.getElementById("topSellingPrev"),
        document.getElementById("topSellingNext")
    );


    /* =====================================================
       6. PHONE COVERS CAROUSEL
    ===================================================== */

    const phoneCoversSection = document.querySelector(
        ".phone-covers-section"
    );

    if (phoneCoversSection) {

        setupCarousel(
            phoneCoversSection.querySelector(
                ".phone-covers-grid"
            ),
            phoneCoversSection.querySelector(
                ".carousel-prev"
            ),
            phoneCoversSection.querySelector(
                ".carousel-next"
            )
        );

    }


    /* =====================================================
       7. NEW ARRIVALS CAROUSEL
    ===================================================== */

    setupCarousel(
        document.querySelector(".new-arrivals-track"),
        document.querySelector(".new-arrivals-prev"),
        document.querySelector(".new-arrivals-next")
    );


    /* =====================================================
       8. SCREEN PROTECTORS CAROUSEL
    ===================================================== */

    const screenProtectorsSection = document.querySelector(
        ".screen-protectors-section"
    );

    if (screenProtectorsSection) {

        setupCarousel(
            screenProtectorsSection.querySelector(
                ".product-carousel"
            ),
            screenProtectorsSection.querySelector(
                ".carousel-prev"
            ),
            screenProtectorsSection.querySelector(
                ".carousel-next, .carousel-button.carousel-next"
            )
        );

    }


    /* =====================================================
       9. HEADPHONES CAROUSEL
    ===================================================== */

    const headphonesSection = document.querySelector(
        ".headphones-section"
    );

    if (headphonesSection) {

        setupCarousel(
            headphonesSection.querySelector(
                ".products-container"
            ),
            headphonesSection.querySelector(
                ".carousel-prev"
            ),
            headphonesSection.querySelector(
                ".carousel-next"
            )
        );

    }


    /* =====================================================
       10. SMARTWATCHES CAROUSEL
    ===================================================== */

    const smartwatchesSection = document.querySelector(
        ".smartwatches-section"
    );

    if (smartwatchesSection) {

        setupCarousel(
            smartwatchesSection.querySelector(
                ".smartwatches-grid"
            ),
            smartwatchesSection.querySelector(
                ".carousel-prev"
            ),
            smartwatchesSection.querySelector(
                ".carousel-next"
            )
        );

    }


    /* =====================================================
       11. CHARGERS AND CABLES CAROUSEL
    ===================================================== */

    const chargersSection = document.querySelector(
        ".chargers-cables-section"
    );

    if (chargersSection) {

        setupCarousel(
            chargersSection.querySelector(
                ".chargers-cables-grid"
            ),
            chargersSection.querySelector(
                ".carousel-prev"
            ),
            chargersSection.querySelector(
                ".carousel-next"
            )
        );

    }


    /* =====================================================
       12. YOU MAY ALSO LIKE CAROUSEL
    ===================================================== */

    const recommendedSection = document.querySelector(
        ".you-may-also-like"
    );

    if (recommendedSection) {

        setupCarousel(
            recommendedSection.querySelector(
                ".recommended-products-grid"
            ),
            recommendedSection.querySelector(
                ".carousel-prev"
            ),
            recommendedSection.querySelector(
                ".carousel-next"
            )
        );

    }


    /* =====================================================
       13. HOMEPAGE PRODUCT NAVIGATION
    ===================================================== */

    /*
       Homepage product cards should link to the product
       details page. Customers add products to their cart
       from the product details page, not from homepage
       product cards.
    */

    document.querySelectorAll(
        PRODUCT_CARD_SELECTOR
    ).forEach(function (card) {

        /*
           Prevent buttons inside a product card from
           accidentally triggering the card's navigation.
        */

        card.querySelectorAll("button").forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();

                    }
                );

            }
        );

    });


    /*
       No homepage search handler is registered here.

       Global search is managed separately by global-search.js.
       This prevents the old search behaviour from redirecting
       customers to shop.html.
    */


    /* =====================================================
       14. MOBILE NAVIGATION
    ===================================================== */

    const mobileMenuButton = document.getElementById(
        "mobileMenuButton"
    );

    const navbarMenu = document.getElementById(
        "navbarMenu"
    );


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


        /*
           Close the mobile menu after selecting a link.
        */

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
           Close the menu when the customer clicks outside it.
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
       15. FAQ ACCORDION
    ===================================================== */

    document.querySelectorAll(".faq-item").forEach(
        function (item) {

            const question = item.querySelector(
                "h3, button"
            );

            if (!question) return;


            question.addEventListener(
                "click",
                function () {

                    const isOpen =
                        item.classList.toggle("active");

                    question.setAttribute(
                        "aria-expanded",
                        isOpen ? "true" : "false"
                    );

                }
            );

        }
    );


    /* =====================================================
       16. CURRENT YEAR
    ===================================================== */

    const currentYear = document.getElementById(
        "currentYear"
    );

    if (currentYear) {

        currentYear.textContent =
            new Date().getFullYear();

    }


    /* =====================================================
       17. INITIALISE
    ===================================================== */

    console.log(
        "AM Electronics homepage JavaScript initialized successfully."
    );

});

