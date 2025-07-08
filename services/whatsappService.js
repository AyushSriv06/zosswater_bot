const { client, whatsappNumber } = require('../config/twilio');
const chatFlowService = require('./chatFlowService');
const sessionManager = require('../utils/sessionManager');

class WhatsAppService {
  
  // Main handler for ALL incoming WhatsApp messages
  async handleIncomingMessage(req, res) {
    try {
      const { From, Body, ProfileName } = req.body;
      
      // Extract phone number (remove whatsapp: prefix)
      const phoneNumber = From.replace('whatsapp:', '');
      const message = Body ? Body.trim() : '';
      const customerName = ProfileName || 'Customer';
      
      console.log(`📱 Message from ${phoneNumber} (${customerName}): "${message}"`);
      
      // Check if this is a first-time interaction
      const isFirstInteraction = await this.checkFirstInteraction(phoneNumber);
      
      let response;
      
      if (isFirstInteraction) {
        // First time customer - send welcome and start flow
        response = await this.handleFirstTimeCustomer(phoneNumber, customerName);
      } else {
        // Existing conversation - continue with chat flow
        response = await chatFlowService.processUserResponse(phoneNumber, message);
      }
      
      // Send response back to customer
      if (response) {
        await this.sendMessage(phoneNumber, response);
      }
      
      // Log successful interaction
      console.log(`✅ Response sent to ${phoneNumber}`);
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error handling message:', error);
      
      // Send error message to customer
      try {
        const phoneNumber = req.body.From?.replace('whatsapp:', '');
        if (phoneNumber) {
          await this.sendMessage(phoneNumber, 
            "Sorry, we're experiencing technical difficulties. Please try again in a few minutes."
          );
        }
      } catch (sendError) {
        console.error('❌ Error sending error message:', sendError);
      }
      
      res.status(500).send('Error processing message');
    }
  }

  // Check if this is the customer's first interaction
  async checkFirstInteraction(phoneNumber) {
    const session = sessionManager.getSession(phoneNumber);
    
    // If no session exists, this is likely a first interaction
    if (!session) {
      return true;
    }
    
    // If session exists but no step defined, treat as first interaction
    if (!session.step) {
      return true;
    }
    
    return false;
  }

  // Handle first-time customer interaction
  async handleFirstTimeCustomer(phoneNumber, customerName) {
    console.log(`🆕 First interaction detected for ${phoneNumber}`);
    
    // Initialize the workflow through chatFlowService
    return await chatFlowService.handleNewCustomer(phoneNumber, customerName);
  }

  // Send message to WhatsApp user
  async sendMessage(phoneNumber, message) {
    try {
      const response = await client.messages.create({
        body: message,
        from: whatsappNumber,
        to: `whatsapp:${phoneNumber}`
      });
      
      console.log(`📤 Message sent to ${phoneNumber}: ${response.sid}`);
      return response;
    } catch (error) {
      console.error(`❌ Error sending message to ${phoneNumber}:`, error);
      throw error;
    }
  }

  // Send welcome message (can be used for proactive messaging)
  async sendWelcomeMessage(phoneNumber) {
    const welcomeMessage = "💧 Welcome to Zoss Water! How can we help you today?";
    return this.sendMessage(phoneNumber, welcomeMessage);
  }

  // Send bulk welcome messages to multiple customers
  async sendBulkWelcomeMessages(phoneNumbers) {
    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        await this.sendWelcomeMessage(phoneNumber);
        results.push({ phoneNumber, status: 'success' });
        console.log(`✅ Welcome sent to ${phoneNumber}`);
        
        // Add delay to avoid rate limiting (1 message per second)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ phoneNumber, status: 'error', error: error.message });
        console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);
      }
    }
    
    return results;
  }
}

module.exports = new WhatsAppService();