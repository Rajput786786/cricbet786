const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 MongoDB connection (paste your URI here)
const MONGO_URI = "PASTE_YOUR_MONGODB_URI_HERE";

mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Test route
app.get("/", (req, res) => {
    res.send("Cricbet786 Backend Running 🚀");
});

// Sample API
app.get("/api/test", (req, res) => {
    res.json({ message: "API working ✅" });
});

// Server start
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
