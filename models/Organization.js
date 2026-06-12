const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const organizationSchema = new mongoose.Schema({
 name: {
  type: String,
  trim: true
 },
 type: {
  type: String,
  trim: true
 },
 noOfEmployees: {
  type: String,
 },
 timeZone: {
  type: String,
  trim: true
 },
 taxId: {
  type: String
 },
 addressLine1: {
  type: String,
  trim: true
 },
 addressLine2: {
  type: String,
  trim: true
 },
 city: {
  type: String,
  trim: true
 },
 state: {
  type: String,
  trim: true
 },
 currency: String,

 country: {
  type: String,
  trim: true
 },
 zipCode: {
  type: String,
  trim: true
 },
 logoUrl: {
  type: String,
  trim: true
 },

 createdAt: {
  type: Date,
  default: Date.now
 },
 createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

});

module.exports = mongoose.model('Organization', organizationSchema);
