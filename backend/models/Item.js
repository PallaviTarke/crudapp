const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: String,
  value: String,
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);