// Simple Node.js Express server for Stripe payment processing
// This handles payment intent creation for the Fitzone booking system

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'your-stripe-secret-key-here');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Stripe payment server is running' });
});

// Create payment intent endpoint
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'eur', metadata = {} } = req.body;
        
        console.log('Creating payment intent for amount:', amount, currency);
        
        // Validate amount
        if (!amount || amount < 50) { // Minimum 50 cents
            return res.status(400).json({ 
                error: 'Invalid amount. Minimum payment is €0.50' 
            });
        }
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // Amount in cents
            currency: currency,
            metadata: {
                source: 'fitzone_booking',
                ...metadata
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        console.log('Payment intent created:', paymentIntent.id);
        
        res.json({
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent',
            message: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`💳 Stripe payment server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`💰 Payment endpoint: http://localhost:${PORT}/create-payment-intent`);
});

module.exports = app; 