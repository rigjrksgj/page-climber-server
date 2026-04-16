const mongoose = require("mongoose");

const MONGODB_URI = "mongodb+srv://28costanbe_db_user:ulicABfWz2gf3n8p@cluster0.pgkrcfa.mongodb.net/?appName=Cluster0";

console.log("Testing MongoDB connection...");
console.log("URI:", MONGODB_URI.substring(0, 50) + "...");

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB connection successful!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:");
    console.error(err.message);
    process.exit(1);
  });

// Timeout after 10 seconds
setTimeout(() => {
  console.error("❌ Connection timeout");
  process.exit(1);
}, 10000);
