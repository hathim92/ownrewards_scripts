const { 
  connectDB, 
  disconnectDB, 
  mongoose,
  Customer, 
  Bill, 
  Transaction, 
  Invoice,
  CustomerLog,
  CustomerAnalytics
} = require('../models');
const { parseToDate } = require('../utils/dateParser');

// ==============================================================================
// MIGRATION CONFIGURATION
// Edit these values to match your target Organization and Outlets
// ==============================================================================

// Target Organization ID (belongsTo)
const MIGRATION_ORG_ID = "6a2bf3bb92b2b0b73cb9e5b2"; // Example: Roshan Bags Organization

// Fallback Outlet ID if a location is not listed in the map above
const DEFAULT_OUTLET_ID = "6a23eed4797fb4e955c50f81"; 

// Map location names from the JSON to their corresponding Outlet IDs
// Note: All keys are stored in UPPERCASE for case-insensitive lookup
const LOCATION_OUTLET_MAP = {
  "": DEFAULT_OUTLET_ID,
  "BYPASS ROSHAN": "6a2be646b3f75e5c66ec82d3",
  "MDU ANNA NAGAR": "6a2be646b3f75e5c66ec82d6",
  "ROSHAN AC": "6a2be646b3f75e5c66ec82d9",
  "ROSHAN ADYAR": "6a2be646b3f75e5c66ec82dc",
  "ROSHAN ALWARPET": "6a2be646b3f75e5c66ec82df",
  "ROSHAN AMBATTUR": "6a2be646b3f75e5c66ec82e2",
  "ROSHAN ANNANAGAR": "6a2be646b3f75e5c66ec82e5",
  "ROSHAN AVINASHI SALAI": "6a2be646b3f75e5c66ec82e8",
  "ROSHAN BAGS GORIPALAYAM2": "6a2be646b3f75e5c66ec82eb",
  "ROSHAN CHROMEPET": "6a2be646b3f75e5c66ec82ee",
  "ROSHAN CHROMPET": "6a2be646b3f75e5c66ec82f1",
  "ROSHAN COIMBATORE OPP": "6a2be646b3f75e5c66ec82f4",
  "ROSHAN COIMBATORE R.S.P": "6a2be646b3f75e5c66ec82f7",
  "ROSHAN COMPANY PALAYAMKOTTAI": "6a2be646b3f75e5c66ec82fa",
  "ROSHAN COMPANY TIRUNELVELI": "6a2be646b3f75e5c66ec82fd",
  "ROSHAN ERODE": "6a2be646b3f75e5c66ec8300",
  "ROSHAN GORIPALAYAM": "6a2be646b3f75e5c66ec8303",
  "ROSHAN GOWRIWAKKAM": "6a2be646b3f75e5c66ec8306",
  "ROSHAN HOSUR": "6a2be646b3f75e5c66ec8309",
  "ROSHAN MALL": "6a2be646b3f75e5c66ec830c",
  "ROSHAN NAGERCOIL": "6a2be646b3f75e5c66ec830f",
  "ROSHAN NOVELTIES": "6a2be646b3f75e5c66ec8312",
  "ROSHAN OMR": "6a2be646b3f75e5c66ec8315",
  "ROSHAN PONDICHERRY": "6a2be646b3f75e5c66ec8318",
  "ROSHAN SALEM": "6a2be646b3f75e5c66ec831b",
  "ROSHAN SHOLINGANALLUR": "6a2be646b3f75e5c66ec831e",
  "ROSHAN SMS": "6a2be646b3f75e5c66ec8321",
  "ROSHAN THANJAVUR": "6a2be646b3f75e5c66ec8324",
  "ROSHAN TIRUPUR": "6a2be646b3f75e5c66ec8327",
  "ROSHAN TNAGAR": "6a2be646b3f75e5c66ec832a",
  "ROSHAN TOWNHALL (TH)": "6a2be646b3f75e5c66ec832d",
  "ROSHAN TRICHY": "6a2be646b3f75e5c66ec8330",
  "ROSHAN TRICHY 3 LOCATION": "6a2be646b3f75e5c66ec8333",
  "ROSHAN TUTICORIN": "6a2be646b3f75e5c66ec8336",
  "ROSHAN VALASARAVAKKAM": "6a2be646b3f75e5c66ec8339",
  "ROSHAN VELACHERY": "6a2be646b3f75e5c66ec833c",
  "ROSHAN VELORE": "6a2be646b3f75e5c66ec833f",
  "ROSHAN WT": "6a2be646b3f75e5c66ec8342",
  "ROSHAN WT2": "6a2be646b3f75e5c66ec8345",
  "ROSHAN-WAREHOUSE": "6a2be646b3f75e5c66ec8348",
  "ROSHANTRICHY2LOCATION": "6a2be646b3f75e5c66ec834b",
  "Roshan Market Street": "6a2be646b3f75e5c66ec834e",
}

