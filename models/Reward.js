const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const rewardSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        termsAndConditions: String,
        imageUrl: String,

        offer: {
            type: {
                type: String,
                enum: [
                    'percentage',
                    'price',
                    'product'
                ],
                required: true
            },
            value: Schema.Types.Mixed,
            productValue: Number
        },

        redemptionType: {
            type: String,
            enum: ['pre_bill', 'post_issuance'],
            default: 'post_issuance',
            required: true
        },

        usageRules: {
            maxRedemptionsTotal: Number,
            maxRedemptionsPerCustomer: { type: Number, default: 1 },
            oneTimeUse: { type: Boolean, default: true },
            minOrderValue: { type: Number, default: 0 }
        },

        budget: {
            enabled: { type: Boolean, default: false },
            maxTotalValue: Number,
            spentValue: { type: Number, default: 0 },
            maxIssuances: Number,
            issuedCount: { type: Number, default: 0 }
        },

        validityDays: { type: Number, default: 30 },

        ruleEngineConfig: {
            canBeIssuedByRule: { type: Boolean, default: true },
            priority: { type: Number, default: 0 }
        },

        analytics: {
            totalIssued: { type: Number, default: 0 },
            totalRedeemed: { type: Number, default: 0 },
            totalExpired: { type: Number, default: 0 },
            redemptionRate: { type: Number, default: 0 },
            totalDiscountGiven: { type: Number, default: 0 },
            totalRevenueGenerated: { type: Number, default: 0 },
            lastIssuedAt: Date,
            lastRedeemedAt: Date
        },

        coupon: {
            code: String,
            expiry: Date,
            isCodeMust: Boolean
        },

        isActive: {
            type: Boolean,
            default: true
        },

        outletId: { type: Schema.Types.ObjectId, ref: 'Outlet' },
        belongsTo: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

rewardSchema.index({ belongsTo: 1, outletId: 1, isActive: 1 });
rewardSchema.index({ 'budget.enabled': 1, 'budget.issuedCount': 1 });

rewardSchema.virtual('budgetRemaining').get(function () {
    if (!this.budget.enabled) return null;
    if (this.budget.maxTotalValue) {
        return this.budget.maxTotalValue - this.budget.spentValue;
    }
    if (this.budget.maxIssuances) {
        return this.budget.maxIssuances - this.budget.issuedCount;
    }
    return null;
});

rewardSchema.virtual('isBudgetExhausted').get(function () {
    if (!this.budget.enabled) return false;
    if (this.budget.maxTotalValue && this.budget.spentValue >= this.budget.maxTotalValue) return true;
    if (this.budget.maxIssuances && this.budget.issuedCount >= this.budget.maxIssuances) return true;
    return false;
});

rewardSchema.methods.checkEligibility = async function (customer) {
    const { REWARD_ERROR_CODES } = require('./utils/reward.constants');

    if (!this.isActive) {
        return { eligible: false, code: REWARD_ERROR_CODES.NOT_ACTIVE, reason: 'Reward not active' };
    }

    if (this.isBudgetExhausted) {
        return { 
            eligible: false, 
            code: REWARD_ERROR_CODES.BUDGET_EXHAUSTED, 
            reason: 'Reward budget exhausted',
            data: {
                totalAllocated: this.budget?.maxTotalValue || 0,
                totalIssued: this.budget?.issuedCount || 0
            }
        };
    }

    if (this.usageRules && this.usageRules.maxRedemptionsPerCustomer) {
        const CustomerReward = require('./CustomerReward');
        const existingRewards = await CustomerReward.countDocuments({
            rewardId: this._id,
            customerId: customer._id,
            status: { $in: ['active', 'redeemed'] }
        });

        if (existingRewards >= this.usageRules.maxRedemptionsPerCustomer) {
            return { 
                eligible: false, 
                code: REWARD_ERROR_CODES.MAX_PER_CUSTOMER,
                reason: `Customer has reached maximum allowed rewards (${this.usageRules.maxRedemptionsPerCustomer})`,
                data: {
                    limit: this.usageRules.maxRedemptionsPerCustomer,
                    used: existingRewards,
                    remaining: 0
                }
            };
        }
    }

    if (this.usageRules && this.usageRules.oneTimeUse) {
        const CustomerReward = require('./CustomerReward');
        const activeReward = await CustomerReward.findOne({
            rewardId: this._id,
            customerId: customer._id,
            status: 'active',
            expiresAt: { $gt: new Date() }
        });

        if (activeReward) {
            return { 
                eligible: false, 
                code: REWARD_ERROR_CODES.ALREADY_ACTIVE,
                reason: 'Customer already has an active instance of this reward',
                data: {
                    activeRewardId: activeReward._id
                }
            };
        }
    }

    return { eligible: true };
};

rewardSchema.methods.calculateDiscount = function (orderAmount) {
    switch (this.offer.type) {
        case 'percentage':
            let discount = (orderAmount * this.offer.value) / 100;
            return discount;

        case 'price':
            return this.offer.value;

        case 'product':
            return this.offer.productValue || 0;

        default:
            return 0;
    }
};

module.exports = mongoose.model('LoyaltyReward', rewardSchema);
