const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerRewardSchema = new Schema(
    {
        rewardId: {
            type: Schema.Types.ObjectId,
            ref: 'LoyaltyReward',
            required: true,
            index: true
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'LoyaltyCustomer',
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['active', 'pending', 'redeemed', 'expired', 'revoked'],
            default: 'active',
            index: true
        },
        issuedAt: { type: Date, default: Date.now, index: true },
        expiresAt: { type: Date, required: true, index: true },
        redeemedAt: Date,
        revokedAt: Date,
        issuanceSource: {
            type: {
                type: String,
                enum: ['manual', 'rule_engine', 'campaign', 'workflow', 'feedback', 'referral', 'legacy_migration'],
                required: true
            },
            sourceId: Schema.Types.ObjectId,
            sourceName: String,
            triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' }
        },
        usageTracking: {
            timesUsed: { type: Number, default: 0 },
            maxUsesAllowed: { type: Number, default: 1 },
            totalDiscountGiven: { type: Number, default: 0 }
        },
        redemptions: [
            {
                billId: { type: Schema.Types.ObjectId, ref: 'LoyaltyBill' },
                orderId: String,
                orderAmount: Number,
                discountGiven: Number,
                redeemedAt: { type: Date, default: Date.now },
                channel: { type: String, enum: ['pos', 'online', 'app', 'whatsapp'] }
            }
        ],
        rewardSnapshot: {
            name: String,
            offerType: String,
            offerValue: Schema.Types.Mixed,
            validityDays: Number
        },
        outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
        belongsTo: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
    },
    {
        timestamps: true
    }
);

customerRewardSchema.index({ customerId: 1, status: 1, expiresAt: 1 });
customerRewardSchema.index({ belongsTo: 1, outletId: 1, status: 1 });
customerRewardSchema.index({ rewardId: 1, status: 1 });
customerRewardSchema.index({ expiresAt: 1, status: 1 });
customerRewardSchema.index({ 'issuanceSource.type': 1, 'issuanceSource.sourceId': 1 });

customerRewardSchema.virtual('daysUntilExpiry').get(function () {
    if (this.status !== 'active') return null;
    const now = new Date();
    const diff = this.expiresAt - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

customerRewardSchema.virtual('isUsable').get(function () {
    if (this.status !== 'active') return false;
    if (new Date() > this.expiresAt) return false;
    if (this.usageTracking.timesUsed >= this.usageTracking.maxUsesAllowed) return false;
    return true;
});

customerRewardSchema.methods.canUse = function (orderDetails = {}) {
    const { REWARD_ERROR_CODES } = require('./utils/reward.constants');

    if (this.status !== 'active') {
        if (this.status === 'redeemed') {
            return { usable: false, code: REWARD_ERROR_CODES.ALREADY_REDEEMED, reason: 'Reward already redeemed' };
        }
        return { usable: false, code: REWARD_ERROR_CODES.NOT_ACTIVE, reason: 'Reward not active' };
    }

    if (new Date() > this.expiresAt) {
        return { usable: false, code: REWARD_ERROR_CODES.EXPIRED, reason: 'Reward expired' };
    }

    if (this.usageTracking.timesUsed >= this.usageTracking.maxUsesAllowed) {
        return { usable: false, code: REWARD_ERROR_CODES.MAX_PER_CUSTOMER, reason: 'Maximum uses reached' };
    }

    return { usable: true };
};

customerRewardSchema.methods.markPending = async function () {
    if (this.status === 'active') {
        this.usageTracking.timesUsed += 1;
        this.status = 'pending';
    }
    return await this.save();
};

customerRewardSchema.methods.markRedeemed = async function (billDetails) {
    if (this.status !== 'pending') {
        this.usageTracking.timesUsed += 1;
    }

    this.usageTracking.totalDiscountGiven += billDetails.discountGiven;

    if (this.usageTracking.timesUsed >= this.usageTracking.maxUsesAllowed) {
        this.status = 'redeemed';
    } else {
        if (this.status === 'pending') this.status = 'active'; 
    }

    this.redeemedAt = new Date();

    this.redemptions.push({
        billId: billDetails.billId,
        orderId: billDetails.orderId,
        orderAmount: billDetails.orderAmount,
        discountGiven: billDetails.discountGiven,
        redeemedAt: new Date(),
        channel: billDetails.channel || 'pos'
    });

    return await this.save();
};

customerRewardSchema.statics.findActiveForCustomer = function (customerId, filters = {}) {
    return this.find({
        customerId: customerId,
        status: 'active',
        expiresAt: { $gt: new Date() },
        ...filters
    })
        .populate('rewardId')
        .sort({ expiresAt: 1 });
};

customerRewardSchema.statics.findExpiringSoon = function (daysThreshold = 3) {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    return this.find({
        status: 'active',
        expiresAt: { $gt: now, $lte: threshold }
    }).populate('customerId rewardId');
};

module.exports = mongoose.models.CustomerReward || mongoose.model("CustomerReward", customerRewardSchema);
