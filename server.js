const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 MONGO URI
const MONGO_URI = "mongodb+srv://pkg732853_db_user:kLVOc2OrbTXwRfcd@cluster0.wadutkh.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

// 🔐 SECRET KEY
const ADMIN_KEY = "LR_ADMIN_786";

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
  result: { type: String, default: "pending" }
});
const Bet = mongoose.model("Bet", betSchema);

// ================= WITHDRAW =================
const withdrawSchema = new mongoose.Schema({
  username: String,
  amount: Number,
  accountNumber: String,
  ifsc: String,
  name: String,
  status: { type: String, default: "pending" }
});
const Withdraw = mongoose.model("Withdraw", withdrawSchema);

// ================= 🔥 NEW: DEPOSIT MODEL =================
const depositSchema = new mongoose.Schema({
  username: String,
  amount: Number,
  utr: String,
  status: { type: String, default: "pending" }
});
const Deposit = mongoose.model("Deposit", depositSchema);

// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ message: "User registered ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });

    if (!user) return res.status(400).json({ message: "Invalid ❌" });

    res.json({ message: "Login success ✅", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ADD BALANCE =================
app.post("/api/add-balance", async (req, res) => {
  try {
    const { username, amount, secretKey } = req.body;

    if (secretKey !== ADMIN_KEY)
      return res.status(403).json({ message: "Unauthorized ❌" });

    if (amount < 200)
      return res.status(400).json({ message: "Minimum deposit 200 ❌" });

    const user = await User.findOne({ username });
    user.balance += amount;
    await user.save();

    res.json({ message: "Balance added ✅", newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CREATE MATCH =================
app.post("/api/create-match", async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.json({ message: "Match created ✅", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

    const user = await User.findOne({ username });
    const match = await Match.findById(matchId);

    if (!user || !match)
      return res.status(404).json({ message: "Not found ❌" });

    if (user.balance < amount)
      return res.status(400).json({ message: "Low balance ❌" });

    let odds = team === match.teamA ? match.oddsA : match.oddsB;

    user.balance -= amount;
    await user.save();

    const bet = new Bet({ username, matchId, team, amount, odds });
    await bet.save();

    res.json({ message: "Bet placed ✅", balance: user.balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DECLARE RESULT =================
app.post("/api/declare-result", async (req, res) => {
  try {
    const { matchId, winnerTeam, secretKey } = req.body;

    if (secretKey !== ADMIN_KEY)
      return res.status(403).json({ message: "Unauthorized ❌" });

    const bets = await Bet.find({ matchId });

    for (let bet of bets) {
      if (bet.team === winnerTeam) {
        const user = await User.findOne({ username: bet.username });
        user.balance += bet.amount * bet.odds;
        await user.save();
        bet.result = "win";
      } else {
        bet.result = "lose";
      }
      await bet.save();
    }

    res.json({ message: "Result declared ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= WITHDRAW REQUEST =================
app.post("/api/withdraw-request", async (req, res) => {
  try {
    const withdraw = new Withdraw(req.body);
    await withdraw.save();
    res.json({ message: "Withdraw request sent ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= APPROVE WITHDRAW =================
app.post("/api/approve-withdraw", async (req, res) => {
  try {
    const { withdrawId, secretKey } = req.body;

    if (secretKey !== ADMIN_KEY)
      return res.status(403).json({ message: "Unauthorized ❌" });

    const withdraw = await Withdraw.findById(withdrawId);
    const user = await User.findOne({ username: withdraw.username });

    if (withdraw.status !== "pending")
      return res.status(400).json({ message: "Already processed ❌" });

    user.balance -= withdraw.amount;
    await user.save();

    withdraw.status = "approved";
    await withdraw.save();

    res.json({ message: "Withdraw approved ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 🔥 DEPOSIT REQUEST =================
app.post("/api/deposit-request", async (req, res) => {
  try {
    const { username, amount, utr } = req.body;

    const deposit = new Deposit({ username, amount, utr });
    await deposit.save();

    res.json({ message: "Deposit request sent ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 🔥 APPROVE DEPOSIT =================
app.post("/api/approve-deposit", async (req, res) => {
  try {
    const { depositId, secretKey } = req.body;

    if (secretKey !== ADMIN_KEY)
      return res.status(403).json({ message: "Unauthorized ❌" });

    const deposit = await Deposit.findById(depositId);
    const user = await User.findOne({ username: deposit.username });

    if (deposit.status !== "pending")
      return res.status(400).json({ message: "Already processed ❌" });

    user.balance += deposit.amount;
    await user.save();

    deposit.status = "approved";
    await deposit.save();

    res.json({ message: "Deposit approved ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SERVER =================
app.get("/", (req, res) => {
  res.send("Cricbet786 Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
