const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// 🚨 GLOBAL RATE LIMIT
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests ❌" }
});

app.use(limiter);
// 🔐 ENV
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || "LR_ADMIN_786";
const JWT_SECRET = process.env.JWT_SECRET || "LR_SECRET_786";

// ================= DB =================
mongoose.connect(MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));
require("./models/Match");
require("./models/User");
const { startOddsEngine } = require("./engine/liveOdds");

// ================= MIDDLEWARE =================
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.json({ message: "No token ❌" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.isAdmin = req.headers["adminkey"] === ADMIN_KEY;
    next();
  } catch {
    res.json({ message: "Invalid token ❌" });
  }
}

function isValidNumber(n) {
  return typeof n === "number" && !isNaN(n);
}

// ✅ USE REGISTERED MODELS
const User = mongoose.model("User");
const Match = mongoose.model("Match");

const Bet = mongoose.model("Bet", new mongoose.Schema({
  username: String,
  matchId: String,
  team: String,
  amount: Number,
  odds: Number,
  result: { type: String, default: "pending" }
}, { timestamps: true }));

const Deposit = mongoose.model("Deposit", new mongoose.Schema({
  username: String,
  amount: Number,
  utr: String,
  status: { type: String, default: "pending" }
}));

const Withdraw = mongoose.model("Withdraw", new mongoose.Schema({
  username: String,
  amount: Number,
  accountNumber: String,
  ifsc: String,
  name: String,
  status: { type: String, default: "pending" }
}));

const Session = mongoose.model("Session", new mongoose.Schema({
  question: String,
  yesRate: Number,
  noRate: Number,
  status: { type: String, default: "active" },
  suspended: { type: Boolean, default: false },
  result: { type: String, default: "pending" }
}));

const SessionBet = mongoose.model("SessionBet", new mongoose.Schema({
  username: String,
  sessionId: String,
  type: String,
  amount: Number,
  rate: Number,
  result: { type: String, default: "pending" }
}));

// ================= AUTH =================

// REGISTER
app.post("/api/register", async (req, res) => {
  const exist = await User.findOne({ username: req.body.username });
  if (exist) return res.json({ message: "User exists ❌" });

  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  await new User({
    username: req.body.username,
    password: hashedPassword
  }).save();

  res.json({ message: "Registered ✅" });
});

// LOGIN (TOKEN)
app.post("/api/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) return res.json({ message: "Invalid ❌" });

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) return res.json({ message: "Wrong ❌" });

  const token = jwt.sign(
    { username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ message: "Login success ✅", token });
});

// ================= MATCH =================
app.post("/api/create-match", verifyToken, async (req, res) => {
  await new Match(req.body).save();
  res.json({ message: "Match created ✅" });
});

app.get("/api/matches", verifyToken, async (req, res) => {
  res.json(await Match.find());
});
// ================= UPDATE SCORE =================
app.post("/api/update-score", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const { matchId, runs, balls, wickets } = req.body;

  const match = await Match.findById(matchId);

  if (!match)
    return res.json({ message: "Match not found ❌" });

  if (isValidNumber(runs)) match.runs = runs;
  if (isValidNumber(balls)) match.balls = balls;
  if (isValidNumber(wickets)) match.wickets = wickets;

  await match.save();

  res.json({
    message: "Score updated ✅",
    data: {
      runs: match.runs,
      balls: match.balls,
      wickets: match.wickets
    }
  });
});

// ================= BET =================
app.post("/api/place-bet", verifyToken, async (req, res) => {
  const username = req.user.username;
  const { matchId, team, amount, odds: userOdds } = req.body;

if (!amount || amount < 100 || amount > 100000)
  return res.json({ message: "Invalid amount ❌" });
if (!isValidNumber(amount)) {
  return res.json({ message: "Invalid input ❌" });
}
const user = await User.findOne({ username });
const match = await Match.findById(matchId);

if (!user || !match) return res.json({ message: "Error ❌" });

// 🚨 TEAM VALIDATION (SAFE PLACE ✅)
if (team !== match.teamA && team !== match.teamB) {
  return res.json({ message: "Invalid team ❌" });
}

// ✅ STEP 1: Match exist + safe check
if (!match) {
  return res.json({ message: "Match not found ❌" });
}

// ✅ STEP 2: Match closed check
if (match.status !== "live") {
  return res.json({ message: "Match closed ❌" });
}

// ✅ STEP 3: Suspend check
if (match.suspended === true) {
  return res.json({ message: "Market Suspended (" + match.suspendReason + ") ❌" });
}
  if (user.balance < amount) return res.json({ message: "Low balance ❌" });
  // 🛑 COOLDOWN (2 sec)
const now = Date.now();
if (now - user.lastBetTime < 2000) {
  return res.json({ message: "Wait 2 sec ❌" });
}

  let odds = team === match.teamA ? match.oddsA : match.oddsB;
  // 🛑 ODDS CHECK
if (userOdds && userOdds !== odds) {
  return res.json({ message: "Odds changed ❌" });
}

// 🔥 EXPOSURE CHECK (NEW LOGIC)
let newExposure = user.exposeBalance + amount;

// 🛑 MAX EXPOSURE LIMIT (SET 10000 for now)
if (newExposure > 10000) {
  return res.json({ message: "Exposure limit crossed ❌" });
}

// ✅ APPLY
user.balance -= amount;
user.exposeBalance = newExposure;
user.lastBetTime = Date.now();
await user.save();

  await new Bet({ username, matchId, team, amount, odds }).save();

  res.json({ message: "Bet placed ✅" });
});

