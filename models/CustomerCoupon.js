const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CustomerCouponSchema = new Schema(
    {
        couponId: {
            type: Schema.Types.ObjectId,
            ref: "Coupon",
            required: true,
            index: true
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "LoyaltyCustomer",
            required: true,
            index: true
        },
        customerCode: {
            type: String,
            uppercase: true,
            index: true
        },
        status: {
            type: String,
            enum: ["issued", "active", "redeemed", "partially_redeemed", "expired", "revoked"],
            default: "issued",
            index: true
        },
        issuedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        firstUsedAt: Date,
        lastUsedAt: Date,
        usageTracking: {
            timesUsed: { type: Number, default: 0 },
            maxUsesAllowed: { type: Number, default: 1 },
            remainingUses: Number,
            totalDiscountGiven: { type: Number, default: 0 }
        },
        redemptions: [
            {
                billId: { type: Schema.Types.ObjectId, ref: "LoyaltyBill" },
                orderId: String,
                orderAmount: Number,
                discountGiven: Number,
                redeemedAt: { type: Date, default: Date.now },
                channel: { type: String, enum: ["pos", "online", "app", "whatsapp"] }
            }
        ],
        issuanceSource: {
            type: {
                type: String,
                enum: ["manual", "campaign", "workflow", "feedback", "referral", "welcome", "birthday", "rule_engine"]
            },
            sourceId: Schema.Types.ObjectId,
            sourceName: String,
            triggeredBy: { type: Schema.Types.ObjectId, ref: "User" }
        },
        snapshot: {
            couponName: String,
            couponCode: String,
            discountType: String,
            discountValue: Number,
            minPurchaseAmount: Number,
            maxDiscountAmount: Number
        },
        notifications: [
            {
                type: { type: String, enum: ["issued", "reminder", "expiring_soon", "expired"] },
                sentAt: Date,
                channel: String
            }
        ],
        tags: [String],
        notes: String,
        outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
        belongsTo: { type: Schema.Types.ObjectId, ref: "Organization", required: true }
    },
    {
        timestamps: true
    }
);

CustomerCouponSchema.index({ customerId: 1, status: 1, expiresAt: 1 });
CustomerCouponSchema.index({ customerCode: 1, status: 1 });
CustomerCouponSchema.index({ couponId: 1, customerId: 1 });
CustomerCouponSchema.index({ belongsTo: 1, outletId: 1, issuedAt: -1 });

CustomerCouponSchema.virtual("isUsable").get(function () {
    if (this.status === "expired" || this.status === "revoked") return false;
    if (new Date() > this.expiresAt) return false;
    if (this.usageTracking.timesUsed >= this.usageTracking.maxUsesAllowed) return false;
    return true;
});

CustomerCouponSchema.virtual("hasRemainingUses").get(function () {
    return this.usageTracking.timesUsed < this.usageTracking.maxUsesAllowed;
});

CustomerCouponSchema.methods.recordRedemption = async function (redemptionDetails) {
    this.usageTracking.timesUsed += 1;
    this.usageTracking.totalDiscountGiven += redemptionDetails.discountGiven;
    this.lastUsedAt = new Date();

    if (!this.firstUsedAt) {
        this.firstUsedAt = new Date();
    }

    this.redemptions.push({
        billId: redemptionDetails.billId,
        orderId: redemptionDetails.orderId,
        orderAmount: redemptionDetails.orderAmount,
        discountGiven: redemptionDetails.discountGiven,
        redeemedAt: new Date(),
        channel: redemptionDetails.channel
    });

    if (this.usageTracking.timesUsed >= this.usageTracking.maxUsesAllowed) {
        this.status = "redeemed";
    } else {
        this.status = "partially_redeemed";
    }

    return await this.save();
};

CustomerCouponSchema.statics.findActiveForCustomer = function (customerId, filters = {}) {
    const now = new Date();
    return this.find({
        customerId: customerId,
        status: { $in: ["issued", "active", "partially_redeemed"] },
        expiresAt: { $gt: now },
        ...filters
    }).populate("couponId");
};

CustomerCouponSchema.statics.validateCode = async function (code, customerId, orderDetails = {}) {
    const LoyaltyCustomer = mongoose.model("LoyaltyCustomer");
    const customer = await LoyaltyCustomer.findById(customerId);

    if (!customer) {
        return { valid: false, reason: "Customer profile not found" };
    }
    const orgQuery = customer.belongsTo ? { belongsTo: customer.belongsTo } : {};

    let customerCoupon = await this.findOne({
        $or: [{ customerCode: code.toUpperCase() }, { "snapshot.couponCode": code.toUpperCase() }],
        customerId: customerId,
        status: { $in: ["issued", "active", "partially_redeemed"] },
        ...orgQuery
    }).populate("couponId");

    let coupon;
    if (!customerCoupon) {
        const Coupon = mongoose.model("Coupon");
        coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            status: "active",
            isActive: true,
            validFrom: { $lte: new Date() },
            validUntil: { $gte: new Date() },
            ...orgQuery
        });

        if (!coupon) {
            return { valid: false, reason: "Coupon not found or not issued to this customer" };
        }
    } else {
        coupon = customerCoupon.couponId;
    }

    if (!coupon) {
        return { valid: false, reason: "Linked coupon definition not found" };
    }

    if (coupon.eligibilityRuleId) {
        return { valid: false, reason: "Coupon eligibility rules require the backend Rule Engine service." };
    }

    if (!customerCoupon) {
        return { valid: false, reason: "Coupon auto-issuing requires the backend Rule Engine service." };
    }

    if (!customerCoupon.isUsable) {
        return { valid: false, reason: "Coupon has expired or already used" };
    }

    if (new Date() > customerCoupon.expiresAt) {
        return { valid: false, reason: "Coupon has expired" };
    }

    if (coupon.minPurchaseAmount && orderDetails.amount < coupon.minPurchaseAmount) {
        return { valid: false, reason: `Minimum purchase of ₹${coupon.minPurchaseAmount} required` };
    }

    const discount = coupon.calculateDiscount(orderDetails.amount, orderDetails.items);
    return {
        valid: true,
        customerCoupon,
        coupon,
        discount
    };
};

module.exports = mongoose.model("CustomerCoupon", CustomerCouponSchema);
