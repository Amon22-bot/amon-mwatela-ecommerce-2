"use strict";

document.addEventListener("DOMContentLoaded", function () {

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

    function updateCartCount() {
        const cartCount = document.getElementById("cartCount");

        if (!cartCount) return;

        try {
            const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

            if (!Array.isArray(cart)) {
                cartCount.textContent = "0";
                return;
            }

            const totalItems = cart.reduce(function (total, item) {
                const quantity = Number(item.quantity);

                if (Number.isFinite(quantity) && quantity > 0) {
                    return total + Math.floor(quantity);
                }

                return total;
            }, 0);

            cartCount.textContent = String(totalItems);
        } catch (error) {
            console.error("Unable to update cart count:", error);
            cartCount.textContent = "0";
        }
    }

    updateCartCount();

    window.addEventListener("storage", function (event) {
        if (event.key === CART_KEY) {
            updateCartCount();
        }
    });

    window.addEventListener("pageshow", updateCartCount);

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            updateCartCount();
        }
    });

    window.updateAMElectronicsCartCount = updateCartCount;

    const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
    const heroDots = Array.from(document.querySelectorAll(".hero-dot"));
    const heroPrev = document.querySelector(".hero-prev");
    const heroNext = document.querySelector(".hero-next");
    const heroSlider = document.querySelector(".hero-slider, .hero");

    let currentHeroSlide = 0;
    let heroTimer = null;
    const HERO_INTERVAL = 5000;

    function showHeroSlide(index) {
        if (heroSlides.length === 0) return;

        currentHeroSlide = (index + heroSlides.length) % heroSlides.length;

        heroSlides.forEach(function (slide, slideIndex) {
            const isActive = slideIndex === currentHeroSlide;
            slide.classList.toggle("active", isActive);
            slide.setAttribute("aria-hidden", isActive ? "false" : "true");
        });

        heroDots.forEach(function (dot, dotIndex) {
            const isActive = dotIndex === currentHeroSlide;
            dot.classList.toggle("active", isActive);
            dot.setAttribute("aria-current", isActive ? "true" : "false");
            if (!isActive) {
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
            heroNext.addEventListener("click", function (event) {
                event.preventDefault();
                nextHeroSlide();
                startHeroSlider();
            });
        }

        if (heroPrev) {
            heroPrev.addEventListener("click", function (event) {
                event.preventDefault();
                previousHeroSlide();
                startHeroSlider();
            });
        }

        heroDots.forEach(function (dot, index) {
            dot.type = "button";
            dot.addEventListener("click", function (event) {
                event.preventDefault();
                showHeroSlide(index);
                startHeroSlider();
            });
        });

        if (heroSlider) {
            heroSlider.addEventListener("mouseenter", stopHeroSlider);
            heroSlider.addEventListener("mouseleave", startHeroSlider);
            heroSlider.addEventListener("focusin", stopHeroSlider);
            heroSlider.addEventListener("focusout", function (event) {
                if (!heroSlider.contains(event.relatedTarget)) {
                    startHeroSlider();
                }
            });
        }
    }

    function ensureCarouselButton(track, side) {
        const container = track && track.parentElement;

        if (!container) return null;

        const selector = side === "prev" ? ".carousel-prev, .top-selling-prev, .new-arrivals-prev" : ".carousel-next, .top-selling-next, .new-arrivals-next";
        const existingButton = container.querySelector(selector);

        if (existingButton) {
            existingButton.type = "button";
            return existingButton;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.className = "carousel-arrow " + (side === "prev" ? "carousel-prev" : "carousel-next");
        button.setAttribute(
            "aria-label",
            side === "prev" ? "Scroll to previous products" : "Scroll to next products"
        );
        button.innerHTML = side === "prev" ? "❮" : "❯";

        if (side === "prev") {
            container.insertBefore(button, track);
        } else {
            container.appendChild(button);
        }

        return button;
    }

    function scrollTrackBy(track, amount) {
        if (!track) return;

        const safeAmount = Number.isFinite(amount) ? amount : 0;
        const currentLeft = Number.isFinite(track.scrollLeft) ? track.scrollLeft : 0;
        const nextLeft = currentLeft + safeAmount;

        if (typeof track.scrollTo === "function") {
            track.scrollTo({
                left: nextLeft,
                behavior: "smooth"
            });
            return;
        }

        if (typeof track.scrollBy === "function") {
            track.scrollBy({
                left: safeAmount,
                behavior: "smooth"
            });
            return;
        }

        track.scrollLeft = nextLeft;
    }

    function setupCarousel(track, previousButton, nextButton, step) {
        if (!track) return;

        if (track.dataset.carouselReady === "true") {
            return;
        }

        const prevControl = previousButton || ensureCarouselButton(track, "prev");
        const nextControl = nextButton || ensureCarouselButton(track, "next");

        if (!prevControl && !nextControl) return;

        track.dataset.carouselReady = "true";

        function getScrollStep() {
            if (step) return Number(step);

            const firstCard = track.firstElementChild;

            if (!firstCard) {
                return Math.max(220, track.clientWidth * 0.8 || 220);
            }

            const cardStyle = window.getComputedStyle(firstCard);
            const cardWidth = firstCard.getBoundingClientRect().width || firstCard.offsetWidth || track.clientWidth * 0.7;
            const marginLeft = parseFloat(cardStyle.marginLeft) || 0;
            const marginRight = parseFloat(cardStyle.marginRight) || 0;
            const trackStyle = window.getComputedStyle(track);
            const gap = parseFloat(trackStyle.columnGap) || parseFloat(trackStyle.gap) || 0;

            return Math.max(220, cardWidth + marginLeft + marginRight + gap);
        }

        function updateButtons() {
            const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
            const currentScroll = track.scrollLeft;

            if (prevControl) {
                prevControl.disabled = currentScroll <= 2;
                prevControl.setAttribute("aria-disabled", prevControl.disabled ? "true" : "false");
            }

            if (nextControl) {
                nextControl.disabled = currentScroll >= maxScroll - 2 || maxScroll <= 2;
                nextControl.setAttribute("aria-disabled", nextControl.disabled ? "true" : "false");
            }
        }

        if (prevControl) {
            prevControl.type = "button";
            prevControl.addEventListener("click", function (event) {
                event.preventDefault();
                scrollTrackBy(track, -getScrollStep());
            });
        }

        if (nextControl) {
            nextControl.type = "button";
            nextControl.addEventListener("click", function (event) {
                event.preventDefault();
                scrollTrackBy(track, getScrollStep());
            });
        }

        track.addEventListener("scroll", updateButtons, { passive: true });
        window.addEventListener("resize", updateButtons);
        window.addEventListener("load", updateButtons);

        requestAnimationFrame(updateButtons);
        setTimeout(updateButtons, 250);

        track.querySelectorAll("img").forEach(function (img) {
            if (!img.complete) {
                img.addEventListener("load", updateButtons, { once: true });
                img.addEventListener("error", updateButtons, { once: true });
            }
        });

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

    setupCarousel(
        document.getElementById("topSellingTrack"),
        document.getElementById("topSellingPrev"),
        document.getElementById("topSellingNext")
    );

    const phoneCoversSection = document.querySelector(".phone-covers-section");

    if (phoneCoversSection) {
        setupCarousel(
            phoneCoversSection.querySelector(".phone-covers-grid"),
            phoneCoversSection.querySelector(".carousel-prev"),
            phoneCoversSection.querySelector(".carousel-next")
        );
    }

    setupCarousel(
        document.querySelector(".new-arrivals-track"),
        document.querySelector(".new-arrivals-prev"),
        document.querySelector(".new-arrivals-next")
    );

    const screenProtectorsSection = document.querySelector(".screen-protectors-section");

    if (screenProtectorsSection) {
        setupCarousel(
            screenProtectorsSection.querySelector(".product-carousel"),
            screenProtectorsSection.querySelector(".carousel-prev"),
            screenProtectorsSection.querySelector(".carousel-next, .carousel-button.carousel-next")
        );
    }

    const headphonesSection = document.querySelector(".headphones-section");

    if (headphonesSection) {
        setupCarousel(
            headphonesSection.querySelector(".products-container"),
            headphonesSection.querySelector(".carousel-prev"),
            headphonesSection.querySelector(".carousel-next")
        );
    }

    const smartwatchesSection = document.querySelector(".smartwatches-section");

    if (smartwatchesSection) {
        setupCarousel(
            smartwatchesSection.querySelector(".smartwatches-grid"),
            smartwatchesSection.querySelector(".carousel-prev"),
            smartwatchesSection.querySelector(".carousel-next")
        );
    }

    const chargersSection = document.querySelector(".chargers-cables-section");

    if (chargersSection) {
        setupCarousel(
            chargersSection.querySelector(".chargers-cables-grid"),
            chargersSection.querySelector(".carousel-prev"),
            chargersSection.querySelector(".carousel-next")
        );
    }

    const recommendedSection = document.querySelector(".you-may-also-like");

    if (recommendedSection) {
        setupCarousel(
            recommendedSection.querySelector(".recommended-products-grid"),
            recommendedSection.querySelector(".carousel-prev"),
            recommendedSection.querySelector(".carousel-next")
        );
    }

    document.querySelectorAll(PRODUCT_CARD_SELECTOR).forEach(function (card) {
        card.querySelectorAll("button").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.stopPropagation();
            });
        });
    });

    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const navbarMenu = document.getElementById("navbarMenu");

    if (mobileMenuButton && navbarMenu) {
        mobileMenuButton.setAttribute("aria-expanded", "false");

        mobileMenuButton.addEventListener("click", function () {
            const isOpen = navbarMenu.classList.toggle("active");
            mobileMenuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
            mobileMenuButton.classList.toggle("active", isOpen);
        });

        navbarMenu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navbarMenu.classList.remove("active");
                mobileMenuButton.classList.remove("active");
                mobileMenuButton.setAttribute("aria-expanded", "false");
            });
        });

        document.addEventListener("click", function (event) {
            const clickedInsideMenu = navbarMenu.contains(event.target);
            const clickedMenuButton = mobileMenuButton.contains(event.target);

            if (!clickedInsideMenu && !clickedMenuButton) {
                navbarMenu.classList.remove("active");
                mobileMenuButton.classList.remove("active");
                mobileMenuButton.setAttribute("aria-expanded", "false");
            }
        });
    }

    document.querySelectorAll(".faq-item").forEach(function (item) {
        const question = item.querySelector("h3, button");

        if (!question) return;

        question.addEventListener("click", function () {
            const isOpen = item.classList.toggle("active");
            question.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    });

    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    console.log("AM Electronics homepage JavaScript initialized successfully.");
});
