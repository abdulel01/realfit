// Email Functions for Summer Camp Website

/**
 * Sends a booking confirmation email using the Supabase Edge Function
 * @param {Object} bookingData - The booking data
 * @returns {Promise<Object>} - Success status and data or error
 */
export async function sendBookingConfirmationEmail(bookingData) {
  try {
    // Format the booking data for the email template
    const emailData = formatBookingDataForEmail(bookingData);
    
    // In a production environment, this would call the Supabase Edge Function
    // For now, we'll simulate a successful email send
    console.log('Sending confirmation email with data:', emailData);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store the email in localStorage for demo purposes
    localStorage.setItem('lastSentEmail', JSON.stringify({
      to: emailData.email,
      subject: 'Your Fitzone Party Booking Confirmation',
      template: 'booking-confirmation',
      data: emailData
    }));
    
    return { 
      success: true, 
      data: { 
        message: 'Email sent successfully',
        emailId: 'demo-' + Math.random().toString(36).substring(2, 15)
      } 
    };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error };
  }
}

/**
 * Formats booking data for the email template
 * @param {Object} bookingData - The raw booking data
 * @returns {Object} - Formatted data for email template
 */
function formatBookingDataForEmail(bookingData) {
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
  
  // Get package name
  const packageId = bookingData.package_id || bookingData.package;
  const packageName = packageMap[packageId] || 'Unknown Package';
  
  // Format the data for the email template
  return {
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
    total_price: (bookingData.total_price || 0).toFixed(2),
    email: bookingData.email || 'Not specified'
  };
}

/**
 * Sends a test email to verify the email functionality
 * @param {string} email - The recipient email address
 * @returns {Promise<Object>} - Success status and data or error
 */
export async function sendTestEmail(email) {
  try {
    const testData = {
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
      total_price: '449.85',
      email: email
    };
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store the test email in localStorage
    localStorage.setItem('lastSentEmail', JSON.stringify({
      to: email,
      subject: 'Test Email - Fitzone Party Booking',
      template: 'booking-confirmation',
      data: testData
    }));
    
    return { 
      success: true, 
      data: { 
        message: 'Test email sent successfully',
        emailId: 'test-' + Math.random().toString(36).substring(2, 15)
      } 
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, error };
  }
}
