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

// 🔐 ADMIN KEY
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

// ================= DEPOSIT =================
const depositSchema = new mongoose.Schema({
  username: String,
  amount: Number,
  utr: String,
  status: { type: String, default: "pending" }
});
const Deposit = mongoose.model("Deposit", depositSchema);

// ================= SESSION =================
const sessionSchema = new mongoose.Schema({
  question: String,
  yesRate: Number,
  noRate: Number,
  status: { type: String, default: "active" },
  result: { type: String, default: "pending" }
});
const Session = mongoose.model("Session", sessionSchema);

// ================= SESSION BET =================
const sessionBetSchema = new mongoose.Schema({
  username: String,
  sessionId: String,
  type: String,
  amount: Number,
  rate: Number,
  result: { type: String, default: "pending" }
});
const SessionBet = mongoose.model("SessionBet", sessionBetSchema);

// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
  const exist = await User.findOne({ username: req.body.username });
  if (exist) return res.json({ message: "User already exists ❌" });

  const user = new User(req.body);
  await user.save();

  res.json({ message: "User registered ✅" });
});

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  const user = await User.findOne(req.body);
  if (!user) return res.status(400).json({ message: "Invalid ❌" });

  res.json({ message: "Login success ✅", user });
});

// ================= CREATE MATCH =================
app.post("/api/create-match", async (req, res) => {
  const match = new Match(req.body);
  await match.save();
  res.json({ message: "Match created ✅", match });
});

// ================= GET MATCH =================
app.get("/api/matches", async (req, res) => {
  res.json(await Match.find());
});

// ================= PLACE BET =================
app.post("/api/place-bet", async (req, res) => {
  const { username, matchId, team, amount } = req.body;

  if (amount < 100) return res.json({ message: "Minimum 100 ❌" });

  const user = await User.findOne({ username });
  const match = await Match.findById(matchId);

  if (!user || !match) return res.json({ message: "Error ❌" });

  if (user.balance < amount) return res.json({ message: "Low balance ❌" });

  let odds = team === match.teamA ? match.oddsA : match.oddsB;

  user.balance -= amount;
  await user.save();

  await new Bet({ username, matchId, team, amount, odds }).save();

  res.json({ message: "Bet placed ✅" });
});

// ================= RESULT =================
app.post("/api/declare-result", async (req, res) => {
  const { matchId, winnerTeam, secretKey } = req.body;

  if (secretKey !== ADMIN_KEY) return res.json({ message: "Unauthorized ❌" });

  const bets = await Bet.find({ matchId });

  for (let bet of bets) {
    if (bet.team === winnerTeam) {
      const user = await User.findOne({ username: bet.username });
      user.balance += bet.amount * bet.odds;
      await user.save();
      bet.result = "win";
    } else bet.result = "lose";

    await bet.save();
  }

  res.json({ message: "Result declared ✅" });
});

// ================= DEPOSIT =================
app.post("/api/deposit-request", async (req, res) => {
  const exist = await Deposit.findOne({ utr: req.body.utr });
  if (exist) return res.json({ message: "Duplicate UTR ❌" });

  await new Deposit(req.body).save();
  res.json({ message: "Deposit request sent ✅" });
});

app.post("/api/approve-deposit", async (req, res) => {
  const { depositId, secretKey } = req.body;

  if (secretKey !== ADMIN_KEY) return res.json({ message: "Unauthorized ❌" });

  const d = await Deposit.findById(depositId);
  const u = await User.findOne({ username: d.username });

  if (d.status !== "pending") return res.json({ message: "Already ❌" });

  u.balance += d.amount;
  await u.save();

  d.status = "approved";
  await d.save();

  res.json({ message: "Deposit approved ✅" });
});

// ================= WITHDRAW =================
app.post("/api/withdraw-request", async (req, res) => {
  await new Withdraw(req.body).save();
  res.json({ message: "Withdraw request sent ✅" });
});

app.post("/api/approve-withdraw", async (req, res) => {
  const { withdrawId, secretKey } = req.body;

  if (secretKey !== ADMIN_KEY) return res.json({ message: "Unauthorized ❌" });

  const w = await Withdraw.findById(withdrawId);
  const u = await User.findOne({ username: w.username });

  if (u.balance < w.amount)
    return res.json({ message: "Insufficient balance ❌" });

  u.balance -= w.amount;
  await u.save();

  w.status = "approved";
  await w.save();

  res.json({ message: "Withdraw approved ✅" });
});

// ================= SESSION =================
app.post("/api/create-session", async (req, res) => {
  if (req.body.secretKey !== ADMIN_KEY)
    return res.json({ message: "Unauthorized ❌" });

  await new Session(req.body).save();
  res.json({ message: "Session created ✅" });
});

app.get("/api/sessions", async (req, res) => {
  res.json(await Session.find());
});

app.post("/api/session-bet", async (req, res) => {
  const { username, sessionId, type, amount } = req.body;

  if (amount < 100)
    return res.json({ message: "Minimum 100 ❌" });

  const user = await User.findOne({ username });
  const session = await Session.findById(sessionId);

  if (!user || !session)
    return res.json({ message: "Error ❌" });

  if (user.balance < amount)
    return res.json({ message: "Low balance ❌" });

  let rate = type === "yes" ? session.yesRate : session.noRate;

  user.balance -= amount;
  await user.save();

  await new SessionBet({ username, sessionId, type, amount, rate }).save();

  res.json({ message: "Session bet placed ✅" });
});

app.post("/api/session-result", async (req, res) => {
  if (req.body.secretKey !== ADMIN_KEY)
    return res.json({ message: "Unauthorized ❌" });

  const bets = await SessionBet.find({ sessionId: req.body.sessionId });

  for (let b of bets) {
    const u = await User.findOne({ username: b.username });

    if (b.type === req.body.result) {
      u.balance += b.amount + (b.amount * b.rate) / 100;
      b.result = "win";
    } else b.result = "lose";

    await u.save();
    await b.save();
  }

  res.json({ message: "Session result declared ✅" });
});

// ================= SERVER =================
app.get("/", (req, res) => {
  res.send("Cricbet786 Running 🚀");
});

app.listen(10000, () => console.log("🚀 Server Running"));
