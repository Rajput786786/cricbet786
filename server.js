const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection (Already configured)
const MONGO_URI = "mongodb+srv://pkg732853_db_user:kLVOc2OrbTXwRfcd@cluster0.wadutkh.mongodb.net/?retryWrites=true&w=majority";

// Connect MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch(err => console.log("❌ MongoDB Error:", err));

// Root route
app.get("/", (req, res) => {
    res.send("🚀 Cricbet786 Backend Running");
});

// Test API
app.get("/api/test", (req, res) => {
    res.json({
        status: "success",
        message: "API working perfectly ✅"
    });
});

// Server start
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`🔥 Server running on port ${PORT}`);
});
