import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// ENV
// ======================
const API_KEY = process.env.API_KEY;
const USERNAME = process.env.USERNAME;

// 🔥 DEBUG CHECKS (IMPORTANT)
console.log("API KEY EXISTS:", !!API_KEY);
console.log("USERNAME:", USERNAME);

// HARD FAIL SAFETY
if (!API_KEY || !USERNAME) {
  console.error("❌ Missing API_KEY or USERNAME in env");
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
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": API_KEY,
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          username: USERNAME,
          to: phone,
          message: message
        })
      }
    );

    // read raw response first (prevents JSON crash)
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("❌ Non-JSON response from Africa's Talking:", text);
      return res.status(500).json({
        success: false,
        error: "Invalid response from SMS provider",
        raw: text
      });
    }

    const recipients = data?.SMSMessageData?.Recipients || [];

    const success = recipients.filter(r => r.status === "Success");
    const sent = recipients.filter(r => r.status === "Sent");

    return res.json({
      success: success.length > 0 || sent.length > 0,
      successCount: success.length,
      sentCount: sent.length,
      recipients,
      raw: data
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
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});