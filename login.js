// Unified Login functionality for Fitzone website
// Handles both customer and admin logins

console.log('🔄 Loading login.js...');

// Try to import Supabase with error handling
let supabase;
try {
    const module = await import('./supabase.js');
    supabase = module.supabase;
    console.log('✅ Supabase module imported successfully');
} catch (error) {
    console.error('❌ Failed to import Supabase:', error);
    // Show user-friendly error
    if (typeof showFlashMessage === 'function') {
        showFlashMessage('System error: Unable to load authentication system', 'error');
    }
}

// Admin email (the one user created in Supabase)
const ADMIN_EMAIL = 'ace@icloud.com';

// Global function for button onclick
window.handleLogin = async function() {
    console.log('🔐 handleLogin() called');
    
    if (!supabase) {
        console.error('❌ Supabase not available');
        alert('Authentication system not loaded. Please refresh the page.');
        return;
    }
    
    await performLogin();
};

// Main login function
async function performLogin() {
    console.log('🔐 performLogin() started');
    
    // Check if Supabase is available
    if (!supabase) {
        console.error('❌ Supabase not available in performLogin');
        showFlashMessage('Authentication system not loaded. Please refresh the page.', 'error');
        return;
    }
    
    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('📧 Email input:', email);
    console.log('🔑 Password length:', password ? password.length : 0);
    
    // Basic validation
    if (!email || !password) {
        showFlashMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Disable form submission while processing
    const submitButton = document.querySelector('#loginForm button');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Signing In...';
    
    try {
        console.log('🔐 Attempting login for:', email);
        
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            console.log('✅ Login successful for:', data.user.email);
            
            // Check if this is the admin user
            if (data.user.email === ADMIN_EMAIL) {
                // Admin login
                console.log('🎯 Admin detected - redirecting to admin panel');
                showFlashMessage('Welcome Admin! Redirecting to admin panel...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
                
            } else {
                // Regular customer login
                console.log('👤 Customer login - redirecting to main site');
                showFlashMessage('Welcome back! Redirecting...', 'success');
                
                // For now, redirect to home page
                // In future, you can redirect to a customer dashboard
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } else {
            throw new Error('Login failed. Please try again.');
        }

    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Handle specific error messages
        let errorMessage = 'Login failed. Please check your credentials.';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account first.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showFlashMessage(errorMessage, 'error');
        
        // Re-enable form submission
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Login.js loaded');
    
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // Backup event listener for form submission
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔐 Form submit event triggered');
            await performLogin();
        });
        
        console.log('✅ Event listeners attached');
    } else {
        console.error('❌ Login form not found');
    }

    // Check if user is already logged in
    checkExistingSession();
});

// Function to check if user is already logged in
async function checkExistingSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
            console.log('🔍 Existing session found for:', session.user.email);
            
            // Check if admin or regular user
            if (session.user.email === ADMIN_EMAIL) {
                console.log('🎯 Admin session - redirecting to admin panel');
                window.location.href = 'admin.html';
            } else {
                console.log('👤 Customer session - redirecting to main site');
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
        // Continue to login form if session check fails
    }
}

// Function to show flash messages
function showFlashMessage(message, type = 'info') {
    const flashContainer = document.getElementById('flash-messages');
    
    if (!flashContainer) {
        console.error('Flash message container not found');
        // Fallback to alert if no flash container
        alert(message);
        return;
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `flash-message ${type}`;
    messageElement.innerHTML = `
        <div class="flash-content">
            <span>${message}</span>
            <button class="flash-close" aria-label="Close">&times;</button>
        </div>
    `;
    
    // Add to container
    flashContainer.appendChild(messageElement);
    
    // Add close button functionality
    const closeButton = messageElement.querySelector('.flash-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            messageElement.remove();
        });
    }
    
    // Auto-remove after 5 seconds (longer for success messages)
    const autoRemoveTime = type === 'success' ? 2000 : 5000;
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, autoRemoveTime);
}

// Export functions for potential external use
export { showFlashMessage, checkExistingSession }; 