const { client, whatsappNumber } = require('../config/twilio');
const chatFlowService = require('./chatFlowService');

class WhatsAppService {
  
  // Handle incoming WhatsApp messages
  async handleIncomingMessage(req, res) {
    try {
      const { From, Body } = req.body;
      
      // Extract phone number (remove whatsapp: prefix)
      const phoneNumber = From.replace('whatsapp:', '');
      const message = Body.trim();
      
      console.log(`📱 Received message from ${phoneNumber}: ${message}`);
      
      // Process the message through chat flow
      const response = await chatFlowService.processUserResponse(phoneNumber, message);
      
      // Send response back to user
      await this.sendMessage(phoneNumber, response);
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling message:', error);
      res.status(500).send('Error processing message');
    }
  }

  // Send message to WhatsApp user
  async sendMessage(phoneNumber, message) {
    try {
      const response = await client.messages.create({
        body: message,
        from: whatsappNumber,
        to: `whatsapp:${phoneNumber}`
      });
      
      console.log(`Message sent to ${phoneNumber}: ${response.sid}`);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send welcome message (can be used for marketing)
  async sendWelcomeMessage(phoneNumber) {
    const welcomeMessage = "💧 Welcome to Zoss Water! How can we help you today?";
    return this.sendMessage(phoneNumber, welcomeMessage);
  }
}

module.exports = new WhatsAppService();
