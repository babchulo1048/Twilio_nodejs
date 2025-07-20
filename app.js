require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/favicon.ico", (req, res) => res.status(204).end());

const PORT = process.env.PORT || 3000;
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER,
  ADMIN_NUMBER,
  BOOKING_LINK,
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Health check
app.get("/", (req, res) => res.send("Twilio call handling server is running."));

// Incoming call webhook
app.post("/incoming-call", (req, res) => {
  const caller = req.body.From || "Unknown";
  console.log("📞 Incoming call from:", caller);

  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();

  response.play("https://twilio-nodejs-y742.onrender.com/welcome-1.mp3");
  response.pause({ length: 2 });

  const dial = response.dial({
    timeout: 20,
    action: "/handle-call-status",
    method: "POST",
    answerOnBridge: true, // Critical for voicemail detection
    record: "do-not-record", // Explicitly disable recording
  });
  dial.number(ADMIN_NUMBER);

  res.type("text/xml").send(response.toString());
});

// Handle call status webhook - IMPROVED VERSION
app.post("/handle-call-status", async (req, res) => {
  console.log("📩 Call status webhook payload:", req.body);

  let callStatus = req.body.DialCallStatus;
  const caller = req.body.From || "Unknown";
  const callDuration = parseInt(req.body.DialCallDuration || "0");

  // Enhanced voicemail/no-answer detection
  if (callStatus === "completed" && callDuration < 5) {
    callStatus = "no-answer";
    console.log("⚠️ Short call duration - treating as no-answer");
  }

  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();

  try {
    if (
      callStatus === "no-answer" ||
      callStatus === "busy" ||
      callStatus === "failed" ||
      (callStatus === "completed" && callDuration < 5)
    ) {
      response.pause({ length: 2 });
      response.play("https://twilio-nodejs-y742.onrender.com/soory-1.mp3");

      // Skip SMS for Ethiopian numbers and potential landlines
      if (!caller.startsWith("+251") && caller.match(/^\+?[0-9]+$/)) {
        try {
          await client.messages.create({
            from: TWILIO_NUMBER,
            to: caller,
            body: `Sorry we missed your call! Book online: ${BOOKING_LINK}`,
          });
          console.log("📤 SMS sent to", caller);
        } catch (smsError) {
          console.error("❌ SMS failed:", smsError.message);
        }
      }
    } else {
      response.pause({ length: 1 });
      response.play("https://twilio-nodejs-y742.onrender.com/thank-2.mp3");
      console.log("✅ Call completed successfully");
    }
  } catch (error) {
    console.error("❌ Error in call status handler:", error.message);
    response.pause({ length: 1 });
    response.play("https://twilio-nodejs-y742.onrender.com/thank-1.mp3");
  }

  res.type("text/xml").send(response.toString());
});

// Error handling
app.use((err, req, res, next) => {
  if (err.type === "entity.aborted") {
    console.warn("⚠️ Request aborted (client disconnect)");
    return res.status(400).send("Request aborted");
  }
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
