const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappNumber) {
  console.error(' Missing Twilio configuration in environment variables');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

module.exports = {
  client,
  whatsappNumber
};