const express = require('express');
const router = express.Router();
const Product = require('../Models/Product');
const { requireAdmin } = require('../Middleware/adminAuth');

const HOMEPAGE_CATEGORIES = [
    'top-selling',
    'covers',
    'new-arrivals',
    'screen-protectors',
    'headphones-earpods',
    'smartwatches',
    'chargers-cables',
    'you-may-like'
];

const CATEGORY_LABELS = {
    'top-selling': 'Top selling products',
    'covers': 'Phone covers',
    'new-arrivals': 'New arrivals',
    'screen-protectors': 'Screen protectors',
    'headphones-earpods': 'Headphones and earpods',
    'smartwatches': 'Smartwatches',
    'chargers-cables': 'Chargers and cables',
    'you-may-like': 'You may also like'
};

// The shop catalogue is uncategorized and has no application-level limit.
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({
            $or: [
                { targetPage: 'shop' },
                { targetPage: { $exists: false }, showInShop: true }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json(products);
    } catch (err) {
        console.error('Fetch shop products error:', err);
        res.status(500).json({ message: 'Failed to fetch shop products.' });
    }
});

// Return products for one of the eight homepage sections.
router.get('/homepage/:category', async (req, res) => {
    const { category } = req.params;

    if (!HOMEPAGE_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid homepage section.' });
    }

    try {
        const products = await Product.find({
            $or: [
                { targetPage: 'homepage', category },
                {
                    targetPage: { $exists: false },
                    showOnHomepage: true,
                    $or: [{ category }, { placement: category }]
                }
            ]
        }).sort({ createdAt: -1 }).limit(10);

        res.status(200).json(products);
    } catch (err) {
        console.error('Homepage products error:', err);
        res.status(500).json({ message: 'Failed to fetch homepage products.' });
    }
});

// Retain the existing shop category endpoint for older frontend code.
router.get('/category/:category', async (req, res) => {
    try {
        const products = await Product.find({
            category: req.params.category,
            showInShop: true
        }).sort({ createdAt: -1 });

        res.status(200).json(products);
    } catch (err) {
        console.error('Category products error:', err);
        res.status(500).json({ message: 'Failed to fetch category products.' });
    }
});

// Search database products by product details and canonical category.
router.get('/search', async (req, res) => {
    try {
        const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        if (!query || query.length > 100) {
            return res.status(400).json({ message: 'Enter a search term of 1 to 100 characters.' });
        }

        const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const terms = query.split(/\s+/).filter(Boolean).slice(0, 8);
        const searchableFields = [
            'title', 'description', 'category', 'placement', 'brand', 'model',
            'features', 'colors', 'warranty',
            'specifications', 'specifications.label', 'specifications.value'
        ];
        const termFilters = terms.map(term => ({
            $or: searchableFields.map(field => ({ [field]: { $regex: escapeRegex(term), $options: 'i' } }))
        }));
        const categoryAliases = [
            { category: 'smartwatches', aliases: ['smartwatch', 'smartwatches', 'smart watch', 'smart watches'] },
            { category: 'covers', aliases: ['cover', 'covers', 'phone cover', 'phone covers', 'phone case', 'phone cases'] },
            { category: 'screen-protectors', aliases: ['screen protector', 'screen protectors', 'screen guard', 'screen guards'] },
            { category: 'headphones-earpods', aliases: ['headphone', 'headphones', 'earpod', 'earpods', 'earbud', 'earbuds'] },
            { category: 'chargers-cables', aliases: ['charger', 'chargers', 'cable', 'cables', 'charging cable', 'charging cables'] },
            { category: 'new-arrivals', aliases: ['new arrival', 'new arrivals'] },
            { category: 'top-selling', aliases: ['top selling', 'top seller', 'top sellers', 'bestseller', 'bestsellers'] },
            { category: 'you-may-like', aliases: ['you may like', 'recommended'] }
        ];
        const compactQuery = query.toLowerCase().replace(/[\s-]+/g, '');
        const matchedCategory = categoryAliases.find(group =>
            group.aliases.some(alias => alias.replace(/[\s-]+/g, '') === compactQuery)
        );
        const alternatives = [{ $and: termFilters }];
        if (matchedCategory) {
            alternatives.push({ $or: [
                { category: matchedCategory.category },
                { placement: matchedCategory.category }
            ] });
        }
        const searchFilter = alternatives.length === 1 ? alternatives[0] : { $or: alternatives };

        const products = await Product.find(searchFilter)
            .select('title description category brand model price originalPrice image stockStatus colors createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(products.map(product => ({
            id: String(product._id),
            name: product.title,
            category: product.category || 'Electronics & Accessories',
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            inStock: product.stockStatus !== 'out-of-stock',
            colors: product.colors || [],
            detailsURL: `Product-details.html?id=${encodeURIComponent(product._id)}`
        })));
    } catch (err) {
        console.error('Product search error:', err);
        res.status(500).json({ message: 'Could not search products.' });
    }
});

