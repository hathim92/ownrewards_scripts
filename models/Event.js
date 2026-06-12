const mongoose = require("mongoose");
const { Schema } = mongoose;

const eventSchema = new mongoose.Schema(
    {
        event: {
            type: String,
            required: true
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LoyaltyCustomer",
            required: true
        },
        belongsTo: { type: Schema.Types.ObjectId, ref: "Organization" },
        outletId: { type: Schema.Types.ObjectId, ref: "Outlet" },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        },
        context: {
            type: {
                type: String,
                required: false
            },
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: false
            },
            name: {
                type: String,
                required: false
            },
            triggerType: {
                type: String,
                enum: ["auto", "manual", "cron"],
                default: "auto"
            },
            metadata: {
                type: Object,
                default: {}
            }
        },
        metadata: Object
    },
    {
        timestamps: true
    }
);

eventSchema.index({ event: 1, customerId: 1, outletId: 1, belongsTo: 1 });
eventSchema.index({ timestamp: -1 });
eventSchema.index({ "context.type": 1 });

module.exports = mongoose.model("Event", eventSchema);
