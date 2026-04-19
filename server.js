import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(express.json());
app.use(cors());

// ======================
// ENV CONFIG
// ======================
const API_KEY = process.env.API_KEY;
const USERNAME = process.env.USERNAME;

// Safety check (prevents silent failure)
if (!API_KEY || !USERNAME) {
  console.error("❌ Missing environment variables (API_KEY or USERNAME)");
}

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("SMS backend is alive");
});

// ======================
// SEND SMS
// ======================
app.post("/send-sms", async (req, res) => {
  const { phone, message } = req.body;

  console.log("📩 Incoming request:", req.body);

  if (!phone || !message) {
    return res.status(400).json({
      success: false,
      error: "Phone and message required"
    });
  }

  try {
    const response = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "X-API-Key": API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          username: USERNAME,
          to: phone,
          message: message
        })
      }
    );

    const text = await response.text();

    console.log("📨 Raw response:", text);

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Africa's Talking request failed",
        raw: text
      });
    }

    return res.json({
      success: true,
      raw: text
    });

  } catch (err) {
    console.error("❌ SMS ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ======================
// START SERVER (RENDER READY)
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});