// Supabase Edge Function for Booking Creation and Validation

import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const fromEmail = process.env.FROM_EMAIL;

/**
 * Main handler for booking creation
 */
export const createBooking = async (req, res) => {
  try {
    const {
      user_id,
      location_id,
      package_id,
      booking_date,
      booking_time,
      num_children,
      num_adults,
      child_name,
      child_age,
      special_requests,
      parent_name,
      email,
      phone
    } = req.body;

    // Validate required fields
    if (!location_id || !package_id || !booking_date || !booking_time || 
        !num_children || !parent_name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check availability
    const isAvailable = await checkSlotAvailability(
      location_id, 
      package_id, 
      booking_date, 
      booking_time,
      num_children
    );

    if (!isAvailable.available) {
      return res.status(409).json({ 
        error: 'Selected time slot is not available', 
        message: isAvailable.message 
      });
    }

    // Calculate total price
    const { data: packageData } = await supabase
      .from('packages')
      .select('price, min_children, max_children')
      .eq('id', package_id)
      .single();

    // Validate children count against package limits
    if (num_children < packageData.min_children || 
        (packageData.max_children && num_children > packageData.max_children)) {
      return res.status(400).json({ 
        error: 'Invalid number of children', 
        message: `This package requires between ${packageData.min_children} and ${packageData.max_children} children` 
      });
    }

    const total_price = packageData.price * num_children;

    // Create booking record
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        user_id,
        location_id,
        package_id,
        booking_date,
        booking_time,
        num_children,
        num_adults,
        child_name,
        child_age,
        special_requests,
        parent_name,
        email,
        phone,
        total_price,
        status: 'confirmed',
        payment_status: 'unpaid'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    // Send confirmation email
    await sendBookingConfirmationEmail(booking.id);

    return res.status(200).json({ 
      success: true, 
      booking,
      message: 'Booking created successfully and confirmation email sent' 
    });
  } catch (error) {
    console.error('Error in createBooking:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if a specific time slot is available
 */
async function checkSlotAvailability(location_id, package_id, date, time, num_children) {
  try {
    // Convert date to day of week (0 = Sunday, 1 = Monday, etc.)
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay();

    // Check if the time slot exists for this location and day
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('location_id', location_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    // Find the matching time slot
    const matchingSlot = timeSlots.find(slot => 
      slot.start_time === time || 
      (slot.start_time <= time && slot.end_time > time)
    );

    if (!matchingSlot) {
      return { 
        available: false, 
        message: 'No available time slot for the selected date and time' 
      };
    }

    // Check if the package is available at this location
    const { data: locationPackages } = await supabase
      .from('location_packages')
      .select('*')
      .eq('location_id', location_id)
      .eq('package_id', package_id)
      .eq('is_available', true);

    if (!locationPackages || locationPackages.length === 0) {
      return { 
        available: false, 
        message: 'Selected package is not available at this location' 
      };
    }

    // Check existing bookings for capacity
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('num_children')
      .eq('location_id', location_id)
      .eq('booking_date', date)
      .eq('booking_time', time)
      .neq('status', 'cancelled');

    // Calculate total children already booked
    const totalChildrenBooked = existingBookings.reduce(
      (sum, booking) => sum + booking.num_children, 
      0
    );

    // Get location capacity
    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .eq('id', location_id)
      .single();

    // Assume max capacity of 30 if not specified
    const maxCapacity = 30;

    // Check if adding these children would exceed capacity
    if (totalChildrenBooked + num_children > maxCapacity) {
      return { 
        available: false, 
        message: 'Not enough capacity for the requested number of children' 
      };
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking availability:', error);
    throw error;
  }
}

/**
 * Send booking confirmation email
 */
async function sendBookingConfirmationEmail(bookingId) {
  try {
    // Get booking details with related information
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        locations:location_id (name, phone, email),
        packages:package_id (name, description, duration)
      `)
      .eq('id', bookingId)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Get email template
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('name', 'booking-confirmation')
      .single();

    if (!template) {
      throw new Error('Email template not found');
    }

    // Format date and time for display
    const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Convert 24h time to 12h format
    const timeArr = booking.booking_time.split(':');
    const hours = parseInt(timeArr[0]);
    const minutes = timeArr[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes} ${ampm}`;

    // Replace template variables
    let emailHtml = template.html_content
      .replace(/{{parent_name}}/g, booking.parent_name)
      .replace(/{{child_name}}/g, booking.child_name || 'your child')
      .replace(/{{child_age}}/g, booking.child_age || 'N/A')
      .replace(/{{location}}/g, booking.locations.name)
      .replace(/{{package}}/g, booking.packages.name)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{time}}/g, formattedTime)
      .replace(/{{num_guests}}/g, `${booking.num_children} children, ${booking.num_adults} adults`)
      .replace(/{{total_price}}/g, booking.total_price.toFixed(2))
      .replace(/{{special_requests}}/g, booking.special_requests || 'None')
      .replace(/{{location_phone}}/g, booking.locations.phone);

    // Prepare email
    const msg = {
      to: booking.email,
      from: fromEmail,
      subject: template.subject,
      html: emailHtml,
    };

    // Send email
    await sgMail.send(msg);
    
    // Update booking to mark email as sent
    await supabase
      .from('bookings')
      .update({ email_sent: true })
      .eq('id', bookingId);

    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

/**
 * Get available dates for a location and package
 */
export const getAvailableDates = async (req, res) => {
  try {
    const { location_id, package_id, start_date, end_date } = req.query;
    
    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Convert string dates to Date objects
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    // Validate date range
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    // Check if package is available at this location
    if (package_id) {
      const { data: locationPackage } = await supabase
        .from('location_packages')
        .select('*')
        .eq('location_id', location_id)
        .eq('package_id', package_id)
        .eq('is_available', true);

      if (!locationPackage || locationPackage.length === 0) {
        return res.status(404).json({ 
          error: 'Package not available at this location' 
        });
      }
    }

    // Get time slots for this location
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('location_id', location_id)
      .eq('is_available', true);

    if (!timeSlots || timeSlots.length === 0) {
      return res.status(404).json({ 
        error: 'No available time slots for this location' 
      });
    }

    // Create a map of day of week to available time slots
    const availableDayMap = {};
    timeSlots.forEach(slot => {
      if (!availableDayMap[slot.day_of_week]) {
        availableDayMap[slot.day_of_week] = [];
      }
      availableDayMap[slot.day_of_week].push(slot);
    });

    // Generate array of dates between start and end
    const availableDates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if this day of week has time slots
      if (availableDayMap[dayOfWeek] && availableDayMap[dayOfWeek].length > 0) {
        availableDates.push(new Date(currentDate));
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Format dates as ISO strings
    const formattedDates = availableDates.map(date => date.toISOString().split('T')[0]);
    
    return res.status(200).json({ 
      availableDates: formattedDates 
    });
  } catch (error) {
    console.error('Error getting available dates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get available time slots for a specific date
 */
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { location_id, package_id, date } = req.query;
    
    if (!location_id || !date) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Convert date to day of week
    const bookingDate = new Date(date);
    if (isNaN(bookingDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const dayOfWeek = bookingDate.getDay();

    // Get time slots for this location and day of week
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('location_id', location_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (!timeSlots || timeSlots.length === 0) {
      return res.status(404).json({ 
        error: 'No available time slots for the selected date' 
      });
    }

    // Get existing bookings for this date
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('booking_time, num_children')
      .eq('location_id', location_id)
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    // Create a map of booking times to children count
    const bookingMap = {};
    if (existingBookings) {
      existingBookings.forEach(booking => {
        if (!bookingMap[booking.booking_time]) {
          bookingMap[booking.booking_time] = 0;
        }
        bookingMap[booking.booking_time] += booking.num_children;
      });
    }

    // Assume max capacity of 30 if not specified
    const maxCapacity = 30;

    // Format time slots with availability info
    const availableTimeSlots = timeSlots.map(slot => {
      const bookedChildren = bookingMap[slot.start_time] || 0;
      const remainingCapacity = maxCapacity - bookedChildren;
      
      return {
        start_time: slot.start_time,
        end_time: slot.end_time,
        available: remainingCapacity > 0,
        remaining_capacity: remainingCapacity
      };
    });

    return res.status(200).json({ 
      availableTimeSlots 
    });
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