// ================= RESULT =================
app.post("/api/declare-result", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  // 🔥 GET MATCH
  const match = await Match.findById(req.body.matchId);

  if (!match)
    return res.json({ message: "Match not found ❌" });

  // 🔴 MATCH CLOSE
  match.status = "closed";
  await match.save();

  const bets = await Bet.find({ matchId: req.body.matchId });

  for (let b of bets) {
    const u = await User.findOne({ username: b.username });

    if (!u) continue;

    // 🔓 expose वापस
    u.exposeBalance -= b.amount;

    // ✅ FIX: winnerTeam → winner (IMPORTANT)
    if (b.team === req.body.winner) {
      const winAmount = b.amount * b.odds;

      u.balance += winAmount; // total payout
      b.result = "win";
    } else {
      b.result = "lose";
    }

    await u.save();
    await b.save();
  }

  res.json({ message: "Result declared & match closed ✅" });
});
// ================= DEPOSIT =================
app.post("/api/deposit-request", verifyToken, async (req, res) => {
  const username = req.user.username;

  const exist = await Deposit.findOne({ utr: req.body.utr });
  if (exist) return res.json({ message: "Duplicate UTR ❌" });

  await new Deposit({
    username,
    amount: req.body.amount,
    utr: req.body.utr
  }).save();

  res.json({ message: "Deposit request sent ✅" });
});

app.post("/api/approve-deposit", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const d = await Deposit.findById(req.body.depositId);
  const u = await User.findOne({ username: d.username });

  if (d.status !== "pending")
    return res.json({ message: "Already ❌" });

  u.balance += d.amount;
  d.status = "approved";

  await u.save();
  await d.save();

  res.json({ message: "Deposit approved ✅" });
});

// ================= ADMIN: GET DEPOSITS =================
app.get("/api/deposits", verifyToken, async (req, res) => {
  if (req.headers["adminkey"] !== ADMIN_KEY)
    return res.json({ message: "Unauthorized ❌" });

  const deposits = await Deposit.find().sort({ _id: -1 });
  res.json(deposits);
});

// ================= WITHDRAW =================
app.post("/api/withdraw-request", verifyToken, async (req, res) => {
  const username = req.user.username;

  await new Withdraw({
    username,
    amount: req.body.amount,
    accountNumber: req.body.accountNumber,
    ifsc: req.body.ifsc,
    name: req.body.name
  }).save();

  res.json({ message: "Withdraw request sent ✅" });
});

app.post("/api/approve-withdraw", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const w = await Withdraw.findById(req.body.withdrawId);
  const u = await User.findOne({ username: w.username });

  if (u.balance < w.amount)
    return res.json({ message: "Insufficient balance ❌" });

  u.balance -= w.amount;
  w.status = "approved";

  await u.save();
  await w.save();

  res.json({ message: "Withdraw approved ✅" });
});

// ================= ADMIN: GET WITHDRAWS =================
app.get("/api/withdraws", verifyToken, async (req, res) => {
  if (req.headers["adminkey"] !== ADMIN_KEY)
    return res.json({ message: "Unauthorized ❌" });

  const withdraws = await Withdraw.find().sort({ _id: -1 });
  res.json(withdraws);
});

// ================= USER WALLET =================

// 🔥 Get current user wallet (balance + expose)
app.get("/api/me", verifyToken, async (req, res) => {
  const user = await User.findOne({ username: req.user.username });

  if (!user) return res.json({ message: "User not found ❌" });

  res.json({
    username: user.username,
    balance: user.balance,
    exposeBalance: user.exposeBalance
  });
});

// ================= BET HISTORY =================

// 🔥 Get user bet history
app.get("/api/my-bets", verifyToken, async (req, res) => {
  const username = req.user.username;

  const bets = await Bet.find({ username })
    .sort({ createdAt: -1 });

  const formatted = bets.map(b => {
    let credit = 0;
    let debit = 0;

    if (b.result === "win") {
      credit = b.amount * b.odds;
    } else if (b.result === "lose") {
      debit = b.amount;
    }

    return {
      matchId: b.matchId,
      team: b.team,
      amount: b.amount,
      odds: b.odds,
      result: b.result,
      credit,
      debit,
      date: b.createdAt
    };
  });

  res.json(formatted);
});

// ================= ACCOUNT STATEMENT =================