// ==============================================================================

const BATCH_SIZE = 5000;

// Define the Schema for the imported migrationdata collection
const migrationDataSchema = new mongoose.Schema({
  billNumber: String,
  billDate: mongoose.Schema.Types.Mixed,
  grossAmount: Number,
  billAmount: Number,
  discount: Number,
  loyaltyPoint: Number,
  location: String,
  customerId: String,
  customerName: String,
  phoneNo: String,
  email: String,
  dob: mongoose.Schema.Types.Mixed,
  anniversaryDate: mongoose.Schema.Types.Mixed,
  gender: String,
  loyaltyPointsBalance: Number,
  totalOrderAmount: Number,
  lastLocation: String,
  isSubscribed: Boolean,
  lineItems: [
    {
      BILL_NUMBER: String,
      BILL_DATE: mongoose.Schema.Types.Mixed,
      ENTRYORDERID: String,
      STOCK_NO: String,
      DESCRIPTION: String,
      QUANTITY: mongoose.Schema.Types.Mixed,
      RATE: mongoose.Schema.Types.Mixed,
      AMOUNT: mongoose.Schema.Types.Mixed,
      SALEDISCAMT: mongoose.Schema.Types.Mixed
    }
  ]
}, { collection: 'migrationdata', timestamps: false });

// Register the temporary migration model (if not already registered)
const MigrationData = mongoose.models.MigrationData || mongoose.model('MigrationData', migrationDataSchema);

function normalisePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, ""); // strip all non-digits
  if (!digits) return null;
  digits = digits.replace(/^0+/, ""); // remove leading zeros
  if (digits.length === 10) return "91" + digits;
  return digits;
}

