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

if (!API_KEY || !USERNAME) {
  console.error("❌ Missing API_KEY or USERNAME in environment variables");
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
    // ======================
    // AFRICA'S TALKING REQUEST
    // ======================
    const response = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": API_KEY
        },
        body: new URLSearchParams({
          username: USERNAME,
          to: phone,
          message: message
        })
      }
    );

    // IMPORTANT: parse JSON (NOT text)
    const data = await response.json();

    console.log("📨 Parsed response:");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "Africa's Talking request failed",
        raw: data
      });
    }

    const recipients = data?.SMSMessageData?.Recipients || [];

    const success = recipients.filter(r => r.status === "Success");
    const sent = recipients.filter(r => r.status === "Sent");
    const failed = recipients.filter(
      r => r.status !== "Success" && r.status !== "Sent"
    );

    return res.json({
      success: success.length > 0,
      successCount: success.length,
      sentCount: sent.length,
      failedCount: failed.length,
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