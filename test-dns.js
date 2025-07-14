const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dns.lookup("api.twilio.com", (err, address, family) => {
  if (err) {
    console.error("DNS lookup error:", err);
  } else {
    console.log(`DNS lookup success: ${address} (IPv${family})`);
  }
});
