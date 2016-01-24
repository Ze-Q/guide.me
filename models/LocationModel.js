var mongoose = require('mongoose');

var locationSchema = new mongoose.Schema({
  sid: String,
  sName: String,
  sImageUrl: String
});

var Location = mongoose.model('Book', locationSchema);
module.exports = Location;