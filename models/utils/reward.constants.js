const REWARD_ERROR_CODES = {
    BUDGET_EXHAUSTED: 'REWARD_BUDGET_EXHAUSTED',
    MAX_ISSUED_TOTAL: 'REWARD_MAX_ISSUED_TOTAL',
    MAX_PER_CUSTOMER: 'REWARD_MAX_PER_CUSTOMER',
    NOT_ACTIVE: 'REWARD_NOT_ACTIVE',
    EXPIRED: 'REWARD_EXPIRED',
    NOT_STARTED: 'REWARD_NOT_STARTED',
    CUSTOMER_NOT_ELIGIBLE: 'REWARD_CUSTOMER_NOT_ELIGIBLE',
    OUTLET_MISMATCH: 'REWARD_OUTLET_MISMATCH',
    BILL_BELOW_MINIMUM: 'REWARD_BILL_BELOW_MINIMUM',
    ALREADY_ACTIVE: 'REWARD_ALREADY_ACTIVE',
    ALREADY_REDEEMED: 'REWARD_ALREADY_REDEEMED',
    ONE_TIME_USE_LIMIT: 'REWARD_ONE_TIME_USE_LIMIT',
    NOT_FOUND: 'REWARD_NOT_FOUND',
    SYSTEM_ERROR: 'REWARD_SYSTEM_ERROR'
};

const REWARD_USER_MESSAGES = {
    [REWARD_ERROR_CODES.BUDGET_EXHAUSTED]: "This reward has reached its distribution limit.",
    [REWARD_ERROR_CODES.MAX_ISSUED_TOTAL]: "This reward is fully claimed.",
    [REWARD_ERROR_CODES.MAX_PER_CUSTOMER]: "You have reached the maximum claim limit for this reward.",
    [REWARD_ERROR_CODES.NOT_ACTIVE]: "This reward is currently inactive.",
    [REWARD_ERROR_CODES.EXPIRED]: "This reward has expired.",
    [REWARD_ERROR_CODES.NOT_STARTED]: "This reward campaign has not started yet.",
    [REWARD_ERROR_CODES.CUSTOMER_NOT_ELIGIBLE]: "You are not eligible for this reward.",
    [REWARD_ERROR_CODES.OUTLET_MISMATCH]: "This reward is not applicable at this outlet.",
    [REWARD_ERROR_CODES.BILL_BELOW_MINIMUM]: "Minimum bill amount required to unlock this reward.",
    [REWARD_ERROR_CODES.ALREADY_ACTIVE]: "You already have an active coupon for this reward.",
    [REWARD_ERROR_CODES.ALREADY_REDEEMED]: "You have already redeemed this reward.",
    [REWARD_ERROR_CODES.ONE_TIME_USE_LIMIT]: "This specific reward can only be claimed once.",
    [REWARD_ERROR_CODES.NOT_FOUND]: "Reward not found.",
    [REWARD_ERROR_CODES.SYSTEM_ERROR]: "Unable to process reward validation."
};

module.exports = {
    REWARD_ERROR_CODES,
    REWARD_USER_MESSAGES
};
