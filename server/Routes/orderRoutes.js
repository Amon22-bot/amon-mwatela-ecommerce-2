const express = require('express');
const mongoose = require('mongoose');
const Order = require('../Models/Order');
const Product = require('../Models/Product');
const { issueAdminSession, requireAdmin, destroyAdminSession } = require('../Middleware/adminAuth');

const router = express.Router();
const failedAdminLogins = new Map();
const ORDER_STATUSES = ['new', 'dispatched'];

router.post('/admin/login', (req, res) => {
    if (!process.env.ADMIN_PASSWORD) {
        return res.status(503).json({ message: 'Admin sign-in is not configured. Add ADMIN_PASSWORD to server/.env, then restart the backend.' });
    }
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attempt = failedAdminLogins.get(ip);
    if (attempt && now - attempt.startedAt < 15 * 60 * 1000 && attempt.count >= 5) {
        return res.status(429).json({ message: 'Too many failed sign-in attempts. Try again in 15 minutes.' });
    }

    const session = issueAdminSession(req.body?.password);
    if (!session.token) {
        const current = failedAdminLogins.get(ip);
        const next = current && now - current.startedAt < 15 * 60 * 1000
            ? { startedAt: current.startedAt, count: current.count + 1 }
            : { startedAt: now, count: 1 };
        failedAdminLogins.set(ip, next);
        return res.status(401).json({ message: session.error });
    }

    failedAdminLogins.delete(ip);
    return res.status(200).json({ token: session.token, expiresIn: session.expiresIn });
});

router.post('/admin/logout', requireAdmin, (req, res) => {
    destroyAdminSession(req);
    res.status(200).json({ message: 'Signed out.' });
});

router.get('/admin/orders', requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        const productIds = [...new Set(orders.flatMap(order => (order.items || [])
            .map(item => item.productId)
            .filter(id => mongoose.isValidObjectId(id))))];
        const products = productIds.length
            ? await Product.find({ _id: { $in: productIds } }).select('_id image').lean()
            : [];
        const productImages = new Map(products.map(product => [String(product._id), product.image]));
        const ordersWithImages = orders.map(order => ({
            ...order,
            items: (order.items || []).map(item => ({
                ...item,
                image: productImages.get(String(item.productId)) || item.image || ''
            }))
        }));
        res.status(200).json(ordersWithImages);
    } catch (error) {
        console.error('Admin order list error:', error.message);
        res.status(500).json({ message: 'Could not load orders.' });
    }
});

router.patch('/admin/orders/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid order ID.' });
    }
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Choose a valid order status.' });
    }
    try {
        const order = await Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        res.status(200).json({ message: 'Order status updated.', status: order.status });
    } catch (error) {
        console.error('Update order status error:', error.message);
        res.status(500).json({ message: 'Could not update the order status.' });
    }
});

router.patch('/admin/orders/:id/flags', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { paid, deliveryPaid, confirmed } = req.body || {};
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid order ID.' });
    }
    if (typeof paid !== 'boolean' && typeof deliveryPaid !== 'boolean' && typeof confirmed !== 'boolean') {
        return res.status(400).json({ message: 'Select a valid payment or confirmation value.' });
    }

    const changes = {};
    if (typeof paid === 'boolean') changes.paymentStatus = paid ? 'paid' : 'pending';
    if (typeof deliveryPaid === 'boolean') changes.deliveryPaymentStatus = deliveryPaid ? 'paid' : 'pending';
    if (typeof confirmed === 'boolean') changes.confirmed = confirmed;

    try {
        const order = await Order.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        res.status(200).json({
            message: 'Order payment and confirmation updated.',
            paymentStatus: order.paymentStatus,
            deliveryPaymentStatus: order.deliveryPaymentStatus,
            confirmed: order.confirmed
        });
    } catch (error) {
        console.error('Update order payment or confirmation error:', error.message);
        res.status(500).json({ message: 'Could not update the order.' });
    }
});

function createOrderReference() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `AME-${date}-${random}`;
}

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

router.post('/', async (req, res) => {
    try {
        const customer = req.body.customer || {};
        const delivery = req.body.delivery || {};
        const customerInfo = {
            name: cleanText(customer.name, 120),
            phone: cleanText(customer.phone, 30),
            email: cleanText(customer.email, 254).toLowerCase()
        };
        const deliveryInfo = {
            county: cleanText(delivery.county, 100),
            town: cleanText(delivery.town, 100),
            estate: cleanText(delivery.estate, 150),
            address: cleanText(delivery.address, 300),
            instructions: cleanText(delivery.instructions, 1000)
        };

        if (!customerInfo.name || !customerInfo.phone || !deliveryInfo.county ||
            !deliveryInfo.town || !deliveryInfo.estate || !deliveryInfo.address) {
            return res.status(400).json({ message: 'Complete all required customer and delivery details.' });
        }

        const normalizedPhone = customerInfo.phone.replace(/[\s()-]/g, '');
        if (!/^(?:0[17]\d{8}|\+?254[17]\d{8})$/.test(normalizedPhone)) {
            return res.status(400).json({ message: 'Enter a valid Kenyan mobile number.' });
        }
        if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }
        if (!Array.isArray(req.body.items) || req.body.items.length === 0 || req.body.items.length > 50) {
            return res.status(400).json({ message: 'Your order must contain between 1 and 50 products.' });
        }

        const submittedItems = req.body.items;
        const databaseIds = [...new Set(submittedItems
            .map(item => String(item?.productId || ''))
            .filter(id => mongoose.isValidObjectId(id)))];
        const databaseProducts = databaseIds.length
            ? await Product.find({ _id: { $in: databaseIds } }).select('title price image stockStatus').lean()
            : [];
        const productsById = new Map(databaseProducts.map(product => [String(product._id), product]));

        const items = [];
        for (const submitted of submittedItems) {
            const productId = cleanText(submitted?.productId, 100);
            const storedProduct = productsById.get(productId);
            if (mongoose.isValidObjectId(productId) && !storedProduct) {
                return res.status(400).json({ message: 'A product in your cart is no longer available. Please refresh your cart.' });
            }
            if (storedProduct?.stockStatus === 'out-of-stock') {
                return res.status(409).json({ message: `${storedProduct.title} is out of stock.` });
            }

            const name = cleanText(storedProduct?.title || submitted?.name, 150);
            const quantity = Number(submitted?.quantity);
            const submittedPrice = Number(submitted?.unitPrice);
            const unitPrice = storedProduct ? Number(storedProduct.price) : submittedPrice;
            if (!name || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99 ||
                !Number.isFinite(unitPrice) || unitPrice < 0) {
                return res.status(400).json({ message: 'One or more products in your cart have invalid details.' });
            }

            items.push({
                productId,
                name,
                image: cleanText(storedProduct?.image || submitted?.image, 1000),
                color: cleanText(submitted?.color, 60),
                unitPrice,
                quantity,
                lineTotal: unitPrice * quantity
            });
        }

        const productsSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const order = await Order.create({
            reference: createOrderReference(),
            customer: customerInfo,
            delivery: deliveryInfo,
            items,
            productsSubtotal,
            total: productsSubtotal
        });

        console.log(`New order received: ${order.reference} (${items.length} product line${items.length === 1 ? '' : 's'})`);
        return res.status(201).json({
            message: 'Your order was submitted successfully.',
            order: { reference: order.reference, total: order.total, createdAt: order.createdAt }
        });
    } catch (error) {
        console.error('Order submission error:', error.message);
        return res.status(500).json({ message: 'We could not submit your order. Please try again.' });
    }
});

module.exports = router;
