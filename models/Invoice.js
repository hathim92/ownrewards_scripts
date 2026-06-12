const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceSchema = new Schema({
  name: { type: String },
  phoneNo: { type: String },
  invoiceId: { type: String },
  purchaseAmount: { type: Number },
  ownchatRedeemedBill: { type: Boolean, default: false },
  redeemComment: { type: String, default: null },
  customerId: { type: Schema.Types.ObjectId, ref: 'LoyaltyCustomer' },
  billId: { type: Schema.Types.ObjectId, ref: 'LoyaltyBill' },
  outletId: { type: Schema.Types.ObjectId, ref: 'Outlet' },
  belongsTo: { type: Schema.Types.ObjectId, ref: 'Organization' }
}, { timestamps: true });

invoiceSchema.index({ billId: 1 });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ outletId: 1, belongsTo: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
