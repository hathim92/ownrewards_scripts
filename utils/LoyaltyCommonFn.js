const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const Outlet = require('../models/Project');
const Reward = require('../models/Reward');
const CustomerLogs = require('../models/CustomerLog');
const Events = require('../models/Event');
const { Types } = require('mongoose');
const moment = require('moment-timezone');
const { makeRequest } = require('./axios');
const { parseToDate } = require('./dateParser');

// Safe Mocks for services not available in standalone script runner
const cacheUpdater = {
  onTransactionCreated: async () => {},
  onBillCreated: async () => {}
};

const EventBus = {
  publish: async () => {}
};

const RewardAnalyticsService = {
  updateAnalytics: async () => {}
};

const saveTransactionAnalytics = async () => {};

/**
 * Execute loyalty transaction (atomic updates)
 */
async function executeLoyaltyTransaction(loyaltyResult, customer, bill) {
  const { points, programId, expiryDate } = loyaltyResult;
  const loyaltyPoints = points;

  const [billUpdateResult, transaction] = await Promise.all([
    updateBillData(bill, programId, loyaltyPoints, customer._id),

    Transaction.create({
      billId: bill._id,
      customerId: customer._id,
      customerPoints: {
        beforePoints: customer.transaction.balancePoints,
        afterPoints: customer.transaction.balancePoints + loyaltyPoints
      },
      used: false,
      isExpired: false,
      amountPerPoint: 0,
      type: "loyalty",
      points: loyaltyPoints,
      corePoints: loyaltyPoints,
      spendAmount: bill.orderDetails.total,
      isCronJobMsgSended: false,
      enrolledCustomer: customer.transaction.EarnedPoints == 0 ? true : false,
      expiredAt: expiryDate,
      outletId: bill.outletId,
      belongsTo: bill.belongsTo,
    })
  ]);

  await saveCustomerTransaction(customer, loyaltyPoints, 0, 0);

  // Background analytics
  setImmediate(async () => {
    try {
      const existingAnalytics = await Customer.findById(customer._id);
      
      await Promise.all([
        CustomerLogs.create({
          customerId: customer._id,
          belongsTo: bill.belongsTo,
          outletId: bill.outletId,
          activityType: 'earnPoints',
          pointsChanged: loyaltyPoints,
          spendAmount: bill.orderDetails.total,
          referenceType: "transaction",
          referenceId: transaction._id,
          source: bill.orderDetails.order_from,
          comment: "loyalty eligible",
          isProcessForSegment: false,
          createdAt: Date.now()
        })
      ]);
    } catch (err) {
      console.error("Background analytics failed", err);
    }
  });

  return transaction;
}

/**
 * Save customer points and details atomically
 */
async function saveCustomerTransaction(
  customer,
  EarnedPoints = 0,
  redeemPoints = 0,
  expiredPoints = 0,
  redeemCountIncrement = 0
) {
  if (!customer || !customer._id) {
    console.error('[saveCustomerTransaction] Invalid customer object');
    return;
  }

  const roundTo2Decimals = (value) => {
    if (typeof value !== "number" || isNaN(value)) return 0;
    return Math.round(value * 100) / 100;
  };

  EarnedPoints = roundTo2Decimals(EarnedPoints);
  redeemPoints = roundTo2Decimals(redeemPoints);
  expiredPoints = roundTo2Decimals(expiredPoints);

  try {
    const updateData = {
      $inc: {
        'transaction.EarnedPoints': EarnedPoints,
        'transaction.redeemPoints': redeemPoints,
        'transaction.expiredPoints': expiredPoints,
        'transaction.redeemCounts': redeemCountIncrement
      },
      $set: {
        otp: "",
        isCronJobMsgSended: false
      }
    };

    if (EarnedPoints > 0) {
      updateData.$set.customerType = "Loyalty";
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      updateData,
      { new: true, runValidators: false }
    );

    if (!updatedCustomer) {
      console.error(`[saveCustomerTransaction] Customer ${customer._id} not found`);
      return;
    }

    const rawBalance =
      updatedCustomer.transaction.EarnedPoints -
      updatedCustomer.transaction.redeemPoints -
      updatedCustomer.transaction.expiredPoints;

    const finalBalance = Math.abs(rawBalance) < 0.01
      ? 0
      : roundTo2Decimals(rawBalance);

    let adjustedExpiredPoints = updatedCustomer.transaction.expiredPoints;
    if (adjustedExpiredPoints > updatedCustomer.transaction.EarnedPoints) {
      adjustedExpiredPoints = updatedCustomer.transaction.EarnedPoints;
    }

    const isFirstCustomer = (updatedCustomer.transaction.EarnedPoints - EarnedPoints) === 0;

    await Customer.updateOne(
      { _id: customer._id },
      {
        $set: {
          'transaction.balancePoints': Math.max(0, finalBalance),
          'transaction.expiredPoints': adjustedExpiredPoints,
          isFirstCustomer: isFirstCustomer
        }
      }
    );
  } catch (e) {
    console.error("Error in saveCustomerTransaction:", e.message);
  }
}

