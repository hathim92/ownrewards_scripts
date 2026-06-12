const mongoose = require("mongoose");
const { Schema } = mongoose;

const customerSchema = new Schema(
    {
        name: String,
        phoneNo: String,
        email: String,
        dateOfBirth: Date,
        gender: { type: String },
        anniversary: Date,
        lastVisitedData: Date,
        transaction: {
            EarnedPoints: { type: Number, default: 0 },
            redeemPoints: { type: Number, default: 0 },
            balancePoints: { type: Number, default: 0 },
            expiredPoints: { type: Number, default: 0 },
            redeemCounts: { type: Number, default: 0 }
        },
        totalPurchaseAmount: Number,
        totalOrders: { type: Number, default: 0 },
        pendingPoints: { type: Number, default: 0 },
        specialRewards: [{ type: mongoose.Schema.Types.ObjectId, ref: "LoyaltyReward" }],
        isFirstCustomer: { type: Boolean },
        otp: String,
        tag: String,
        isOtpVerified: Boolean,

        customerType: {
            type: String,
            enum: ["Loyalty", "Opportunity"],
            default: "Opportunity"
        },
        tier: {
            type: String,
            enum: ["Bronze", "Silver", "Gold", "Platinum"],
            default: "Bronze"
        },
        tierHistory: [
            {
                from: String,
                to: String,
                changedAt: Date,
                ruleId: { type: Schema.Types.ObjectId, ref: "Rule" }
            }
        ],
        lifecycleStage: {
            type: String,
            enum: ["prospect", "active", "at-risk", "churned", "inactive"],
            default: "prospect"
        },
        preferences: {
            notificationsEnabled: { type: Boolean, default: true },
            preferredRewardType: { type: String, enum: ["points", "discount", "product"] },
            communicationChannel: { type: String, enum: ["email", "sms", "whatsapp"] }
        },
        sourceCustomerId: { type: Schema.Types.ObjectId, ref: "Customer" },
        source: String,
        isCronJobMsgSended: Boolean,
        createdAt: Date,
        outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
        belongsTo: { type: Schema.Types.ObjectId, ref: "Organization" },
        unKnownGoogleReviewer: Boolean,
        isActive: { type: Boolean, default: true },
        customFields: { type: Object },
        customerGroups: [{ type: String }],
        segmentIds: Array,
        bot_incomplete_customer: String,
        googleReviewUrl: { type: String },

        attributes: [
            {
                _id: false,
                k:      { type: String, required: true },
                v_str:  { type: String },
                v_num:  { type: Number },
                v_date: { type: Date   },
                v_arr:  { type: [String], default: undefined }
            }
        ]
    },
    { timestamps: true }
);

customerSchema.index({ phoneNo: 1 });
customerSchema.index({ belongsTo: 1, outletId: 1, phoneNo: 1 });
customerSchema.index({ createdAt: 1 });
customerSchema.index({ lastVisitedData: 1 });

customerSchema.index({ "attributes.k": 1, "attributes.v_str": 1 });
customerSchema.index({ "attributes.k": 1, "attributes.v_num": 1 });
customerSchema.index({ "attributes.k": 1, "attributes.v_date": 1 });
customerSchema.index({ "attributes.k": 1, "attributes.v_arr": 1 });

module.exports = mongoose.model("LoyaltyCustomer", customerSchema);
