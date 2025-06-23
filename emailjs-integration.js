// EmailJS Integration for Booking Confirmation Emails with Enhanced Error Logging

// EmailJS configuration
const EMAILJS_USER_ID = "3dZA6XfheQpI1Ee0d"; // User's EmailJS Public Key
const EMAILJS_SERVICE_ID = "service_f4px6jg"; // User's updated EmailJS Service ID
const EMAILJS_TEMPLATE_ID = "template_e0h37yc"; // User's new EmailJS Template ID

/**
 * Sends a booking confirmation email using EmailJS
 * @param {Object} bookingData - The booking data
 * @returns {Promise<Object>} - Success status and data or error
 */
export async function sendBookingConfirmationEmail(bookingData) {
  try {
    console.log('Starting email confirmation process with EmailJS');
    console.log('Using credentials - Service ID:', EMAILJS_SERVICE_ID, 'Template ID:', EMAILJS_TEMPLATE_ID);
    
    // Format the booking data for the email template
    const emailData = formatBookingDataForEmail(bookingData);
    console.log('Formatted email data:', emailData);
    
    // Load EmailJS SDK if not already loaded
    if (!window.emailjs) {
      console.log('EmailJS SDK not loaded, loading now...');
      try {
        await loadEmailJsScript();
        console.log('EmailJS SDK loaded successfully');
      } catch (loadError) {
        console.error('Failed to load EmailJS SDK:', loadError);
        return { success: false, error: loadError, stage: 'sdk_loading' };
      }
    } else {
      console.log('EmailJS SDK already loaded');
    }
    
    // Initialize EmailJS
    try {
      console.log('Initializing EmailJS with User ID:', EMAILJS_USER_ID);
      window.emailjs.init(EMAILJS_USER_ID);
      console.log('EmailJS initialized successfully');
    } catch (initError) {
      console.error('Failed to initialize EmailJS:', initError);
      return { success: false, error: initError, stage: 'initialization' };
    }
    
    // Send the email
    try {
      console.log('Sending email via EmailJS...');
      const response = await window.emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        emailData
      );
      
      console.log('Email sent successfully:', response);
      
      return { 
        success: true, 
        data: { 
          message: 'Email sent successfully',
          response
        } 
      };
    } catch (sendError) {
      console.error('Error sending email via EmailJS:', sendError);
      return { success: false, error: sendError, stage: 'sending' };
    }
  } catch (error) {
    console.error('Unexpected error in sendBookingConfirmationEmail:', error);
    return { success: false, error, stage: 'unknown' };
  }
}

/**
 * Formats booking data for the email template
 * @param {Object} bookingData - The raw booking data
 * @returns {Object} - Formatted data for email template
 */
function formatBookingDataForEmail(bookingData) {
  console.log('Formatting booking data for email template:', bookingData);
  
  // Map location ID to name and phone
  const locationMap = {
    'leopardstown': { name: 'Fitzone Leopardstown', phone: '01 2191827' },
    'clontarf': { name: 'Fitzone Clontarf', phone: '01 8530353' },
    'westmanstown': { name: 'Fitzone Westmanstown', phone: '01 8025906' },
    '1': { name: 'Fitzone Leopardstown', phone: '01 2191827' },
    '2': { name: 'Fitzone Clontarf', phone: '01 8530353' },
    '3': { name: 'Fitzone Westmanstown', phone: '01 8025906' }
  };
  
  // Map package ID to name
  const packageMap = {
    'adventure': 'Adventure Zone Party',
    'gokart': 'Go-Kart Party',
    'playdance': 'Play & Dance Party',
    'vip': 'VIP Ultimate Party',
    'climbing': 'Adventure Zone & Climbing Wall Party',
    '1': 'Adventure Zone Party',
    '2': 'Go-Kart Party',
    '3': 'Play & Dance Party',
    '4': 'VIP Ultimate Party',
    '5': 'Adventure Zone & Climbing Wall Party'
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Get location info
  const locationId = bookingData.location_id || bookingData.location;
  const locationInfo = locationMap[locationId] || { name: 'Unknown Location', phone: 'Not available' };
  console.log('Location info:', locationInfo);
  
  // Get package name
  const packageId = bookingData.package_id || bookingData.package;
  const packageName = packageMap[packageId] || 'Unknown Package';
  console.log('Package name:', packageName);
  
  // Format the data for the email template - USING EXACT VARIABLE NAMES FROM TEMPLATE
  const formattedData = {
    to_email: bookingData.email,
    // These variable names match exactly with the template
    parent_name: bookingData.parent_name || bookingData.parentName || 'Valued Customer',
    child_name: bookingData.child_name || bookingData.childName || 'Your Child',
    child_age: bookingData.child_age || bookingData.childAge || 'Not specified',
    location: locationInfo.name,
    location_phone: locationInfo.phone,
    package: packageName,
    date: formatDate(bookingData.booking_date || bookingData.date),
    time: bookingData.booking_time || bookingData.time || 'Not specified',
    num_guests: bookingData.num_children || bookingData.numGuests || 'Not specified',
    special_requests: bookingData.special_requests || bookingData.specialRequests || 'None',
    total_price: (bookingData.total_price || 0).toFixed(2)
  };
  
  console.log('Formatted data for email template:', formattedData);
  return formattedData;
}

/**
 * Loads the EmailJS SDK script
 * @returns {Promise} - Resolves when script is loaded
 */
function loadEmailJsScript() {
  return new Promise((resolve, reject) => {
    console.log('Loading EmailJS SDK script...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => {
      console.log('EmailJS SDK script loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('Error loading EmailJS SDK script:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

/**
 * Sends a test email to verify the email functionality
 * @param {string} email - The recipient email address
 * @returns {Promise<Object>} - Success status and data or error
 */
export async function sendTestEmail(email) {
  try {
    console.log('Sending test email to:', email);
    
    // Load EmailJS SDK if not already loaded
    if (!window.emailjs) {
      console.log('Loading EmailJS SDK for test email...');
      await loadEmailJsScript();
    }
    
    // Initialize EmailJS
    console.log('Initializing EmailJS for test email...');
    window.emailjs.init(EMAILJS_USER_ID);
    
    // Using exact variable names from template
    const testData = {
      to_email: email,
      parent_name: 'Test User',
      child_name: 'Test Child',
      child_age: '8',
      location: 'Fitzone Leopardstown',
      location_phone: '01 2191827',
      package: 'Adventure Zone Party',
      date: 'Saturday, June 15, 2025',
      time: '14:00',
      num_guests: '15',
      special_requests: 'Allergy to nuts',
      total_price: '449.85'
    };
    
    console.log('Sending test email with data:', testData);
    
    const response = await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      testData
    );
    
    console.log('Test email sent successfully:', response);
    
    return { 
      success: true, 
      data: { 
        message: 'Test email sent successfully',
        response
      } 
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, error };
  }
}

// Add a global function to test email from browser console
window.testFitzoneEmail = function(email) {
  if (!email) {
    console.error('Please provide an email address');
    return;
  }
  
  console.log('Testing email functionality with address:', email);
  sendTestEmail(email)
    .then(result => {
      console.log('Test email result:', result);
      if (result.success) {
        alert('Test email sent successfully! Please check your inbox (and spam folder).');
      } else {
        alert('Failed to send test email. See console for details.');
      }
    })
    .catch(error => {
      console.error('Error in test email function:', error);
      alert('Error sending test email: ' + error.message);
    });
};