/**
 * Find or Create Customer
 */
async function createLoyaltyCustomer(phoneNo, customerName, outletId, belongsTo, bill, discountPoint) {
  if (!phoneNo) {
    throw new Error("Customer phone number not found");
  }

  const currentDate = new Date().toISOString();
  const phoneNumber = phoneNo;

  let isNewCustomer = false;
  let updatedCustomer = await Customer.findOne({ belongsTo: belongsTo, outletId: outletId, phoneNo: phoneNumber });

  if (!updatedCustomer) {
    updatedCustomer = await Customer.create({
      name: customerName,
      phoneNo: phoneNumber,
      belongsTo,
      outletId,
      lastVisitedData: currentDate,
      totalOrders: 1,
      totalPurchaseAmount: bill?.orderDetails?.total || 0,
      dateOfBirth: bill?.customer?.dateOfBirth || null,
      anniversary: bill?.customer?.anniversary || null
    });
    isNewCustomer = true;

    await Events.create({
      event: 'customer_created',
      customerId: updatedCustomer._id,
      belongsTo: bill.belongsTo,
      outletId: bill.outletId,
      context: {
        type: 'profile',
        triggerType: 'auto'
      },
      metadata: {
        name: updatedCustomer.name,
        phoneNo: updatedCustomer.phoneNo,
        orderFrom: bill.orderDetails.order_from,
        spendAmount: bill.orderDetails.total,
      }
    });

  } else {
    updatedCustomer = await Customer.findOneAndUpdate(
      { belongsTo, outletId, phoneNo: phoneNumber },
      {
        $inc: {
          totalOrders: 1,
          totalPurchaseAmount: bill?.orderDetails?.total || 0
        },
        $set: {
          lastVisitedData: currentDate,
        }
      },
      { new: true, upsert: false }
    );

    if (!updatedCustomer) {
      throw new Error(`Customer with phone ${phoneNumber} not found`);
    }
  }

  return updatedCustomer;
}

/**
 * Log point redemption transaction (pending)
 */
async function updateRedeemTransaction(customer, reedemPoint, rewardId = "0", outletId, belongsTo, billAmount = 0, isRewardBased = false) {
  console.log(`[updateRedeemTransaction] Creating transaction - Points: ${reedemPoint}, IsRewardBased: ${isRewardBased}`);

  const transaction = await Transaction.create({
    rewardId: Types.ObjectId.isValid(rewardId) ? rewardId : null,
    status: "pending",
    customerId: customer._id,
    type: "redeem",
    points: reedemPoint,
    corePoints: reedemPoint,
    isExpired: false,
    isRewardBased: isRewardBased,
    outletId,
    belongsTo,
  });

  await CustomerLogs.create({
    customerId: customer._id,
    belongsTo: belongsTo,
    outletId: outletId,
    activityType: 'redeemPoints',
    pointsChanged: reedemPoint,
    referenceType: 'transaction',
    referenceId: transaction._id,
    comment: "Redemption initiated - will be confirmed after bill",
    isProcessForSegment: false,
    createdAt: Date.now()
  });
}

/**
 * Format phone to carry country code
 */
async function formatPhoneNumber(phoneNo) {
  if (!phoneNo) return null;
  if (!phoneNo.startsWith("91")) return "91" + phoneNo;
  return phoneNo;
}

/**
 * Helper to update bill database fields
 */
