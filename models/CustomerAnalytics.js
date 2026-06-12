const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerAnalyticsSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'LoyaltyCustomer', required: true },
  outletId: { type: Schema.Types.ObjectId, ref: 'Outlet' },
  belongsTo: { type: Schema.Types.ObjectId, required: true, index: true },
  totalPointsEarned: { type: Number, default: 0 },
  totalPointsRedeemed: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  totalVisits: { type: Number, default: 0 },
  firstPurchaseAt: { type: Date },
  lastPurchaseAt: { type: Date },
  avgSpendPerVisit: { type: Number, default: 0 },
  mostVisitedStore: { type: String },
  lastCouponUsed: { type: String },
  isLoyal: { type: Boolean, default: false },
  isAtRisk: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  segmentIds: Array,
});

customerAnalyticsSchema.index({ customerId: 1, outletId: 1, belongsTo: 1 }, { unique: true });
customerAnalyticsSchema.index({ lastPurchaseAt: -1 });
customerAnalyticsSchema.index({ isLoyal: 1, isAtRisk: 1 });

module.exports = mongoose.model('CustomerAnalytics', customerAnalyticsSchema);
