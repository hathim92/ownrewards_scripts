const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaxSchema = new Schema({
    title: { type: String },
    type: { type: String }, // P for percentage, F for fixed
    rate: { type: Number },
    amount: { type: Number }
});

const DiscountSchema = new Schema({
    id: String,
    title: { type: String },
    type: { type: String }, // P for percentage, F for fixed
    rate: { type: Number },
    amount: { type: Number }
});

const ProductSchema = new Schema({
    itemName: { type: String },
    itemId: { type: String },
    quantity: { type: Number },
    category: { type: String },
    pricePerUnit: { type: Number },
    totalPrice: { type: Number },
    tax: { type: Number },
    discount: { type: Number }
});

const CustomerSchema = new Schema({
    name: { type: String },
    phoneNo: { type: String },
    address: { type: String },
    dateOfBirth: { type: Date },
    anniversary: { type: Date }
});

const BillSchema = new Schema({
    restID: { type: String },
    customer: { type: CustomerSchema },
    orderDetails: {
        orderId: { type: String },
        order_type: { type: String },
        payment_type: { type: String },
        core_total: { type: Number },
        tax_total: { type: Number },
        total: { type: Number },
        discount_total: { type: Number },
        created_on: { type: Date, default: Date.now },
        order_from: String,
        comment: String
    },
    Tax: { type: [TaxSchema], default: [] },
    Discount: { type: [DiscountSchema], default: [] },
    items: { type: [ProductSchema], required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "LoyaltyCustomer" },
    loyaltyPointsEarned: { type: Number, default: 0 },

    loyaltyInfluenced: { type: Boolean, default: false },
    influenceType: {
        type: String,
        enum: ['points_redemption', 'tier_benefit', 'campaign_coupon', 'reward_redemption', 'points_earned', 'none'],
        default: 'none'
    },
    influenceMetadata: {
        campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
        rewardId: { type: Schema.Types.ObjectId, ref: 'RewardV2' },
        couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
        pointsRedeemed: { type: Number, default: 0 }
    },

    refundStatus: {
        type: String,
        enum: ['none', 'partially_refunded', 'refunded'],
        default: 'none'
    },
    refundAmount: { type: Number, default: 0 },
    refundReason: String,
    refundDate: Date,
    pointsReversed: { type: Number, default: 0 },

    editHistory: [{
        editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        fieldChanged: String,
        previousValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        reason: String
    }],

    outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
    belongsTo: { type: Schema.Types.ObjectId, ref: "Organization" },
    customerTier: { type: String, default: "Bronze" },
    createdAt: { type: Date, default: Date.now },

    sourceInfo: {
        source: String,
        csvId: Schema.Types.ObjectId,
        mappingId: Schema.Types.ObjectId,
        rowNumber: Number
    }
});

BillSchema.index({ outletId: 1 });
BillSchema.index({ "orderDetails.orderId": 1 });
BillSchema.index({ "customer.phoneNo": 1, outletId: 1 });
BillSchema.index({ createdAt: 1 });
BillSchema.index({ belongsTo: 1, outletId: 1 });
BillSchema.index({ customerId: 1, loyaltyInfluenced: 1 });
BillSchema.index({ belongsTo: 1, outletId: 1, loyaltyInfluenced: 1, createdAt: -1 });
BillSchema.index({ influenceType: 1, createdAt: -1 });
BillSchema.index({ refundStatus: 1, refundDate: -1 });
BillSchema.index({ belongsTo: 1, outletId: 1, refundStatus: 1 });

const Bill = mongoose.model("LoyaltyBill", BillSchema);
module.exports = Bill;
