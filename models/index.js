const { connectDB, disconnectDB, mongoose } = require('../utils/db');

// Import all models to ensure they register in Mongoose
const Customer = require('./Customer');
const Reward = require('./Reward');
const CustomerReward = require('./CustomerReward');
const Bill = require('./Bill');
const Redeem = require('./Redeem');
const Transaction = require('./Transaction');
const Project = require('./Project'); // Registers both Project and Outlet alias
const Organization = require('./Organization');
const User = require('./User');
const Coupon = require('./Coupon');
const CustomerCoupon = require('./CustomerCoupon');
const Campaign = require('./Campaign');
const CustomerLog = require('./CustomerLog');
const Event = require('./Event');
const Invoice = require('./Invoice');
const CustomerAnalytics = require('./CustomerAnalytics');

// Export models along with DB helpers
module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
  
  // Model classes
  Customer,
  LoyaltyCustomer: Customer,
  
  Reward,
  LoyaltyReward: Reward,
  
  CustomerReward,
  
  Bill,
  LoyaltyBill: Bill,
  
  Redeem,
  LoyaltyRedeem: Redeem,
  
  Transaction,
  
  Project,
  Outlet: mongoose.model('Outlet'),
  
  Organization,
  User,
  Coupon,
  CustomerCoupon,
  Campaign,
  CustomerLog,
  Event,
  Invoice,
  CustomerAnalytics
};
