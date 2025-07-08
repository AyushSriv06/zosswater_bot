const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const sessionManager = require('../utils/sessionManager');

class ChatFlowService {
  
  // Handle new customer interaction with optional customer name
  async handleNewCustomer(phoneNumber, customerName = 'Customer') {
    console.log(`🔍 Checking customer status for ${phoneNumber}`);
    
    try {
      const customer = await Customer.findOne({ phone: phoneNumber });
      
      if (customer) {
        // Existing customer - start service flow
        sessionManager.setSession(phoneNumber, {
          step: 'ask_issue',
          customerId: customer._id,
          customerName: customer.name
        });
        
        return `Hello ${customer.name}! 👋\n\nWelcome back to Zoss Water! How can we help you today?\n\nPlease describe the issue you're facing with your Zoss Water purifier.`;
      } else {
        // New customer - start registration
        sessionManager.setSession(phoneNumber, {
          step: 'ask_name',
          registrationData: {
            profileName: customerName // Store WhatsApp profile name for reference
          }
        });
        
        return `💧 Welcome to Zoss Water! How can we help you today?\n\nI see you're a new customer. Let me help you register first so we can provide you with the best service.\n\nPlease provide your full name:`;
      }
    } catch (error) {
      console.error('❌ Error checking customer:', error);
      return "Welcome to Zoss Water! We're experiencing a temporary issue. Please try again in a moment.";
    }
  }

  // Process user response based on current step
  async processUserResponse(phoneNumber, message) {
    const session = sessionManager.getSession(phoneNumber);
    
    if (!session) {
      // No session found, treat as new customer
      return this.handleNewCustomer(phoneNumber);
    }

    // Handle empty messages
    if (!message || message.trim() === '') {
      return this.handleEmptyMessage(session.step);
    }

    // Process based on current step
    switch (session.step) {
      case 'ask_name':
        return this.handleNameInput(phoneNumber, message);
      
      case 'ask_email':
        return this.handleEmailInput(phoneNumber, message);
      
      case 'ask_issue':
        return this.handleIssueInput(phoneNumber, message);
      
      case 'ask_model':
        return this.handleModelInput(phoneNumber, message);
      
      case 'ask_address':
        return this.handleAddressInput(phoneNumber, message);
      
      case 'ask_date':
        return this.handleDateInput(phoneNumber, message);
      
      case 'ask_time':
        return this.handleTimeInput(phoneNumber, message);
      
      default:
        // Unknown step, restart flow
        sessionManager.clearSession(phoneNumber);
        return this.handleNewCustomer(phoneNumber);
    }
  }

  // Handle empty or invalid messages
  handleEmptyMessage(currentStep) {
    switch (currentStep) {
      case 'ask_name':
        return "Please provide your full name to continue:";
      case 'ask_email':
        return "Please provide your email address:";
      case 'ask_issue':
        return "Please describe the issue you're facing:";
      case 'ask_model':
        return "Please mention your purifier model:";
      case 'ask_address':
        return "Please provide your address:";
      case 'ask_date':
        return "Please provide your preferred date:";
      case 'ask_time':
        return "Please provide your preferred time:";
      default:
        return "I didn't understand that. Could you please try again?";
    }
  }

  // Handle name input during registration
  async handleNameInput(phoneNumber, name) {
    if (!name || name.trim().length < 2) {
      return "Please provide a valid full name (at least 2 characters):";
    }

    const session = sessionManager.getSession(phoneNumber);
    sessionManager.updateSession(phoneNumber, {
      step: 'ask_email',
      registrationData: { 
        ...session.registrationData,
        name: name.trim() 
      }
    });

    return `Thank you, ${name.trim()}! 😊\n\nNow please provide your email address:`;
  }

