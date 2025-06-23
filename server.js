const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration for Netlify frontend
const corsOptions = {
    origin: true, // Allow all origins temporarily for debugging
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'Fitzone Backend API'
    });
});

// Create payment intent endpoint (for Payment Elements)
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'eur', customerEmail } = req.body;
        
        console.log('Creating payment intent for amount:', amount, currency);
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            receipt_email: customerEmail,
        });

        console.log('Payment intent created:', paymentIntent.id);
        res.status(200).json({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id 
        });
    } catch (err) {
        console.error('Stripe payment intent error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create checkout session endpoint (for Stripe Checkout)
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { amount, currency = 'eur', customerEmail, successUrl, cancelUrl } = req.body;
        
        console.log('Creating checkout session for amount:', amount, currency);
        
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: 'Fitzone Booking',
                    },
                    unit_amount: Math.round(amount * 100), // Convert to cents
                },
                quantity: 1,
            }],
            customer_email: customerEmail,
            success_url: successUrl || `${req.headers.origin}/confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.origin}/booking.html`,
        });

        console.log('Checkout session created:', session.id);
        res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 404 handler for API routes
app.use((req, res) => {
    console.log('404 - API endpoint not found:', req.url);
    res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fitzone Backend API running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`💳 Payment Intent endpoint: http://localhost:${PORT}/create-payment-intent`);
    console.log(`💰 Checkout Session endpoint: http://localhost:${PORT}/create-checkout-session`);
    console.log(`🌍 CORS enabled for Netlify frontend`);
}); 