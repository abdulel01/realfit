// Simple Stripe Checkout integration for Render deployment
class CheckoutPayment {
    constructor() {
        this.backendUrl = window.location.origin; // Use same domain as frontend
    }

    async initiatePayment(bookingData) {
        try {
            console.log('Initiating checkout payment...');
            
            // Show loading state
            const paymentBtn = document.querySelector('.submit-btn, .payment-btn');
            if (paymentBtn) {
                paymentBtn.textContent = 'Creating checkout...';
                paymentBtn.disabled = true;
            }

            // Calculate total amount
            const amount = bookingData.total_cost || 29.99; // Default fallback
            
            const response = await fetch(`${this.backendUrl}/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: 'eur',
                    customerEmail: bookingData.email,
                    successUrl: `${window.location.origin}/confirmation.html?session_id={CHECKOUT_SESSION_ID}&booking_data=${encodeURIComponent(JSON.stringify(bookingData))}`,
                    cancelUrl: `${window.location.origin}/booking.html`
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }

            const { url } = await response.json();
            
            // Redirect to Stripe Checkout
            window.location.href = url;
            
        } catch (error) {
            console.error('Payment error:', error);
            
            // Show error message
            const errorDiv = document.getElementById('payment-errors') || this.createErrorDiv();
            errorDiv.textContent = '❌ Payment system unavailable. Please try again later.';
            errorDiv.style.display = 'block';
            
            // Reset button
            const paymentBtn = document.querySelector('.submit-btn, .payment-btn');
            if (paymentBtn) {
                paymentBtn.textContent = 'Pay Now';
                paymentBtn.disabled = false;
            }
        }
    }

    createErrorDiv() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'payment-errors';
        errorDiv.style.cssText = 'color: red; margin: 10px 0; padding: 10px; background: #ffe6e6; border: 1px solid #ffcccc; border-radius: 4px;';
        
        const form = document.querySelector('.booking-form, form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
        }
        
        return errorDiv;
    }
}

// Export for use in other files
window.CheckoutPayment = CheckoutPayment;

// Auto-initialize if this script is loaded
if (typeof window !== 'undefined') {
    window.checkoutPayment = new CheckoutPayment();
} 