const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Secure MongoDB connection (from ENV)
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log(err));

// Home route
app.get("/", (req, res) => {
    res.send("Cricbet786 Backend Running 🚀");
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
    console.log(`Server running on port ${PORT}`);
});
