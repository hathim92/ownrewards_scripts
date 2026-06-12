const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  outletName: {
    type: String,
  },
  restId: String,
  belongsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  website: String,
  googleReviewUrl: String,
  posName: String,
  address: String,
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
  country: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  timeZone: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    trim: true
  },
  longitude: Number,
  latitude: Number,
  expiredWebhookUrl: String,
  specialDayUrl: String,
  merchantToken: String,
  isActive: {
    type: Boolean,
    default: true
  }
},
{ timestamps: true });

projectSchema.index({ belongsTo: 1 });

// Register Project model
const Project = mongoose.model('Project', projectSchema);

// Register Outlet model alias using the same collection 'projects' to satisfy ref: 'Outlet' relations
const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', projectSchema, 'projects');

module.exports = Project;
