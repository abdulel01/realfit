// Registration functionality for Fitzone website

import { signUp } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            
            // Basic validation
            if (!name || !email || !password || !confirmPassword) {
                showFlashMessage('Please fill in all fields', 'error');
                return;
            }
            
            // Check if passwords match
            if (password !== confirmPassword) {
                showFlashMessage('Passwords do not match', 'error');
                return;
            }
            
            // Disable form submission while processing
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Creating Account...';
            
            try {
                // Split name into first and last name
                const nameParts = name.split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
                
                // Create user data object
                const userData = {
                    firstName,
                    lastName,
                    phone: '' // Phone will be collected later if needed
                };
                
                // Call Supabase signup function
                const result = await signUp(email, password, userData);
                
                if (result.success) {
                    // Show success message
                    showFlashMessage('Account created successfully! Redirecting to login...', 'success');
                    
                    // Redirect to login page after a short delay
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    // Show error message
                    showFlashMessage(result.error.message || 'Error creating account. Please try again.', 'error');
                    
                    // Re-enable form submission
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            } catch (error) {
                console.error('Registration error:', error);
                showFlashMessage('An unexpected error occurred. Please try again later.', 'error');
                
                // Re-enable form submission
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
});

// Function to show flash messages
function showFlashMessage(message, type = 'info') {
    const flashContainer = document.getElementById('flash-messages');
    
    if (!flashContainer) {
        console.error('Flash message container not found');
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
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
}