// Admin product inventory, including homepage and Shop products.
router.get('/admin/list', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({})
            .select('title originalPrice price targetPage category placement shopBadge showOnHomepage isDemo createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(products.map(product => ({
            ...product,
            targetPage: product.targetPage || (product.showOnHomepage ? 'homepage' : 'shop'),
            category: product.category || product.placement || null
        })));
    } catch (err) {
        console.error('Admin product list error:', err);
        res.status(500).json({ message: 'Failed to load products.' });
    }
});

// Fetch one product for the product details page.
router.get('/:id', async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json(product);
    } catch (err) {
        console.error('Fetch product details error:', err);
        res.status(500).json({ message: 'Failed to fetch product details.' });
    }
});

router.post('/', requireAdmin, async (req, res) => {
    try {
        const {
            title,
            originalPrice,
            price,
            description,
            image,
            targetPage,
            category,
            shopBadge,
            stockStatus,
            brand, model, features, specifications, colors, extraImages, warranty, detailsVerified
        } = req.body;

        if (!['homepage', 'shop'].includes(targetPage)) {
            return res.status(400).json({ message: 'Choose a valid upload section.' });
        }

        if (
            typeof title !== 'string' || !title.trim() ||
            typeof description !== 'string' || !description.trim() ||
            typeof image !== 'string' || !image.trim() ||
            typeof originalPrice !== 'number' || !Number.isFinite(originalPrice) ||
            typeof price !== 'number' || !Number.isFinite(price)
        ) {
            return res.status(400).json({
                message: 'Enter a product name, image path, description and valid prices.'
            });
        }

        if (originalPrice < 0 || price < 0 || price > originalPrice) {
            return res.status(400).json({
                message: price > originalPrice
                    ? 'Selling price cannot exceed original price.'
                    : 'Prices cannot be negative.'
            });
        }

        if (targetPage === 'homepage' && !HOMEPAGE_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: 'Choose a valid homepage category.' });
        }

        const finalShopBadge = shopBadge || 'none';
        if (!['none', 'new-arrival', 'top-seller'].includes(finalShopBadge)) {
            return res.status(400).json({ message: 'Choose a valid Shop badge.' });
        }

        const finalStockStatus = stockStatus || 'in-stock';
        if (!['in-stock', 'out-of-stock'].includes(finalStockStatus)) {
            return res.status(400).json({ message: 'Invalid stock status.' });
        }

        if (targetPage === 'homepage') {
            const homepageCount = await Product.countDocuments({
                $or: [
                    { targetPage: 'homepage', category },
                    {
                        targetPage: { $exists: false },
                        showOnHomepage: true,
                        $or: [{ category }, { placement: category }]
                    }
                ]
            });

            if (homepageCount >= 10) {
                return res.status(409).json({
                    message: `${CATEGORY_LABELS[category]} already has 10 products. Remove one before adding another.`
                });
            }
        }

        const listFields = { features, colors, extraImages };
        for (const [field, value] of Object.entries(listFields)) {
            if (value !== undefined && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) {
                return res.status(400).json({ message: `Invalid ${field} list.` });
            }
        }
        if (features?.length > 12 || colors?.length > 20 || extraImages?.length > 5 || specifications?.length > 20) {
            return res.status(400).json({ message: 'Too many product details. Limit: 12 features, 20 colours/specifications, and 5 extra images.' });
        }
        if (specifications !== undefined && (!Array.isArray(specifications) || specifications.some(item =>
            typeof item !== 'string' && (!item || typeof item.label !== 'string' || typeof item.value !== 'string')
        ))) {
            return res.status(400).json({ message: 'Specifications must be text entries.' });
        }
        if (detailsVerified !== undefined && typeof detailsVerified !== 'boolean') {
            return res.status(400).json({ message: 'Invalid product information verification value.' });
        }
        const product = await new Product({
            title: title.trim(),
            originalPrice,
            price,
            description: description.trim(),
            image: image.trim(),
            category: targetPage === 'homepage' ? category : null,
            targetPage,
            shopBadge: targetPage === 'shop' ? finalShopBadge : 'none',
            placement: targetPage === 'homepage' ? category : 'regular',
            showInShop: targetPage === 'shop',
            showOnHomepage: targetPage === 'homepage',
            stockStatus: finalStockStatus,
            brand: typeof brand === 'string' ? brand.trim() : '',
            model: typeof model === 'string' ? model.trim() : '',
            features: (features || []).map(item => item.trim()).filter(Boolean),
            specifications: (specifications || []).map(item => typeof item === 'string'
                ? item.trim()
                : { label: item.label.trim(), value: item.value.trim() }
            ).filter(item => typeof item === 'string' ? item : item.label && item.value),
            colors: (colors || []).map(item => item.trim()).filter(Boolean),
            extraImages: (extraImages || []).map(item => item.trim()).filter(Boolean),
            warranty: typeof warranty === 'string' ? warranty.trim() : '',
            detailsVerified: detailsVerified === true
        }).save();

        res.status(201).json({
            message: targetPage === 'homepage'
                ? 'Homepage product uploaded successfully.'
                : 'Shop product uploaded successfully.',
            product
        });
    } catch (err) {
        console.error('Create product error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Failed to upload product.' });
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ message: 'Failed to delete product.' });
    }
});

module.exports = router;
