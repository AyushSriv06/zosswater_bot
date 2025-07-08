const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const connectDB = require('./config/database');
const whatsappService = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Zoss Water WhatsApp Chatbot is running!',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// WhatsApp webhook endpoint - THIS IS WHERE THE MAGIC HAPPENS
app.post('/webhook', whatsappService.handleIncomingMessage);

// Webhook verification (required by some WhatsApp providers)
app.get('/webhook', (req, res) => {
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'zoss-water-token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === verifyToken) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API endpoint to manually send welcome message
app.post('/api/send-welcome', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await whatsappService.sendWelcomeMessage(phoneNumber);
    res.json({ success: true, messageSid: result.sid });
  } catch (error) {
    console.error('❌ Error sending welcome message:', error);
    res.status(500).json({ error: 'Failed to send welcome message' });
  }
});

// API endpoint to send bulk welcome messages
app.post('/api/send-bulk-welcome', async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    
    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    const results = await whatsappService.sendBulkWelcomeMessages(phoneNumbers);
    res.json({ success: true, results });
  } catch (error) {
    console.error(' Error sending bulk welcome messages:', error);
    res.status(500).json({ error: 'Failed to send bulk welcome messages' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(' Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Zoss Water Chatbot server running on port ${PORT}`);
  console.log(`📱 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// ======================
// Additional: Test Script (test-customer-flow.js)
// ======================

const axios = require('axios');

// Test the customer-initiated workflow
async function testCustomerFlow() {
  const webhookUrl = 'http://localhost:3000/webhook';
  
  const testMessage = {
    From: 'whatsapp:+1234567890',
    Body: 'Hello',
    ProfileName: 'John Doe'
  };

  try {
    const response = await axios.post(webhookUrl, testMessage);
    console.log('✅ Test message sent successfully');
    console.log('Response:', response.status);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}
