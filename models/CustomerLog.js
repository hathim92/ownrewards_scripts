const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerLogSchema = new Schema({
 customerId: { type: Schema.Types.ObjectId, required: true, index: true },
 belongsTo: { type: Schema.Types.ObjectId, ref: 'Organization' },
 outletId: { type: Schema.Types.ObjectId, ref: 'Outlet' },
 activityType: { type: String, required: true },
 pointsChanged: { type: Number },
 spendAmount: { type: Number },
 referenceType: { type: String }, // 'coupon', 'reward', etc.
 referenceId: { type: Schema.Types.ObjectId },
 source: { type: String },
 comment: { type: String },
 metadata: { type: Schema.Types.Mixed },
 createdAt: { type: Date, default: Date.now },
 isProcessForSegment: Boolean
});

customerLogSchema.index({ customerId: 1, createdAt: -1 });
customerLogSchema.index({ belongsTo: 1, outletId: 1, customerId: 1 });
customerLogSchema.index({ activityType: 1 });

module.exports = mongoose.model('CustomerLog', customerLogSchema);
