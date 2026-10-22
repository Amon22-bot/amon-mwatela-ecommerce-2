/* =========================================================
   AM ELECTRONICS AND ACCESSORIES
   PRODUCT DATABASE MODEL
   File: models/Product.js
========================================================= */

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({

    // 1. PRODUCT NAME
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },

    // 2. ORIGINAL PRICE BEFORE DISCOUNT
    originalPrice: {
        type: Number,
        required: true,
        min: 0
    },

    // 3. CURRENT SELLING PRICE
    price: {
        type: Number,
        required: true,
        min: 0
    },

    // 4. PRODUCT DESCRIPTION
    description: {
        type: String,
        required: true,
        trim: true
    },

    // 5. PRODUCT IMAGE PATH
    image: {
        type: String,
        required: true,
        trim: true
    },

    // Extended information shown on the product details page.
    brand: { type: String, trim: true, maxlength: 100, default: '' },
    model: { type: String, trim: true, maxlength: 100, default: '' },
    features: { type: [String], default: [] },
    // Accept free-form specification lines; legacy { label, value } entries remain readable.
    specifications: { type: [mongoose.Schema.Types.Mixed], default: [] },
    colors: { type: [String], default: [] },
    extraImages: { type: [String], default: [] },
    warranty: { type: String, trim: true, maxlength: 300, default: '' },
    detailsVerified: { type: Boolean, default: false },
    // Exhibition-only catalog entries; do not treat these details as verified stock.
    isDemo: { type: Boolean, default: false, index: true },
    demoBatch: { type: String, trim: true, default: '' },
    // 6. PRODUCT CATEGORY
    category: {
        type: String,
        default: null,

        enum: [
            null,
            'top-selling',
            'covers',
            'new-arrivals',
            'screen-protectors',
            'headphones-earpods',
            'smartwatches',
            'chargers-cables',
            'you-may-like',
            'phones',
            'bluetooth-speakers',
            'ring-lights'
        ]
    },

    // Products are managed in one of the two admin upload sections.
    targetPage: {
        type: String,
        enum: ['homepage', 'shop'],
        default: 'shop',
        index: true
    },

    // Optional Shop-page label; independent of homepage categories and limits.
    shopBadge: {
        type: String,
        enum: ['none', 'new-arrival', 'top-seller'],
        default: 'none'
    },

    // 7. HOMEPAGE PLACEMENT
    placement: {
        type: String,
        default: 'regular',

        enum: [
            'regular',
            'covers',
            'top-selling',
            'new-arrivals',
            'screen-protectors',
            'headphones-earpods',
            'smartwatches',
            'chargers-cables',
            'you-may-like'
        ]
    },

    // 8. SHOW PRODUCT IN SHOP
    showInShop: {
        type: Boolean,
        default: true
    },

    // 9. SHOW PRODUCT ON HOMEPAGE
    showOnHomepage: {
        type: Boolean,
        default: false
    },

    // 10. STOCK MANAGEMENT
    stockStatus: {
        type: String,
        enum: ['in-stock', 'out-of-stock'],
        default: 'in-stock'
    },

    // 11. PRODUCT CREATION DATE
    createdAt: {
        type: Date,
        default: Date.now
    }

});

// Validate that the selling price does not exceed the original price.
ProductSchema.pre('validate', function () {

    if (
        typeof this.originalPrice === 'number' &&
        typeof this.price === 'number' &&
        this.price > this.originalPrice
    ) {
        this.invalidate(
            'price',
            'The selling price cannot exceed the original price.'
        );
    }

});

// Calculate the discount percentage automatically.
// Example: original price 1000, selling price 800 = 20%.
ProductSchema.virtual('discountPercentage').get(function () {

    if (
        !this.originalPrice ||
        this.originalPrice <= 0 ||
        this.price >= this.originalPrice
    ) {
        return 0;
    }

    return Math.round(
        ((this.originalPrice - this.price) / this.originalPrice) * 100
    );

});

// Include virtual properties when converting products to JSON.
ProductSchema.set('toJSON', {
    virtuals: true
});

ProductSchema.set('toObject', {
    virtuals: true
});

// Create or reuse the Product model.
module.exports =
    mongoose.models.Product ||
    mongoose.model('Product', ProductSchema);

