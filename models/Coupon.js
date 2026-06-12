const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");

const CouponSchema = new Schema(
    {
        name: { type: String, required: true },
        description: String,
        code: {
            type: String,
            uppercase: true,
            required: true
        },

        discountType: {
            type: String,
            enum: ["percentage", "fixed_amount", "free_product", "free_shipping", "buy_x_get_y"],
            required: true
        },
        discountValue: {
            type: Number,
            required: true,
            min: [0, "Discount value cannot be negative"]
        },

        maxDiscountAmount: {
            type: Number,
            min: [0, "Max discount amount cannot be negative"]
        },
        usageLimits: {
            totalUses: Number,
            usesPerCustomer: { type: Number, default: 1 }
        },

        currentUsage: {
            totalRedemptions: { type: Number, default: 0 },
            uniqueCustomers: { type: Number, default: 0 },
            totalDiscountGiven: { type: Number, default: 0 },
            lastUsedAt: Date
        },

        validFrom: { type: Date, required: true },
        validUntil: { type: Date, required: true },
        validity: {
            label: { type: String, default: "day" },
            value: { type: Number }
        },

        applicability: {
            applicableOn: {
                type: String,
                enum: ["all", "specific_categories", "specific_products", "all_except"],
                default: "all"
            },
            categories: [String],
            productIds: [String],
            excludedCategories: [String],
            excludedProductIds: [String]
        },

        eligibilityRuleId: {
            type: Schema.Types.ObjectId,
            ref: "Rule"
        },

        status: {
            type: String,
            enum: ["draft", "active", "paused", "expired", "depleted"],
            default: "draft"
        },
        isActive: { type: Boolean, default: true },
        isPublic: { type: Boolean, default: true },

        tags: [String],
        notes: String,

        outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
        belongsTo: { type: Schema.Types.ObjectId, ref: "Organization", required: true },

        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
    },
    {
        timestamps: true
    }
);

CouponSchema.index({ belongsTo: 1, code: 1 }, { unique: true });
CouponSchema.index({ belongsTo: 1, outletId: 1, status: 1 });
CouponSchema.index({ validFrom: 1, validUntil: 1 });
CouponSchema.index({ status: 1, isActive: 1 });

CouponSchema.virtual("isExpired").get(function () {
    return new Date() > this.validUntil;
});

CouponSchema.virtual("isDepleted").get(function () {
    if (!this.usageLimits.totalUses) return false;
    return this.currentUsage.totalRedemptions >= this.usageLimits.totalUses;
});

CouponSchema.virtual("remainingUses").get(function () {
    if (!this.usageLimits.totalUses) return Infinity;
    return this.usageLimits.totalUses - this.currentUsage.totalRedemptions;
});

CouponSchema.methods.generateCustomerCode = function (customer, context = {}) {
    const uniquePart = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${this.code}-${uniquePart}`;
};

CouponSchema.methods.calculateDiscount = function (orderAmount, orderItems = []) {
    const cleanOrderAmount = Number(orderAmount) || 0;
    let discountableAmount = cleanOrderAmount;

    if (this.applicability && this.applicability.applicableOn !== "all" && orderItems && orderItems.length > 0) {
        let qualifyingItems = [];

        if (this.applicability.applicableOn === "specific_products") {
            qualifyingItems = orderItems.filter(item => 
                this.applicability.productIds && this.applicability.productIds.includes(item.itemId)
            );
        } else if (this.applicability.applicableOn === "specific_categories") {
            qualifyingItems = orderItems.filter(item => 
                this.applicability.categories && this.applicability.categories.includes(item.category)
            );
        } else if (this.applicability.applicableOn === "all_except") {
            qualifyingItems = orderItems.filter(item => 
                (!this.applicability.excludedProductIds || !this.applicability.excludedProductIds.includes(item.itemId)) &&
                (!this.applicability.excludedCategories || !this.applicability.excludedCategories.includes(item.category))
            );
        }

        discountableAmount = qualifyingItems.reduce((sum, item) => {
            const price = Number(item.totalPrice) || (Number(item.pricePerUnit || 0) * Number(item.quantity || 1)) || 0;
            return sum + price;
        }, 0);
    }

    let discount = 0;
    switch (this.discountType) {
        case "percentage":
            discount = (discountableAmount * this.discountValue) / 100;
            if (this.maxDiscountAmount) {
                discount = Math.min(discount, this.maxDiscountAmount);
            }
            break;

        case "fixed_amount":
            discount = Math.min(this.discountValue, discountableAmount);
            break;

        case "free_shipping":
            discount = 0;
            break;

        default:
            discount = 0;
    }

    return Math.round(discount * 100) / 100;
};

CouponSchema.statics.findActive = function (filters = {}) {
    const now = new Date();
    return this.find({
        status: "active",
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
        ...filters
    });
};

module.exports = mongoose.model("Coupon", CouponSchema);