// 🔥 Full account statement
app.get("/api/statement", verifyToken, async (req, res) => {
  const username = req.user.username;

  const deposits = await Deposit.find({ username });
  const withdraws = await Withdraw.find({ username });
  const bets = await Bet.find({ username });

  let data = [];

  // deposit (credit)
  deposits.forEach(d => {
    if (d.status === "approved") {
      data.push({
        type: "deposit",
        credit: d.amount,
        debit: 0,
        date: d._id.getTimestamp()
      });
    }
  });

  // withdraw (debit)
  withdraws.forEach(w => {
    if (w.status === "approved") {
      data.push({
        type: "withdraw",
        credit: 0,
        debit: w.amount,
        date: w._id.getTimestamp()
      });
    }
  });

  // bets
  bets.forEach(b => {
    if (b.result === "win") {
      data.push({
        type: "bet-win",
        credit: b.amount * b.odds,
        debit: 0,
        date: b.createdAt
      });
    } else if (b.result === "lose") {
      data.push({
        type: "bet-loss",
        credit: 0,
        debit: b.amount,
        date: b.createdAt
      });
    }
  });

  // sort by date
  data.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(data);
});

// ================= SUSPEND SYSTEM =================

// 🔴 Ball start → suspend
app.post("/api/ball-start", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const match = await Match.findById(req.body.matchId);

  // 🔴 ONLY SESSION SUSPEND (OD चालू रहेगा)
await Session.updateMany(
  { status: "active" },
  { suspended: true }
);
  res.json({ message: "Ball started → Suspended 🔴" });
});

// 🟢 Ball end → resume
app.post("/api/ball-end", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const match = await Match.findById(req.body.matchId);

  // 🟢 Resume all sessions
await Session.updateMany(
  { status: "active" },
  { suspended: false }
);
  res.json({ message: "Ball ended → Live 🟢" });
});

// 🟡 Review start → full lock
app.post("/api/review-start", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const match = await Match.findById(req.body.matchId);

  match.suspended = true;
  match.suspendReason = "review";

  await match.save();

  res.json({ message: "Review → FULL LOCK 🟡" });
});

// 🟢 Review end → resume
app.post("/api/review-end", verifyToken, async (req, res) => {

  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const match = await Match.findById(req.body.matchId);

  // 🟢 Resume all sessions
  await Session.updateMany(
    { status: "active" },
    { suspended: false }
  );

  // 🟢 Resume match also
  match.suspended = false;
  match.suspendReason = "";
  await match.save();

  res.json({ message: "Review end → Live 🟢" });
});

// ================= SESSION =================
app.post("/api/create-session", verifyToken, async (req, res) => {
 if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  await new Session(req.body).save();
  res.json({ message: "Session created ✅" });
});

app.get("/api/sessions", verifyToken, async (req, res) => {
  res.json(await Session.find());
});

app.post("/api/session-bet", verifyToken, async (req, res) => {
  const username = req.user.username;
  const { sessionId, type, amount } = req.body;

  if (!amount || amount < 100 || amount > 100000)
  return res.json({ message: "Invalid amount ❌" });

if (!isValidNumber(amount)) {
  return res.json({ message: "Invalid input ❌" });
}

  const user = await User.findOne({ username });
const session = await Session.findById(sessionId);

// ✅ NULL CHECK
if (!session) {
  return res.json({ message: "Session not found ❌" });
}

// ✅ STATUS CHECK
if (session.status !== "active") {
  return res.json({ message: "Session closed ❌" });
}

// 🔴 SUSPEND CHECK
if (session.suspended === true) {
  return res.json({ message: "Session Suspended ❌" });
}

  if (!user || !session) return res.json({ message: "Error ❌" });
  if (user.balance < amount) return res.json({ message: "Low balance ❌" });

  let rate = type === "yes" ? session.yesRate : session.noRate;

  user.balance -= amount;
  user.exposeBalance += amount;
  await user.save();

  await new SessionBet({ username, sessionId, type, amount, rate }).save();

  res.json({ message: "Session bet placed ✅" });
});

app.post("/api/session-result", verifyToken, async (req, res) => {
  if (!req.isAdmin)
    return res.json({ message: "Unauthorized ❌" });

  const bets = await SessionBet.find({ sessionId: req.body.sessionId });

  for (let b of bets) {
    const u = await User.findOne({ username: b.username });
    u.exposeBalance -= b.amount;

    if (b.type === req.body.result) {
      u.balance += b.amount + (b.amount * b.rate) / 100;
      b.result = "win";
    } else b.result = "lose";

    await u.save();
    await b.save();
  }
// 🔥 SESSION CLOSE
  await Session.findByIdAndUpdate(req.body.sessionId, {
  status: "closed",
  result: "done"
});
  res.json({ message: "Session result declared ✅" });
});

// ================= SERVER =================
app.get("/", (req, res) => {
  res.send("Cricbet786 Running 🚀");
});

// 🛡️ CRASH PROTECTION
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('REJECTION:', err);
});

startOddsEngine();
app.listen(10000, () => console.log("🚀 Server Running"));
