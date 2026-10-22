const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    productId: { type: String, trim: true, maxlength: 100, default: '' },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    image: { type: String, trim: true, maxlength: 1000, default: '' },
    color: { type: String, trim: true, maxlength: 60, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 10000 },
    lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
    reference: { type: String, required: true, unique: true, index: true },
    customer: {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        phone: { type: String, required: true, trim: true, maxlength: 30 },
        email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' }
    },
    delivery: {
        county: { type: String, required: true, trim: true, maxlength: 100 },
        town: { type: String, required: true, trim: true, maxlength: 100 },
        estate: { type: String, required: true, trim: true, maxlength: 150 },
        address: { type: String, required: true, trim: true, maxlength: 300 },
        instructions: { type: String, trim: true, maxlength: 1000, default: '' }
    },
    items: { type: [OrderItemSchema], required: true, validate: items => items.length > 0 && items.length <= 50 },
    productsSubtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: null, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['new', 'dispatched'], default: 'new', index: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    deliveryPaymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    confirmed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
