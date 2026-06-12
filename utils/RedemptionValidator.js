const Transaction = require("../models/Transaction");
const moment = require("moment");

/**
 * Validates redemption constraints based on RedemptionRule settings.
 * Ensures the customer has enough mature points, meets cooldown periods,
 * and adheres to balance and bill limits.
 *
 * @param {Object} customer - The LoyaltyCustomer document.
 * @param {Object} rule - The active RedemptionRule document.
 * @param {Number} billAmount - The total bill amount (optional, defaults to 0).
 * @param {Number} requestedPoints - The points the user is trying to redeem (optional).
 * @param {Boolean} isRewardBased - True if redeeming a specific reward/coupon rather than standard points (optional).
 * @returns {Object} { isValid, reason, redeemablePoints }
 */
async function validateRedemption(customer, rule, billAmount = 0, requestedPoints = null, isRewardBased = false) {
    if (!customer || !rule) {
        console.log("[RedemptionValidator] Validation Failed: Missing customer or rule data.");
        return {
            isValid: false,
            reason: "Missing customer or rule data.",
            redeemablePoints: 0
        };
    }

    const {
        pointMaturationDays = 0,
        minimumPointBalance = 0,
        redemptionCooldownHours = 0,
        allowedRedemptionsPerDay = 0,
        minOrderValue = 0,
        maxRedemptionAmount = 0,
        blockedDaysOfWeek = []
    } = rule;

    // 0. Blocked Days Check
    let isBlocked = false;
    const currentDay = moment().day(); // 0 (Sunday) to 6 (Saturday)
    const currentDayName = moment().format('dddd').toLowerCase(); // e.g. "wednesday"

    if (blockedDaysOfWeek && blockedDaysOfWeek.length > 0) {
        if (blockedDaysOfWeek.includes(currentDay)) {
            isBlocked = true;
        }
    }

    if (rule.config?.blockedDays && Array.isArray(rule.config.blockedDays)) {
        const blockedNames = rule.config.blockedDays.map(d => d.toString().toLowerCase());
        if (blockedNames.includes(currentDayName)) {
            isBlocked = true;
        }
    }

    if (isBlocked) {
        console.log("[RedemptionValidator] Validation Failed: Redemptions are not allowed on this day of the week.");
        return {
            isValid: false,
            reason: "Redemptions are not allowed on this day of the week.",
            redeemablePoints: 0
        };
    }

    const balancePoints = customer.transaction?.balancePoints || 0;

    // 1. Minimum Point Balance Check (Evaluated against total balance points)
    if (balancePoints < minimumPointBalance && !isRewardBased) {
        console.log(`[RedemptionValidator] Validation Failed: Minimum balance of ${minimumPointBalance} points required. Current balance: ${balancePoints}`);
        return {
            isValid: false,
            reason: `Minimum balance of ${minimumPointBalance} points required to redeem.`,
            redeemablePoints: 0
        };
    }

    // 2. Minimum Order Value Check
    if (minOrderValue > 0 && billAmount < minOrderValue) {
        console.log(`[RedemptionValidator] Validation Failed: Minimum bill amount of ${minOrderValue} required. Current bill amount: ${billAmount}`);
        return {
            isValid: false,
            reason: `Minimum bill amount of ${minOrderValue} is required to redeem.`,
            redeemablePoints: 0
        };
    }

    // 3. Daily Limits (allowedRedemptionsPerDay)
    if (allowedRedemptionsPerDay > 0) {
        const startOfDay = moment().startOf('day').toDate();
        const redemptionCount = await Transaction.countDocuments({
            customerId: customer._id,
            type: 'redeem',
            createdAt: { $gte: startOfDay }
        });
        
        if (redemptionCount >= allowedRedemptionsPerDay) {
            console.log(`[RedemptionValidator] Validation Failed: Daily redemption limit of ${allowedRedemptionsPerDay} reached. Current today count: ${redemptionCount}`);
            return {
                isValid: false,
                reason: `Daily redemption limit of ${allowedRedemptionsPerDay} transactions reached.`,
                redeemablePoints: 0
            };
        }
    }

    // 4. Cooldown Period (redemptionCooldownHours)
    if (redemptionCooldownHours > 0 && !isRewardBased) {
        const cooldownThreshold = moment().subtract(redemptionCooldownHours, 'hours').toDate();
        const recentRedemption = await Transaction.findOne({
            customerId: customer._id,
            type: 'redeem',
            createdAt: { $gte: cooldownThreshold }
        }).sort({ createdAt: -1 });

        if (recentRedemption) {
            const nextRedemptionTime = moment(recentRedemption.createdAt).add(redemptionCooldownHours, 'hours').format('h:mm A');
            console.log(`[RedemptionValidator] Validation Failed: Within cooldown window. Last redemption was at ${recentRedemption.createdAt}. Cooldown hours: ${redemptionCooldownHours}`);
            return {
                isValid: false,
                reason: `Please wait until ${nextRedemptionTime} before redeeming again.`,
                redeemablePoints: 0
            };
        }
    }

    // 5. Point Maturation Calculation (Cooling Period)
    let immaturePoints = 0;
    if (pointMaturationDays > 0) {
        const maturationThreshold = moment().subtract(pointMaturationDays, 'days').toDate();
        
        // Find points EARNED after the threshold (i.e. they are immature)
        const recentPointsResult = await Transaction.aggregate([
            { 
                $match: { 
                    customerId: customer._id, 
                    type: { $in: ['loyalty', 'rule_action'] }, 
                    manualTransactionType: { $exists: false }, // EXCLUDE manual grants like apology points
                    createdAt: { $gte: maturationThreshold } 
                } 
            },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ]);
        
        immaturePoints = recentPointsResult[0] ? recentPointsResult[0].total : 0;
    }

    let trueRedeemablePoints = Math.max(0, balancePoints - immaturePoints);

    // 6. Max Redemption Amount Cap
    if (maxRedemptionAmount > 0) {
        trueRedeemablePoints = Math.min(trueRedeemablePoints, maxRedemptionAmount);
    }

    // Final checks if a specific amount was requested
    if (requestedPoints !== null && !isRewardBased) {
        const parsedRequested = parseFloat(requestedPoints);
        if (Number.isNaN(parsedRequested) || parsedRequested <= 0) {
            console.log(`[RedemptionValidator] Validation Failed: Invalid points requested: ${requestedPoints}`);
            return {
                isValid: false,
                reason: "Invalid points requested.",
                redeemablePoints: trueRedeemablePoints
            };
        }
        if (parsedRequested > trueRedeemablePoints) {
            let reasonStr = "Insufficient mature points.";
            if (immaturePoints > 0) {
                reasonStr += ` You have ${immaturePoints} points pending maturation.`;
            }
            console.log(`[RedemptionValidator] Validation Failed: ${reasonStr} Requested: ${parsedRequested}, Mature available: ${trueRedeemablePoints}`);
            return {
                isValid: false,
                reason: reasonStr,
                redeemablePoints: trueRedeemablePoints
            };
        }
    }

    console.log(`[RedemptionValidator] Validation Successful. Mature redeemable points: ${trueRedeemablePoints}`);
    return {
        isValid: true,
        reason: "Valid",
        redeemablePoints: trueRedeemablePoints
    };
}

module.exports = {
    validateRedemption
};
