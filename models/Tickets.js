const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  issue: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  preferredDate: {
    type: String,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['booked', 'in-progress', 'completed', 'cancelled'],
    default: 'booked'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);