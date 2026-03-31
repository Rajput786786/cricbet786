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


// ================= USER MODEL =================
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);


// ================= MATCH MODEL =================
const matchSchema = new mongoose.Schema({
  teamA: String,
  teamB: String,
  oddsA: Number,
  oddsB: Number,
  status: { type: String, default: "live" } // live / ended
});

const Match = mongoose.model("Match", matchSchema);


// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const newUser = new User({ username, password });
    await newUser.save();

    res.json({ message: "User registered successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials ❌" });
    }

    res.json({ message: "Login success ✅", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= ADD BALANCE =================
app.post("/api/add-balance", async (req, res) => {
  try {
    const { username, amount, secretKey } = req.body;

    if (secretKey !== "LR_ADMIN_786") {
      return res.status(403).json({ message: "Unauthorized ❌" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found ❌" });
    }

    user.balance += amount;
    await user.save();

    res.json({ message: "Balance added successfully ✅", newBalance: user.balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= CREATE MATCH =================
app.post("/api/create-match", async (req, res) => {
  try {
    const { teamA, teamB, oddsA, oddsB } = req.body;

    const match = new Match({ teamA, teamB, oddsA, oddsB });
    await match.save();

    res.json({ message: "Match created ✅", match });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= GET MATCHES =================
app.get("/api/matches", async (req, res) => {
  try {
    const matches = await Match.find();
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// TEST
app.get("/", (req, res) => {
  res.send("Cricbet786 Backend Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
