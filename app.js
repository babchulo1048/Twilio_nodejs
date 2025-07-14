const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const TWILIO_NUMBER = process.env.TWILIO_NUMBER;
const ADMIN_NUMBER = process.env.ADMIN_NUMBER;
const bookingLink = process.env.BOOKING_LINK;

// Health check
app.get("/", (req, res) => {
  res.send("Twilio call handling server is running.");
});

// Step 1: Incoming call handler
app.post("/incoming-call", (req, res) => {
  const caller = req.body.From;
  console.log("📞 Incoming call from:", caller);

  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();

  // 1. Welcome message
  response.say({ voice: "alice" }, "Welcome to our Australia store!");
  console.log("✅ Said welcome message");

  // 2. Dial admin number with timeout
  const dial = response.dial({
    timeout: 20,
    action: "/handle-call-status", // Will send call status (completed, no-answer, etc.)
    method: "POST",
  });
  dial.number(ADMIN_NUMBER);
  console.log("📞 Dialing admin:", ADMIN_NUMBER);

  res.type("text/xml");
  res.send(response.toString());
});

// Step 2: Handle status after dialing admin
app.post("/handle-call-status", async (req, res) => {
  const callStatus = req.body.DialCallStatus;
  const caller = req.body.From;

  console.log("📟 Call status:", callStatus, "| From:", caller);

  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();

  if (
    callStatus === "no-answer" ||
    callStatus === "busy" ||
    callStatus === "failed"
  ) {
    // 3. Say sorry
    response.say(
      { voice: "alice" },
      "Sorry, no one is available to take your call right now. We've sent you a text with our booking link. Goodbye!"
    );
    console.log("😞 Said sorry message");

    // 4. Send SMS
    try {
      await client.messages.create({
        from: TWILIO_NUMBER,
        to: caller,
        body: `Sorry we missed your call! You can book an appointment here: ${bookingLink}`,
      });
      console.log("📤 SMS sent to", caller);
    } catch (error) {
      console.error("❌ Failed to send SMS:", error.message);
    }
  } else {
    response.say({ voice: "alice" }, "Thank you for your call. Goodbye!");
    console.log("✅ Call completed normally");
  }

  res.type("text/xml");
  res.send(response.toString());
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
