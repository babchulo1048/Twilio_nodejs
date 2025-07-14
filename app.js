require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();

// Parse URL-encoded bodies (for Twilio webhook POSTs)
app.use(bodyParser.urlencoded({ extended: false }));

// Ignore favicon requests to reduce noise
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Your env vars
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_NUMBER,
  ADMIN_NUMBER,
  BOOKING_LINK,
  PORT = 3000,
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

  response.say({ voice: "alice" }, "Welcome to our Australia store!");
  response.pause({ length: 2 });

  const dial = response.dial({
    timeout: 20,
    action: "/handle-call-status",
    method: "POST",
  });
  dial.number(ADMIN_NUMBER);

  res.type("text/xml").send(response.toString());
});

// Handle call status webhook
app.post("/handle-call-status", async (req, res) => {
  console.log("📩 Call status webhook payload:", req.body);

  const callStatus = req.body.DialCallStatus;
  const caller = req.body.From || "Unknown";

  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();

  try {
    if (
      callStatus === "no-answer" ||
      callStatus === "busy" ||
      callStatus === "failed"
    ) {
      response.pause({ length: 1 }); // Add a short pause before message
      response.say(
        { voice: "alice" },
        "Sorry, no one is available to take your call right now. Please visit our website to book an appointment. Goodbye!"
      );

      if (caller.startsWith("+251")) {
        console.log("⚠️ SMS to Ethiopia may be restricted. Skipping SMS.");
      } else {
        await client.messages.create({
          from: TWILIO_NUMBER,
          to: caller,
          body: `Sorry we missed your call! You can book an appointment here: ${BOOKING_LINK}`,
        });
        console.log("📤 SMS sent to", caller);
      }
    } else {
      response.pause({ length: 1 }); // Optional pause before goodbye message
      response.say({ voice: "alice" }, "Thank you for your call. Goodbye!");
      console.log("✅ Call completed normally");
    }
  } catch (error) {
    console.error("❌ Error in call status handler:", error.message);
    response.pause({ length: 1 });
    response.say(
      { voice: "alice" },
      "Thank you for your call. We encountered an issue, please visit our website for more information. Goodbye!"
    );
  }

  res.type("text/xml").send(response.toString());
});

// Catch aborted requests gracefully
app.use((err, req, res, next) => {
  if (err.type === "entity.aborted") {
    console.warn("⚠️ Request aborted prematurely (likely client disconnect)");
    return res.status(400).send("Request aborted");
  }
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
