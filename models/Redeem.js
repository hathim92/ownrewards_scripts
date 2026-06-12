const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RedeemSchema = new mongoose.Schema({
  redeemName: {
    type: String,
  },
  requiredPoints: {
    type: Number,
    min: 0,
  },
  thresholdValue: {
    type: Number,
  },
  needOtp: {
    type: Boolean,
  },
  outletId: { type: Schema.Types.ObjectId, ref: 'Outlet' },
  belongsTo: { type: Schema.Types.ObjectId, ref: 'Organization' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

RedeemSchema.index({ outletId: 1, belongsTo: 1, requiredPoints: 1 });
RedeemSchema.index({ phoneNo: 1, outletId: 1, belongsTo: 1 });

module.exports = mongoose.model("LoyaltyRedeem", RedeemSchema);
