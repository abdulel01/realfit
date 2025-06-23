const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from root directory
app.use(express.static(path.join(__dirname), {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1d',
    redirect: false
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Create checkout session
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
        console.error('Stripe error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Root route - serve index.html
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Error loading homepage');
        }
    });
});

// Catch-all route for HTML files
app.get('/*.html', (req, res) => {
    const fileName = req.params[0] + '.html';
    const filePath = path.join(__dirname, fileName);
    console.log('Serving HTML file:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving file:', filePath, err);
            res.status(404).send('File not found');
        }
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - File not found:', req.url);
    res.status(404).send('File not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fitzone server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📁 Serving static files from: ${__dirname}`);
    console.log(`🏠 Homepage: http://localhost:${PORT}/`);
}); 