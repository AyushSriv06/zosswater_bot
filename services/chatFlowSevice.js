const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const sessionManager = require('../utils/sessionManager');

class ChatFlowService {
  
  // Handle new customer interaction
  async handleNewCustomer(phoneNumber) {
    const customer = await Customer.findOne({ phone: phoneNumber });
    
    if (customer) {
      // Existing customer - start service flow
      sessionManager.setSession(phoneNumber, {
        step: 'ask_issue',
        customerId: customer._id,
        customerName: customer.name
      });
      
      return `Hello ${customer.name}! 👋\n\nPlease describe the issue you're facing with your Zoss Water purifier.`;
    } else {
      // New customer - start registration
      sessionManager.setSession(phoneNumber, {
        step: 'ask_name',
        registrationData: {}
      });
      
      return `💧 Welcome to Zoss Water! How can we help you today?\n\nI see you're a new customer. Let me help you register first.\n\nPlease provide your full name:`;
    }
  }

  // Process user response based on current step
  async processUserResponse(phoneNumber, message) {
    const session = sessionManager.getSession(phoneNumber);
    
    if (!session) {
      return this.handleNewCustomer(phoneNumber);
    }

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
        return this.handleNewCustomer(phoneNumber);
    }
  }

  // Handle name input during registration
  async handleNameInput(phoneNumber, name) {
    if (!name || name.trim().length < 2) {
      return "Please provide a valid full name (at least 2 characters):";
    }

    sessionManager.updateSession(phoneNumber, {
      step: 'ask_email',
      registrationData: { name: name.trim() }
    });

    return "Thank you! Now please provide your email address:";
  }

  // Handle email input during registration
  async handleEmailInput(phoneNumber, email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email.trim())) {
      return "Please provide a valid email address:";
    }

    const session = sessionManager.getSession(phoneNumber);
    const registrationData = {
      ...session.registrationData,
      email: email.trim().toLowerCase()
    };

    try {
      // Create new customer
      const customer = new Customer({
        name: registrationData.name,
        email: registrationData.email,
        phone: phoneNumber,
        address: ''
      });

      await customer.save();

      // Update session to service flow
      sessionManager.setSession(phoneNumber, {
        step: 'ask_issue',
        customerId: customer._id,
        customerName: customer.name
      });

      return ` Registration successful! Welcome to Zoss Water, ${customer.name}!\n\nNow, please describe the issue you're facing with your Zoss Water purifier:`;
    } catch (error) {
      console.error('Registration error:', error);
      return "Sorry, there was an error during registration. Please try again later.";
    }
  }

  // Handle issue description input
  async handleIssueInput(phoneNumber, issue) {
    if (!issue || issue.trim().length < 5) {
      return "Please provide a detailed description of the issue (at least 5 characters):";
    }

    sessionManager.updateSession(phoneNumber, {
      step: 'ask_model',
      ticketData: { issue: issue.trim() }
    });

    return "Thank you for describing the issue. Now, please mention the model of your purifier:";
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

    return "Perfect! What's your full address for the service visit?";
  }

  // Handle address input
  async handleAddressInput(phoneNumber, address) {
    if (!address || address.trim().length < 10) {
      return "Please provide a complete address (at least 10 characters):";
    }

    const session = sessionManager.getSession(phoneNumber);
    sessionManager.updateSession(phoneNumber, {
      step: 'ask_date',
      ticketData: {
        ...session.ticketData,
        address: address.trim()
      }
    });

    return "Great! What's your preferred date for the service? (Please mention in DD/MM/YYYY format):";
  }

  // Handle date input
  async handleDateInput(phoneNumber, date) {
    if (!date || date.trim().length < 8) {
      return "Please provide a valid date in DD/MM/YYYY format (e.g., 25/12/2023):";
    }

    const session = sessionManager.getSession(phoneNumber);
    sessionManager.updateSession(phoneNumber, {
      step: 'ask_time',
      ticketData: {
        ...session.ticketData,
        preferredDate: date.trim()
      }
    });

    return "Perfect! What's your preferred time for the technician visit? (e.g., 10:00 AM, 2:00 PM, etc.):";
  }

  // Handle time input and complete booking
  async handleTimeInput(phoneNumber, time) {
    if (!time || time.trim().length < 4) {
      return "Please provide a valid time (e.g., 10:00 AM, 2:00 PM):";
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

      // Clear session as booking is complete
      sessionManager.clearSession(phoneNumber);

      return ` Your service request has been successfully booked! Our team will contact you shortly. Thank you for choosing Zoss Water.\n\n📋 Booking Details:\n• Issue: ${ticketData.issue}\n• Model: ${ticketData.model}\n• Date: ${ticketData.preferredDate}\n• Time: ${ticketData.preferredTime}\n\nTicket ID: ${ticket._id}`;
    } catch (error) {
      console.error('Ticket creation error:', error);
      return "Sorry, there was an error creating your service request. Please try again later.";
    }
  }
}

module.exports = new ChatFlowService();