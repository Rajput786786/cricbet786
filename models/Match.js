const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  teamA: String,
  teamB: String,

  oddsA: Number,
  oddsB: Number,

  status: { type: String, default: "live" },

  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 120 },
  wickets: { type: Number, default: 0 },
  target: { type: Number, default: 120 },

  suspended: { type: Boolean, default: false },
  suspendReason: { type: String, default: "" }
});

module.exports = mongoose.model("Match", matchSchema);
