const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
 firstName: String,
 lastName: String,
 phoneNo: { type: String, unique: true },
 email: { type: String, unique: true },
 password: String,
 countryCode: String,
 loginIdentifier: String,
 otp: String,
 otpExpiresAt: Date,
 isOtpVerified: Boolean,
 isNewUser: Boolean,
 accessTo: { type: Schema.Types.ObjectId, ref: 'Organization' },
 createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
 isDeleted: { type: Boolean },
 createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
