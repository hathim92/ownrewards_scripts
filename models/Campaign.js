const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CampaignSchema = new Schema(
    {
        name: { type: String, required: true },
        description: String,
        type: {
            type: String,
            enum: ["seasonal", "event-based", "milestone", "feedback-driven", "win-back", "birthday", "anniversary"],
            required: true
        },

        schedule: {
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true },
            isRecurring: { type: Boolean, default: false },
            recurrencePattern: {
                frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"] },
                interval: Number,
                daysOfWeek: [Number],
                dayOfMonth: Number
            }
        },

        targetAudience: {
            targeting: {
                type: String,
                enum: ["all", "segment", "tier", "custom_filter"],
                default: "all"
            },
            segments: [{ type: Schema.Types.ObjectId, ref: "SegmentV2" }],
            tiers: [{ type: String, enum: ["Bronze", "Silver", "Gold", "Platinum"] }],
            customFilters: Schema.Types.Mixed,
            excludedCustomers: [{ type: Schema.Types.ObjectId, ref: "LoyaltyCustomer" }]
        },

        offerConfiguration: {
            offerType: {
                type: String,
                enum: ["reward", "coupon", "both"],
                required: true
            },
            rewardIds: [{ type: Schema.Types.ObjectId, ref: "RewardV2" }],
            couponIds: [{ type: Schema.Types.ObjectId, ref: "Coupon" }],
            autoGrant: { type: Boolean, default: true }
        },

        budget: {
            enabled: { type: Boolean, default: false },
            maxBudget: Number,
            spentBudget: { type: Number, default: 0 },
            maxParticipants: Number,
            currentParticipants: { type: Number, default: 0 },
            stopOnBudgetDepletion: { type: Boolean, default: true }
        },

        goals: {
            targetRedemptionRate: Number,
            targetROI: Number,
            targetParticipants: Number,
            minOrderValue: Number
        },

        abTest: {
            enabled: { type: Boolean, default: false },
            variants: [
                {
                    name: String,
                    percentage: Number,
                    rewardId: Schema.Types.ObjectId,
                    couponId: Schema.Types.ObjectId
                }
            ]
        },

        communication: {
            sendNotification: { type: Boolean, default: true },
            channels: [{ type: String, enum: ["email", "sms", "whatsapp", "push"] }],
            templateId: String,
            messageTemplate: String
        },

        businessType: {
            type: String,
            enum: ["restaurant", "retail", "ecommerce", "service", "multi"],
            default: "multi"
        },

        status: {
            type: String,
            enum: ["draft", "active", "paused", "completed", "cancelled", "budget_depleted"],
            default: "draft"
        },

        executionStats: {
            totalRuns: { type: Number, default: 0 },
            lastRunAt: Date,
            nextRunAt: Date,
            targetedCustomers: { type: Number, default: 0 },
            successfulDeliveries: { type: Number, default: 0 },
            failedDeliveries: { type: Number, default: 0 },
            rewardsGranted: { type: Number, default: 0 },
            rewardsRedeemed: { type: Number, default: 0 },
            couponsIssued: { type: Number, default: 0 },
            couponsRedeemed: { type: Number, default: 0 },
            totalRevenue: { type: Number, default: 0 },
            roi: Number
        },

        tags: [String],
        notes: String,

        outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
        belongsTo: { type: Schema.Types.ObjectId, ref: "Organization", required: true },

        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
    },
    {
        timestamps: true
    }
);

CampaignSchema.index({ belongsTo: 1, outletId: 1, status: 1 });
CampaignSchema.index({ "schedule.startDate": 1, "schedule.endDate": 1 });
CampaignSchema.index({ status: 1, "schedule.nextRunAt": 1 });
CampaignSchema.index({ type: 1, businessType: 1 });

CampaignSchema.virtual("isActive").get(function () {
    const now = new Date();
    return this.status === "active" && now >= this.schedule.startDate && now <= this.schedule.endDate;
});

CampaignSchema.virtual("budgetRemaining").get(function () {
    if (!this.budget.enabled) return null;
    return this.budget.maxBudget - this.budget.spentBudget;
});

CampaignSchema.methods.isBudgetExhausted = function () {
    if (!this.budget.enabled) return false;
    if (this.budget.maxBudget && this.budget.spentBudget >= this.budget.maxBudget) return true;
    if (this.budget.maxParticipants && this.budget.currentParticipants >= this.budget.maxParticipants) return true;
    return false;
};

CampaignSchema.statics.findDueForExecution = function () {
    const now = new Date();
    return this.find({
        status: "active",
        "schedule.startDate": { $lte: now },
        "schedule.endDate": { $gte: now },
        $or: [{ "executionStats.nextRunAt": { $lte: now } }, { "executionStats.nextRunAt": null }]
    });
};

module.exports = mongoose.model("Campaign", CampaignSchema);
