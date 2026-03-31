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

// ================= SESSION MODEL =================
const sessionSchema = new mongoose.Schema({
  question: String,
  yesRate: Number,
  noRate: Number,
  status: { type: String, default: "active" }, // active / suspended / closed
  result: { type: String, default: "pending" } // yes / no
});
const Session = mongoose.model("Session", sessionSchema);

// ================= SESSION BET =================
const sessionBetSchema = new mongoose.Schema({
  username: String,
  sessionId: String,
  type: String, // yes / no
  amount: Number,
  rate: Number,
  result: { type: String, default: "pending" }
});
const SessionBet = mongoose.model("SessionBet", sessionBetSchema);

// ================= CREATE SESSION =================
app.post("/api/create-session", async (req, res) => {
  try {
    const { question, yesRate, noRate, secretKey } = req.body;

    if (secretKey !== ADMIN_KEY) {
      return res.status(403).json({ message: "Unauthorized ❌" });
    }

    const session = new Session({ question, yesRate, noRate });
    await session.save();

    res.json({ message: "Session created ✅", session });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET SESSION =================
app.get("/api/sessions", async (req, res) => {
  const sessions = await Session.find();
  res.json(sessions);
});

// ================= PLACE SESSION BET =================
app.post("/api/session-bet", async (req, res) => {
  try {
    const { username, sessionId, type, amount } = req.body;

    if (amount < 100) {
      return res.status(400).json({ message: "Minimum 100 ❌" });
    }

    const user = await User.findOne({ username });
    const session = await Session.findById(sessionId);

    if (!user) return res.status(404).json({ message: "User not found ❌" });
    if (!session) return res.status(404).json({ message: "Session not found ❌" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Session closed ❌" });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: "Low balance ❌" });
    }

    let rate = type === "yes" ? session.yesRate : session.noRate;

    user.balance -= amount;
    await user.save();

    const bet = new SessionBet({
      username,
      sessionId,
      type,
      amount,
      rate
    });

    await bet.save();

    res.json({
      message: "Session bet placed ✅",
      balance: user.balance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DECLARE SESSION RESULT =================
app.post("/api/session-result", async (req, res) => {
  try {
    const { sessionId, result, secretKey } = req.body;

    if (secretKey !== ADMIN_KEY) {
      return res.status(403).json({ message: "Unauthorized ❌" });
    }

    const bets = await SessionBet.find({ sessionId });

    for (let bet of bets) {
      const user = await User.findOne({ username: bet.username });

      if (bet.type === result) {
        let win = bet.amount * (bet.rate / 100);
        user.balance += bet.amount + win;
        bet.result = "win";
      } else {
        bet.result = "lose";
      }

      await user.save();
      await bet.save();
    }

    await Session.findByIdAndUpdate(sessionId, {
      status: "closed",
      result
    });

    res.json({ message: "Session result declared ✅" });

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
