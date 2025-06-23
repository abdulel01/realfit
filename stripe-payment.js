// Stripe payment integration for Fitzone booking system
// This module handles all Stripe Connect payment processing

// Stripe configuration - Replace with your actual publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Rbk6VHDcFBKu82ryRsguDeQLzeG3W70kCmqESXk5q1dZ8wP8qNwTx2YM3p9DEA1USFHrSNCrB9eNIxEHR0HguA600VvwOLemK';
const BACKEND_URL = 'http://localhost:3001'; // Your backend server URL
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

let elements;
let paymentElement;
let currentClientSecret;

// Initialize Stripe Elements
export async function initializeStripePayment(amount, currency = 'eur') {
    try {
        console.log('Initializing Stripe payment for amount:', amount);
        
        // Create payment intent on your backend
        const response = await fetch(`${BACKEND_URL}/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Convert euros to cents
                currency: currency,
                metadata: {
                    source: 'fitzone_booking_frontend',
                    booking_date: new Date().toISOString()
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { client_secret, payment_intent_id } = await response.json();
        currentClientSecret = client_secret;

        console.log('Payment intent created with ID:', payment_intent_id);

        // Create Stripe Elements with improved styling
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#007bff',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                spacingUnit: '4px',
                borderRadius: '6px',
                focusBoxShadow: '0px 1px 3px rgba(50, 50, 93, 0.15)',
            },
            rules: {
                '.Tab': {
                    border: '1px solid #e6ebf1',
                    borderRadius: '6px',
                    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02)',
                },
                '.Tab:hover': {
                    color: '#007bff',
                },
                '.Tab--selected': {
                    borderColor: '#007bff',
                    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02), 0 0 0 2px #007bff',
                },
                '.Input': {
                    borderRadius: '6px',
                    border: '1px solid #e6ebf1',
                    fontSize: '16px',
                    padding: '12px',
                },
                '.Input:focus': {
                    borderColor: '#007bff',
                    boxShadow: '0 0 0 2px rgba(0, 123, 255, 0.25)',
                },
            },
        };

        elements = stripe.elements({ 
            appearance, 
            clientSecret: client_secret 
        });
        
        // Create and mount the payment element
        paymentElement = elements.create('payment', {
            layout: 'tabs',
            defaultValues: {
                billingDetails: {
                    email: '', // Will be populated from form
                    name: '', // Will be populated from form  
                }
            }
        });
        
        paymentElement.mount('#payment-element');

        // Handle real-time validation errors from the payment element
        paymentElement.on('change', ({error}) => {
            const errorDiv = document.getElementById('payment-errors');
            if (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } else {
                errorDiv.textContent = '';
                errorDiv.style.display = 'none';
            }
        });

        return { success: true, clientSecret: client_secret, paymentIntentId: payment_intent_id };
        
    } catch (error) {
        console.error('Error initializing Stripe payment:', error);
        
        // Show fallback message if backend is not available
        const errorDiv = document.getElementById('payment-errors');
        if (error.message.includes('fetch')) {
            errorDiv.textContent = 'Payment system temporarily unavailable. Please try again later or contact support.';
        } else {
            errorDiv.textContent = error.message;
        }
        errorDiv.style.display = 'block';
        
        return { success: false, error: error.message };
    }
}

// Process the payment
export async function processPayment(bookingData) {
    try {
        console.log('Processing payment for booking:', bookingData);
        
        if (!elements || !currentClientSecret) {
            throw new Error('Stripe Elements not initialized');
        }

        // Show loading state
        const submitButton = document.querySelector('.submit-btn');
        if (submitButton) {
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Processing Payment...';
            submitButton.disabled = true;
        }

        // Submit the payment form to collect payment method
        const { error: submitError } = await elements.submit();
        if (submitError) {
            throw new Error(submitError.message);
        }

        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret: currentClientSecret,
            confirmParams: {
                return_url: `${window.location.origin}/confirmation.html`,
                payment_method_data: {
                    billing_details: {
                        name: bookingData.parent_name,
                        email: bookingData.email,
                        phone: bookingData.phone,
                    }
                }
            },
            redirect: 'if_required'
        });

        if (error) {
            throw new Error(error.message);
        }

        // Payment successful
        console.log('Payment successful:', paymentIntent);
        
        // Update booking data with payment information
        const updatedBookingData = {
            ...bookingData,
            payment_status: 'paid',
            payment_intent_id: paymentIntent.id,
            payment_method: paymentIntent.payment_method,
            amount_paid: paymentIntent.amount / 100, // Convert back from cents
            payment_date: new Date().toISOString()
        };

        return { 
            success: true, 
            paymentIntent, 
            bookingData: updatedBookingData 
        };

    } catch (error) {
        console.error('Payment processing error:', error);
        
        // Show error to user
        const errorDiv = document.getElementById('payment-errors');
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        
        // Reset button state
        const submitButton = document.querySelector('.submit-btn');
        if (submitButton) {
            submitButton.textContent = 'Complete Payment';
            submitButton.disabled = false;
        }

        return { success: false, error: error.message };
    }
}

// Update payment summary display
export function updatePaymentSummary(packageData, numGuests) {
    const packageNameEl = document.getElementById('payment-package-name');
    const numGuestsEl = document.getElementById('payment-num-guests');
    const pricePerPersonEl = document.getElementById('payment-price-per-person');
    const totalEl = document.getElementById('payment-total');

    if (packageNameEl) packageNameEl.textContent = packageData.name;
    if (numGuestsEl) numGuestsEl.textContent = numGuests;
    if (pricePerPersonEl) pricePerPersonEl.textContent = `€${parseFloat(packageData.price).toFixed(2)}`;
    
    const totalAmount = parseFloat(packageData.price) * numGuests;
    if (totalEl) totalEl.textContent = `€${totalAmount.toFixed(2)}`;
    
    return totalAmount;
}

// Validate payment step
export function validatePaymentStep() {
    const errorDiv = document.getElementById('payment-errors');
    
    if (!elements || !paymentElement) {
        errorDiv.textContent = 'Payment system not initialized. Please refresh the page and try again.';
        errorDiv.style.display = 'block';
        return false;
    }

    if (!currentClientSecret) {
        errorDiv.textContent = 'Payment not ready. Please wait a moment and try again.';
        errorDiv.style.display = 'block';
        return false;
    }

    // Clear any existing errors
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    return true;
}

// Create a simplified backend endpoint simulation for demo purposes
// In production, replace this with actual backend calls
async function createPaymentIntentDemo(amount, currency) {
    // This is a demo function - replace with actual backend call
    console.warn('Using demo payment intent creation. Replace with actual backend in production.');
    
    // For demo purposes, return a mock client secret
    // In production, this should call your actual backend
    return {
        client_secret: 'pi_demo_client_secret_' + Math.random().toString(36).substr(2, 9)
    };
}

// Export functions for use in main script
export {
    stripe,
    elements,
    paymentElement
}; 