const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log(err));

// Home
app.get("/", (req, res) => {
    res.send("Cricbet786 Backend Running 🚀");
});

// Test
app.get("/api/test", (req, res) => {
    res.json({
        status: "success",
        message: "API working perfectly ✅"
    });
});

// 🔐 REGISTER API
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = new User({ username, password });
        await user.save();

        res.json({ message: "User registered ✅" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔐 LOGIN API
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username, password });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials ❌" });
        }

        res.json({
            message: "Login successful ✅",
            user
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