async function updateBillData(bill, loyaltyProgramId = null, loyaltyPointsEarned = 0, customerId = null) {
  bill.loyaltyProgramId = loyaltyProgramId;
  bill.loyaltyPointsEarned = loyaltyPointsEarned;
  bill.customerId = customerId;
  return await bill.save();
}

/**
 * Calculate FIFO point redemption debiting oldest points transactions first
 */
async function calculateRedeemPoints(customer, reedemPoint, outletId, belongsTo) {
  let remainingPoints = reedemPoint;

  const transactions = await Transaction.find({
    customerId: customer._id,
    type: 'loyalty',
    used: false,
    isExpired: false,
    outletId,
    belongsTo
  }).sort({ createdAt: 1 });

  if (transactions.length > 0) {
    for (let transaction of transactions) {
      if (remainingPoints <= 0) continue;

      if (transaction.points > remainingPoints) {
        const balance = transaction.points - remainingPoints;
        await Transaction.updateOne(
          { _id: transaction._id },
          {
            $set: {
              points: balance,
              isUsedPoint: transaction.points - balance,
              used: false
            }
          }
        );
        remainingPoints = 0;
      } else {
        remainingPoints -= transaction.points;
        await Transaction.updateOne(
          { _id: transaction._id },
          {
            $set: {
              points: 0,
              isUsedPoint: transaction.points,
              used: true
            }
          }
        );
      }
    }
  }
}

/**
 * Execute manual points grant or deduction
 */
async function executeManualTransaction({ customerId, points, type, reason, metadata, userId, outletId, orgId }) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new Error("Customer not found");

  if (points < 0 && (customer.transaction.balancePoints + points < 0)) {
    throw new Error(`Insufficient balance. Current: ${customer.transaction.balancePoints}, Deduction: ${Math.abs(points)}`);
  }

  const count = await Transaction.countDocuments({ customerId: customer._id });

  const transaction = await Transaction.create({
    customerId: customer._id,
    customerPoints: {
      beforePoints: customer.transaction.balancePoints,
      afterPoints: customer.transaction.balancePoints + points
    },
    type: "loyalty",
    manualTransactionType: type,
    description: reason,
    reason: reason,
    metadata: metadata,
    grantedBy: userId,
    points: points,
    corePoints: points,
    used: false,
    isExpired: false,
    outletId: outletId || customer.outletId,
    belongsTo: orgId || customer.belongsTo,
    createdAt: new Date(),
    spendAmount: 0,
    amountPerPoint: 0,
    enrolledCustomer: count === 0
  });

  await saveCustomerTransaction(customer, points, 0, 0);

  await CustomerLogs.create({
    customerId: customer._id,
    belongsTo: orgId || customer.belongsTo,
    outletId: outletId || customer.outletId,
    activityType: points > 0 ? 'manualGrant' : 'manualDeduction',
    pointsChanged: points,
    referenceType: 'transaction',
    referenceId: transaction._id,
    comment: reason,
    createdAt: Date.now()
  });

  return transaction;
}

// Stubs for remaining legacy functions
async function checkLoyaltyCondition() { return { eligible: false }; }
async function expiredLoyaltyTransaction() {}
async function expiredRedeemTransaction() {}
async function alertExpiredTransaction() {}
async function enableIsCronJobMsg() {}
async function updatePendingPoint() {}
async function updateSegmentCalculation() {}
async function get30daysMemberGrowth() {}
async function startProcessingSegment() {}

module.exports = {
  executeLoyaltyTransaction,
  executeManualTransaction,
  incCustomerPoint: async (loyaltyPoints, updatedCustomer, outletId, belongsTo, bill, loyalty) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    return executeLoyaltyTransaction({ points: loyaltyPoints, programId: loyalty?._id, expiryDate }, updatedCustomer, bill);
  },
  updateBillData,
  calculateRedeemPoints,
  saveCustomerTransaction,
  createLoyaltyCustomer,
  updateRedeemTransaction,
  formatPhoneNumber,
  checkLoyaltyCondition,
  expiredLoyaltyTransaction,
  expiredRedeemTransaction,
  alertExpiredTransaction,
  enableIsCronJobMsg,
  updatePendingPoint,
  updateSegmentCalculation,
  get30daysMemberGrowth,
  startProcessingSegment
};