async function main() {
  console.log("[Senior Dev] Starting high-performance migration using MongoDB 'migrationdata' collection...");

  // Validate ID structures
  if (!mongoose.Types.ObjectId.isValid(MIGRATION_ORG_ID)) {
    console.error(`Error: Invalid MIGRATION_ORG_ID configuration: "${MIGRATION_ORG_ID}"`);
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(DEFAULT_OUTLET_ID)) {
    console.error(`Error: Invalid DEFAULT_OUTLET_ID configuration: "${DEFAULT_OUTLET_ID}"`);
    return;
  }

  console.log("Connecting to the database...");
  await connectDB();

  console.log(`Starting to process all bills...`);

  console.log(`Starting cursor-based streaming in batches of ${BATCH_SIZE}...`);
  const cursor = MigrationData.find({}).lean().cursor({ batchSize: BATCH_SIZE });
  const startTime = Date.now();

  let chunkItems = [];
  let lineCount = 0;

  for await (const doc of cursor) {
    lineCount++;
    chunkItems.push(doc);

    if (chunkItems.length === BATCH_SIZE) {
      await processChunk(chunkItems, lineCount, startTime);
      chunkItems = [];
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Process remaining items
  if (chunkItems.length > 0) {
    await processChunk(chunkItems, lineCount, startTime);
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n[Senior Dev] Migration Completed Successfully!`);
  console.log(`Total records processed: ${lineCount.toLocaleString()}`);
  console.log(`Time taken: ${durationSec} seconds`);
  console.log(`Throughput: ${Math.round(lineCount / durationSec)} records/sec`);

  await disconnectDB();
}

/**
 * High-performance batch processor mirroring the CSV upload pipeline
 */
async function processChunk(items, currentCount, startTime) {
  const belongsTo = new mongoose.Types.ObjectId(MIGRATION_ORG_ID);

  // Group the raw batch items by resolved target outlet ID first
  const groupedByOutlet = {};

  for (const item of items) {
    const phone = normalisePhone(item.phoneNo);
    if (!phone) continue;

    // Match location from static lookup map in a case-insensitive manner
    const rawLocation = String(item.location || '').toUpperCase().trim();
    let targetOutletStr = LOCATION_OUTLET_MAP[rawLocation];
    if (!targetOutletStr && item.lastLocation) {
      const rawLastLocation = String(item.lastLocation).toUpperCase().trim();
      targetOutletStr = LOCATION_OUTLET_MAP[rawLastLocation];
    }
    
    // Fallback if not mapped
    if (!targetOutletStr || !mongoose.Types.ObjectId.isValid(targetOutletStr)) {
      targetOutletStr = DEFAULT_OUTLET_ID;
    }

    if (!groupedByOutlet[targetOutletStr]) {
      groupedByOutlet[targetOutletStr] = [];
    }
    groupedByOutlet[targetOutletStr].push({ item, phone });
  }

  // Process each outlet group sequentially
  for (const [outletIdStr, outletItems] of Object.entries(groupedByOutlet)) {
    const outletId = new mongoose.Types.ObjectId(outletIdStr);
    const customerCache = {};
    const billObjects = [];

    for (const { item, phone } of outletItems) {
      const billDate = parseToDate(item.billDate) || new Date();

      const lineItems = (item.lineItems || []).map(li => ({
        itemName: li.DESCRIPTION || 'Item',
        itemId: li.STOCK_NO || '',
        quantity: Number(li.QUANTITY) || 1,
        pricePerUnit: Number(li.RATE) || 0,
        totalPrice: Number(li.AMOUNT) || 0,
        discount: Number(li.SALEDISCAMT) || 0
      }));

      billObjects.push({
        _id: new mongoose.Types.ObjectId(),
        customer: {
          name: item.customerName || "Walk-in Customer",
          phoneNo: phone,
          email: item.email && item.email !== 'NOT-CAPTURED' ? item.email : undefined,
          gender: item.gender || undefined,
          dateOfBirth: parseToDate(item.dob),
          anniversary: parseToDate(item.anniversaryDate)
        },
        orderDetails: {
          orderId: item.billNumber,
          order_type: "unknown",
          payment_type: "unknown",
          core_total: Math.max(0, (item.billAmount || 0) - (item.discount || 0)),
          total: item.billAmount || 0,
          tax_total: 0,
          discount_total: item.discount || 0,
          created_on: billDate,
          order_from: "POS",
          comment: "Historical migration"
        },
        items: lineItems,
        loyaltyPointsEarned: Math.max(0, Number(item.loyaltyPoint) || 0),
        rawLoyaltyPointsBalance: Number(item.loyaltyPointsBalance) || 0,
        loyaltyInfluenced: false,
        influenceType: "none",
        refundStatus: "none",
        outletId,
        belongsTo,
        customerTier: "Bronze",
        createdAt: billDate,
        updatedAt: billDate
      });
    }

    if (billObjects.length === 0) continue;

    // 1. Resolve customer profiles from cache or DB for this specific outlet
    const phonesNeeded = [...new Set(
      billObjects.map(b => b.customer.phoneNo).filter(p => p && !customerCache[p])
    )];

    if (phonesNeeded.length > 0) {
      const existing = await Customer.find(
        { belongsTo, outletId, phoneNo: { $in: phonesNeeded } },
        { _id: 1, phoneNo: 1, "transaction.balancePoints": 1, "transaction.EarnedPoints": 1 }
      ).lean();

      for (const c of existing) {
        customerCache[c.phoneNo] = {
          _id: c._id,
          balancePoints: c.transaction?.balancePoints || 0,
          earnedPoints: c.transaction?.EarnedPoints || 0
        };
      }
      for (const phone of phonesNeeded) {
        if (!customerCache[phone]) {
          customerCache[phone] = { _id: null, balancePoints: 0, earnedPoints: 0 };
        }
      }
    }

    // 2. Upsert customers using bulkWrite
    const customerOps = [];
    for (const b of billObjects) {
      const phone = b.customer.phoneNo;
      customerOps.push({
        updateOne: {
          filter: { belongsTo, outletId, phoneNo: phone },
          update: {
            $setOnInsert: {
              name: b.customer.name,
              phoneNo: phone,
              email: b.customer.email,
              gender: b.customer.gender,
              dateOfBirth: b.customer.dateOfBirth,
              anniversary: b.customer.anniversary,
              belongsTo,
              outletId,
              "transaction.EarnedPoints": 0,
              "transaction.redeemPoints": 0,
              "transaction.expiredPoints": 0,
              "transaction.redeemCounts": 0,
              customerType: "Opportunity",
              tier: "Bronze",
              isActive: true
            },
            $inc: {
              totalOrders: 1,
              totalPurchaseAmount: b.orderDetails.total || 0
            },
            $max: {
              lastVisitedData: b.orderDetails.created_on,
              updatedAt: b.orderDetails.created_on
            },
            $min: {
              createdAt: b.orderDetails.created_on
            },
            $set: {
              "transaction.balancePoints": b.rawLoyaltyPointsBalance
            }
          },
          upsert: true
        }
      });
    }

    if (customerOps.length > 0) {
      await Customer.bulkWrite(customerOps, { ordered: false, timestamps: false });
    }

    // 3. Re-fetch customer ids (for newly inserted/updated customers)
    const allPhones = [...new Set(billObjects.map(b => b.customer.phoneNo))];
    const freshCustomers = await Customer.find(
      { belongsTo, outletId, phoneNo: { $in: allPhones } },
      { _id: 1, phoneNo: 1, "transaction.balancePoints": 1, "transaction.EarnedPoints": 1, tier: 1 }
    ).lean();

    const phoneToCustomer = {};
    for (const c of freshCustomers) {
      phoneToCustomer[c.phoneNo] = c;
      customerCache[c.phoneNo] = {
        _id: c._id,
        balancePoints: c.transaction?.balancePoints || 0,
        earnedPoints: c.transaction?.EarnedPoints || 0
      };
    }

    // 4. Link customers to bills
    for (const b of billObjects) {
      const cust = phoneToCustomer[b.customer.phoneNo];
      b.customerId = cust?._id || null;
      b.customerTier = cust?.tier || "Bronze";
    }

    // 5. Deduplicate bills
    let billsToInsert = billObjects;
    const orderIdsInChunk = billObjects.map(b => b.orderDetails.orderId).filter(Boolean);

    if (orderIdsInChunk.length > 0) {
      const existingOrderIds = await Bill.distinct(
        "orderDetails.orderId",
        {
          "orderDetails.orderId": { $in: orderIdsInChunk },
          outletId,
          belongsTo
        }
      );
      const existingSet = new Set(existingOrderIds.map(String));

      if (existingSet.size > 0) {
        billsToInsert = billObjects.filter(b => !existingSet.has(String(b.orderDetails.orderId)));
      }
    }

    if (billsToInsert.length === 0) continue;

    // 6. insertMany bills
    let failedBillIds = new Set();
    try {
      await Bill.insertMany(billsToInsert, { ordered: false });
    } catch (bulkErr) {
      const writeErrors = bulkErr.writeErrors || [];
      for (const we of writeErrors) {
        const failedId = we.err?.op?._id || we.op?._id;
        if (failedId) failedBillIds.add(failedId.toString());
      }
    }

    const insertedBills = billsToInsert.filter(b => !failedBillIds.has(b._id.toString()));

    // 7. Flush secondary collections in parallel
    const now = new Date();
    const invoices = [];
    const logs = [];
    const analyticsOps = [];
    const txnDocs = [];
    const pointsOps = [];

    for (const bill of insertedBills) {
      const phone = bill.customer.phoneNo;
      const customer = phoneToCustomer[phone];
      if (!customer) continue;

      const customerId = customer._id;
      const billTotal = bill.orderDetails.total || 0;
      const billId = bill._id;
      const billDate = bill.orderDetails.created_on;

      // Invoice
      invoices.push({
        name: bill.customer.name,
        phoneNo: phone,
        invoiceId: bill.orderDetails.orderId,
        purchaseAmount: billTotal,
        customerId,
        billId,
        outletId,
        belongsTo,
        createdAt: billDate
      });

      // Customer visit log
      logs.push({
        customerId,
        belongsTo,
        outletId,
        activityType: "visit",
        spendAmount: billTotal,
        referenceType: "bill",
        referenceId: billId,
        source: "migration",
        comment: "Historical migration",
        isProcessForSegment: false,
        createdAt: billDate
      });

      const pts = bill.loyaltyPointsEarned || 0;

      // CustomerAnalytics upsert
      analyticsOps.push({
        updateOne: {
          filter: { customerId, belongsTo, outletId },
          update: {
            $inc: { 
              totalSpend: billTotal, 
              totalVisits: 1,
              totalPointsEarned: pts
            },
            $min: { firstPurchaseAt: billDate },
            $set: { lastPurchaseAt: billDate, updatedAt: now },
            $setOnInsert: {
              totalPointsRedeemed: 0
            }
          },
          upsert: true
        }
      });

      if (pts > 0) {
        const afterPoints = bill.rawLoyaltyPointsBalance;
        const beforePoints = Math.max(0, afterPoints - pts);

        // Update chunk cache for earnedPoints
        if (customerCache[phone]) {
          customerCache[phone].earnedPoints = (customerCache[phone].earnedPoints || 0) + pts;
          customerCache[phone].balancePoints = afterPoints;
        }

        const expiryDate = new Date(billDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); 

        // Transaction Ledger
        txnDocs.push({
          billId,
          invoiceNo: bill.orderDetails.orderId,
          customerId,
          customerPoints: { beforePoints, afterPoints },
          type: "loyalty",
          used: false,
          isUsedPoint: 0,
          points: pts,
          corePoints: pts,
          spendAmount: billTotal,
          expiredAt: expiryDate,
          createdAt: billDate,
          outletId,
          belongsTo,
          customerTier: bill.customerTier || "Bronze",
          manualTransactionType: "historical_migration",
          description: "Historical migration points",
          isRuleBased: false,
          isRewardBased: false
        });

        // Customer Points updates
        pointsOps.push({
          updateOne: {
            filter: { _id: customerId },
            update: {
              $inc: {
                "transaction.EarnedPoints": pts
              },
              $set: { customerType: "Loyalty" }
            }
          }
        });
      }
    }

    // Concurrent flushes
    const flushOps = [];
    if (invoices.length > 0) flushOps.push(Invoice.insertMany(invoices, { ordered: false }).catch(() => {}));
    if (logs.length > 0) flushOps.push(CustomerLog.insertMany(logs, { ordered: false }).catch(() => {}));
    if (analyticsOps.length > 0) flushOps.push(CustomerAnalytics.bulkWrite(analyticsOps, { ordered: false }).catch(() => {}));
    if (txnDocs.length > 0) flushOps.push(Transaction.insertMany(txnDocs, { ordered: false }).catch(() => {}));
    if (pointsOps.length > 0) flushOps.push(Customer.bulkWrite(pointsOps, { ordered: false }).catch(() => {}));

    await Promise.all(flushOps);
  }

  logProgress(currentCount, startTime);
}

function logProgress(currentCount, startTime) {
  const elapsedMs = Date.now() - startTime;
  const recordsPerSec = Math.round((currentCount / elapsedMs) * 1000);
  console.log(`Processed ${currentCount.toLocaleString()} | Velocity: ${recordsPerSec} rec/sec`);
}

main().catch(err => {
  console.error("Fatal error in migration runner:", err);
});
