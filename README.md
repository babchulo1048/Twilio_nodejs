# 📞 Twilio Call Handling Server

This is a simple Node.js + Express server that handles incoming Twilio calls, routes them to an admin number, and optionally sends SMS follow-ups when calls are missed, busy, or fail.

## 🚀 Features

- Handles incoming calls via Twilio webhook
- Plays welcome/thank-you audio messages
- Forwards calls to an admin number
- Detects short/failed/busy/no-answer calls
- Sends an SMS follow-up with a booking link (except to Ethiopian numbers)
- Graceful error handling

---

## 📦 Requirements

- Node.js (v14 or above)
- Twilio account (with a phone number)
- `.env` file with credentials
