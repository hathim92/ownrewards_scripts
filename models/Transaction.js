const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
    billId: { type: Schema.Types.ObjectId, ref: "LoyaltyBill" },
    invoiceNo: { type: String },
    rewardId: { type: Schema.Types.ObjectId, ref: "LoyaltyReward" },
    customerId: { type: Schema.Types.ObjectId, ref: "LoyaltyCustomer" },
    customerPoints: {
        beforePoints: { type: Number },
        afterPoints: { type: Number }
    },
    type: { 
        type: String,
        enum: ['loyalty', 'redeem', 'expire', 'ineligible', 'rule_action', 'reward_grant', 'coupon_grant', 'coupon_redeem'],
        required: true
    },
    used: Boolean,
    isExpired: Boolean,
    isUsedPoint: Number,
    status: String, // "status" , "pending","linked"
    enrolledCustomer: Boolean,
    amountPerPoint: Number,
    points: { type: Number, default: 0 },
    spendAmount: { type: Number, default: 0 },
    corePoints: { type: Number, default: 0 },
    isCronJobMsgSended: Boolean,
    expiredAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
    belongsTo: { type: Schema.Types.ObjectId, ref: "Organization" },
    customerTier: { type: String, default: "Bronze" },

    ruleId: { type: Schema.Types.ObjectId, ref: "Rule" },
    multiplier: { type: Number, default: 1 },
    campaignId: { type: Schema.Types.ObjectId, ref: "RewardCampaign" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },

    ruleName: { type: String },
    ruleActionType: { type: String },
    eventType: { type: String },
    isRuleBased: { type: Boolean, default: false },

    isRewardBased: { type: Boolean, default: false },

    description: String,
    manualTransactionType: String,
    reason: String,
    metadata: Schema.Types.Mixed,
    grantedBy: { type: Schema.Types.ObjectId, ref: "User" }
});

TransactionSchema.index({ isExpired: 1, expiredAt: 1 });
TransactionSchema.index({ outletId: 1, isExpired: 1, type: 1, ownchatCustomerId: 1, createdAt: 1 });
TransactionSchema.index({ outletId: 1, type: 1, ownchatCustomerId: 1, createdAt: 1 });
TransactionSchema.index({ customerId: 1, isExpired: 1, type: 1 });
TransactionSchema.index({ 
    type: 1, 
    isRuleBased: 1, 
    ruleId: 1, 
    eventType: 1, 
    createdAt: 1,
    belongsTo: 1
});

const Transaction = mongoose.model("Transaction", TransactionSchema);
module.exports = Transaction;