  // Handle email input during registration
  async handleEmailInput(phoneNumber, email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email.trim())) {
      return "Please provide a valid email address (e.g., john@example.com):";
    }

    const session = sessionManager.getSession(phoneNumber);
    const registrationData = {
      ...session.registrationData,
      email: email.trim().toLowerCase()
    };

    try {
      // Check if email already exists
      const existingCustomer = await Customer.findOne({ email: registrationData.email });
      if (existingCustomer) {
        return "This email is already registered. Please provide a different email address:";
      }

      // Create new customer
      const customer = new Customer({
        name: registrationData.name,
        email: registrationData.email,
        phone: phoneNumber,
        address: ''
      });

      await customer.save();
      console.log(`✅ New customer registered: ${customer.name} (${customer.email})`);

      // Update session to service flow
      sessionManager.setSession(phoneNumber, {
        step: 'ask_issue',
        customerId: customer._id,
        customerName: customer.name
      });

      return `✅ Registration successful! Welcome to Zoss Water, ${customer.name}! 🎉\n\nNow I can help you with your service request.\n\nPlease describe the issue you're facing with your Zoss Water purifier:`;
    } catch (error) {
      console.error('❌ Registration error:', error);
      return "Sorry, there was an error during registration. Please try again or contact our support team.";
    }
  }

  // Handle issue description input
  async handleIssueInput(phoneNumber, issue) {
    if (!issue || issue.trim().length < 3) {
      return "Please provide a detailed description of the issue (at least 3 characters):";
    }

    sessionManager.updateSession(phoneNumber, {
      step: 'ask_model',
      ticketData: { issue: issue.trim() }
    });

    return "Thank you for describing the issue. 📝\n\nNow, please mention the model of your Zoss Water purifier:";
  }

  // Handle model input
  async handleModelInput(phoneNumber, model) {
    if (!model || model.trim().length < 2) {
      return "Please provide the model of your Zoss Water purifier:";
    }

    const session = sessionManager.getSession(phoneNumber);
    sessionManager.updateSession(phoneNumber, {
      step: 'ask_address',
      ticketData: {
        ...session.ticketData,
        model: model.trim()
      }
    });

    return "Perfect! 👍\n\nWhat's your full address for the service visit?";
  }

  // Handle address input
  async handleAddressInput(phoneNumber, address) {
    if (!address || address.trim().length < 10) {
      return "Please provide a complete address with area details (at least 10 characters):";
    }

    const session = sessionManager.getSession(phoneNumber);
    sessionManager.updateSession(phoneNumber, {
      step: 'ask_date',
      ticketData: {
        ...session.ticketData,
        address: address.trim()
      }
    });

    return "Great! 📍\n\nWhat's your preferred date for the service visit?\n\nPlease provide in DD/MM/YYYY format (e.g., 25/12/2024):";
  }

  // Handle date input
  async handleDateInput(phoneNumber, date) {
    if (!date || date.trim().length < 8) {
      return "Please provide a valid date in DD/MM/YYYY format (e.g., 25/12/2024):";
    }

    const session = sessionManager.getSession(phoneNumber);
    sessionManager.updateSession(phoneNumber, {
      step: 'ask_time',
      ticketData: {
        ...session.ticketData,
        preferredDate: date.trim()
      }
    });

    return "Perfect! 📅\n\nWhat's your preferred time for the technician visit?\n\nPlease specify (e.g., 10:00 AM, 2:00 PM, Morning, Afternoon, Evening):";
  }

  // Handle time input and complete booking
  async handleTimeInput(phoneNumber, time) {
    if (!time || time.trim().length < 2) {
      return "Please provide a preferred time (e.g., 10:00 AM, 2:00 PM, Morning, Evening):";
    }

    const session = sessionManager.getSession(phoneNumber);
    const ticketData = {
      ...session.ticketData,
      preferredTime: time.trim()
    };

    try {
      // Create service ticket
      const ticket = new Ticket({
        customerId: session.customerId,
        issue: ticketData.issue,
        model: ticketData.model,
        address: ticketData.address,
        preferredDate: ticketData.preferredDate,
        preferredTime: ticketData.preferredTime,
        status: 'booked'
      });

      await ticket.save();
      console.log(`✅ Service ticket created: ${ticket._id}`);

      // Clear session as booking is complete
      sessionManager.clearSession(phoneNumber);

      const confirmationMessage = `✅ Your service request has been successfully booked! 🎉\n\nOur team will contact you shortly to confirm the appointment.\n\n📋 **Booking Details:**\n• Issue: ${ticketData.issue}\n• Model: ${ticketData.model}\n• Address: ${ticketData.address}\n• Date: ${ticketData.preferredDate}\n• Time: ${ticketData.preferredTime}\n• Ticket ID: ${ticket._id}\n\nThank you for choosing Zoss Water! 💧`;

      return confirmationMessage;
    } catch (error) {
      console.error('❌ Ticket creation error:', error);
      return "Sorry, there was an error creating your service request. Please try again or contact our support team directly.";
    }
  }
}

module.exports = new ChatFlowService();
