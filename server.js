const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb+srv://pkg732853_db_user:kLVOc2OrbTXwRfcd@cluster0.wadutkh.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

// ================= USER =================
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  balance: { type: Number, default: 0 }
});
const User = mongoose.model("User", userSchema);

// ================= MATCH =================
const matchSchema = new mongoose.Schema({
  teamA: String,
  teamB: String,
  oddsA: Number,
  oddsB: Number,
  status: { type: String, default: "live" }
});
const Match = mongoose.model("Match", matchSchema);

// ================= BET =================
const betSchema = new mongoose.Schema({
  username: String,
  matchId: String,
  team: String,
  amount: Number,
  odds: Number,
  status: { type: String, default: "pending" }
});
const Bet = mongoose.model("Bet", betSchema);

// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });
  await user.save();
  res.json({ message: "User registered ✅" });
});

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });

  if (!user) return res.status(400).json({ message: "Invalid ❌" });

  res.json({ message: "Login success ✅", user });
});

// ================= ADD BALANCE =================
app.post("/api/add-balance", async (req, res) => {
  const { username, amount, secretKey } = req.body;

  if (secretKey !== "LR_ADMIN_786")
    return res.status(403).json({ message: "Unauthorized ❌" });

  if (amount < 200)
    return res.status(400).json({ message: "Minimum deposit 200 ❌" });

  const user = await User.findOne({ username });
  user.balance += amount;
  await user.save();

  res.json({ message: "Balance added ✅", newBalance: user.balance });
});

// ================= CREATE MATCH =================
app.post("/api/create-match", async (req, res) => {
  const { teamA, teamB, oddsA, oddsB } = req.body;

  const match = new Match({ teamA, teamB, oddsA, oddsB });
  await match.save();

  res.json({ message: "Match created ✅", match });
});

// ================= GET MATCH =================
app.get("/api/matches", async (req, res) => {
  const matches = await Match.find();
  res.json(matches);
});

// ================= PLACE BET =================
app.post("/api/place-bet", async (req, res) => {
  try {
    const { username, matchId, team, amount } = req.body;

    if (amount < 100)
      return res.status(400).json({ message: "Minimum bet 100 ❌" });

    if (!mongoose.Types.ObjectId.isValid(matchId))
      return res.status(400).json({ message: "Invalid match ID ❌" });

    const user = await User.findOne({ username });
    const match = await Match.findById(matchId);

    if (!user) return res.status(404).json({ message: "User not found ❌" });
    if (!match) return res.status(404).json({ message: "Match not found ❌" });

    if (user.balance < amount)
      return res.status(400).json({ message: "Low balance ❌" });

    let odds = team === match.teamA ? match.oddsA : match.oddsB;

    user.balance -= amount;
    await user.save();

    const bet = new Bet({ username, matchId, team, amount, odds });
    await bet.save();

    res.json({ message: "Bet placed ✅", remainingBalance: user.balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RESULT DECLARE =================
app.post("/api/declare-result", async (req, res) => {
  const { matchId, winnerTeam, secretKey } = req.body;

  if (secretKey !== "LR_ADMIN_786")
    return res.status(403).json({ message: "Unauthorized ❌" });

  const bets = await Bet.find({ matchId });

  for (let bet of bets) {
    if (bet.team === winnerTeam) {
      const winAmount = bet.amount * bet.odds;

      const user = await User.findOne({ username: bet.username });
      user.balance += winAmount;
      await user.save();

      bet.status = "win";
    } else {
      bet.status = "lose";
    }
    await bet.save();
  }

  res.json({ message: "Result declared ✅" });
});

// ================= TEST =================
app.get("/", (req, res) => {
  res.send("Cricbet786 Backend Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running"));
