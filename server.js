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

// Routes
app.get('/', (req, res) => {
  res.send('Zoss Water WhatsApp Chatbot is running!');
});

// WhatsApp webhook endpoint
app.post('/webhook', whatsappService.handleIncomingMessage);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Zoss Water Chatbot server running on port ${PORT}`);
});