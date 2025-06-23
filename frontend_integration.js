// Frontend Integration with Supabase Backend
// This file contains the JavaScript functions to connect the frontend with the Supabase backend

import { supabase } from './supabase.js';

/**
 * Authentication Functions
 */

// Register a new user
export async function registerUser(email, password, firstName, lastName, phone) {
  try {
    // Register the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Create the user profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          is_admin: false
        });

      if (profileError) throw profileError;
    }

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: error.message };
  }
}

// Login an existing user
export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
}

// Logout the current user
export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
}

// Get the current user
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No user logged in' };

    // Get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return { success: true, user, profile };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Location and Package Functions
 */

// Get all active locations
export async function getLocations() {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return { success: true, locations: data };
  } catch (error) {
    console.error('Error fetching locations:', error);
    return { success: false, error: error.message };
  }
}

// Get packages available at a specific location
export async function getPackagesByLocation(locationId) {
  try {
    const { data, error } = await supabase
      .from('location_packages')
      .select(`
        *,
        packages:package_id (*)
      `)
      .eq('location_id', locationId)
      .eq('is_available', true)
      .order('package_id');

    if (error) throw error;

    // Extract the package data
    const packages = data.map(item => ({
      ...item.packages,
      price_override: item.price_override
    }));

    return { success: true, packages };
  } catch (error) {
    console.error('Error fetching packages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Booking Availability Functions
 */

// Get available dates for a location and package
export async function getAvailableDates(locationId, packageId, startDate, endDate) {
  try {
    // Format dates as ISO strings
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('get-available-dates', {
      body: {
        location_id: locationId,
        package_id: packageId,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      }
    });

    if (error) throw error;

    return { success: true, availableDates: data.availableDates };
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return { success: false, error: error.message };
  }
}

// Get available time slots for a specific date
export async function getAvailableTimeSlots(locationId, packageId, date) {
  try {
    // Format date as ISO string
    const formattedDate = date.toISOString().split('T')[0];

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('get-available-time-slots', {
      body: {
        location_id: locationId,
        package_id: packageId,
        date: formattedDate
      }
    });

    if (error) throw error;

    return { success: true, timeSlots: data.availableTimeSlots };
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Booking Functions
 */

// Create a new booking
export async function createBooking(bookingData) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Add user_id to booking data if user is logged in
    if (user) {
      bookingData.user_id = user.id;
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-booking', {
      body: bookingData
    });

    if (error) throw error;

    return { success: true, booking: data.booking };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error.message };
  }
}

// Get bookings for the current user
export async function getUserBookings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No user logged in' };

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        locations:location_id (*),
        packages:package_id (*)
      `)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });

    if (error) throw error;

    return { success: true, bookings: data };
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return { success: false, error: error.message };
  }
}

// Cancel a booking
export async function cancelBooking(bookingId) {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin Functions
 */

// Get all bookings (admin only)
export async function getAllBookings(filters = {}) {
  try {
    // Start building the query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        locations:location_id (*),
        packages:package_id (*)
      `);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters.start_date) {
      query = query.gte('booking_date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('booking_date', filters.end_date);
    }

    // Order by date
    query = query.order('booking_date', { ascending: false });

    // Execute the query
    const { data, error } = await query;

    if (error) throw error;

    return { success: true, bookings: data };
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return { success: false, error: error.message };
  }
}

// Update booking status (admin only)
export async function updateBookingStatus(bookingId, status) {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * UI Integration Functions
 */

// Initialize the booking form
export function initBookingForm() {
  // Get form elements
  const locationSelect = document.getElementById('location-select');
  const packageSelect = document.getElementById('package-select');
  const dateInput = document.getElementById('date-input');
  const timeSelect = document.getElementById('time-select');
  const nextButton = document.getElementById('next-button');

  // Disable form elements initially
  packageSelect.disabled = true;
  dateInput.disabled = true;
  timeSelect.disabled = true;
  nextButton.disabled = true;

  // Load locations
  getLocations().then(result => {
    if (result.success) {
      // Populate location dropdown
      locationSelect.innerHTML = '<option value="">Choose a location...</option>';
      result.locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = location.name;
        locationSelect.appendChild(option);
      });

      // Enable location select
      locationSelect.disabled = false;
    } else {
      showError('Error loading locations: ' + result.error);
    }
  });

  // Location change handler
  locationSelect.addEventListener('change', () => {
    const locationId = locationSelect.value;
    
    // Reset and disable dependent fields
    packageSelect.innerHTML = '<option value="">Choose a package...</option>';
    packageSelect.disabled = true;
    dateInput.value = '';
    dateInput.disabled = true;
    timeSelect.innerHTML = '<option value="">Choose a time...</option>';
    timeSelect.disabled = true;
    nextButton.disabled = true;
    
    if (locationId) {
      // Load packages for selected location
      getPackagesByLocation(locationId).then(result => {
        if (result.success) {
          // Populate package dropdown
          result.packages.forEach(pkg => {
            const option = document.createElement('option');
            option.value = pkg.id;
            option.textContent = pkg.name;
            packageSelect.appendChild(option);
          });
          
          // Enable package select
          packageSelect.disabled = false;
        } else {
          showError('Error loading packages: ' + result.error);
        }
      });
    }
  });

  // Package change handler
  packageSelect.addEventListener('change', () => {
    const locationId = locationSelect.value;
    const packageId = packageSelect.value;
    
    // Reset and disable dependent fields
    dateInput.value = '';
    dateInput.disabled = true;
    timeSelect.innerHTML = '<option value="">Choose a time...</option>';
    timeSelect.disabled = true;
    nextButton.disabled = true;
    
    if (packageId) {
      // Enable date input
      dateInput.disabled = false;
      
      // Set min date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split('T')[0];
      
      // Set max date to 90 days from now
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      dateInput.max = maxDate.toISOString().split('T')[0];
    }
  });

  // Date change handler
  dateInput.addEventListener('change', () => {
    const locationId = locationSelect.value;
    const packageId = packageSelect.value;
    const date = dateInput.value;
    
    // Reset and disable dependent fields
    timeSelect.innerHTML = '<option value="">Choose a time...</option>';
    timeSelect.disabled = true;
    nextButton.disabled = true;
    
    if (date) {
      // Load available time slots
      getAvailableTimeSlots(locationId, packageId, new Date(date)).then(result => {
        if (result.success) {
          // Populate time dropdown
          result.timeSlots.forEach(slot => {
            if (slot.available) {
              const option = document.createElement('option');
              option.value = slot.start_time;
              
              // Format time for display (convert from 24h to 12h format)
              const timeArr = slot.start_time.split(':');
              const hours = parseInt(timeArr[0]);
              const minutes = timeArr[1];
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const formattedHours = hours % 12 || 12;
              const formattedTime = `${formattedHours}:${minutes} ${ampm}`;
              
              option.textContent = formattedTime;
              timeSelect.appendChild(option);
            }
          });
          
          // Enable time select if options are available
          if (timeSelect.options.length > 1) {
            timeSelect.disabled = false;
          } else {
            showError('No available time slots for the selected date');
          }
        } else {
          showError('Error loading time slots: ' + result.error);
        }
      });
    }
  });

  // Time change handler
  timeSelect.addEventListener('change', () => {
    const time = timeSelect.value;
    nextButton.disabled = !time;
  });

  // Form submission handler
  nextButton.addEventListener('click', () => {
    // Store selected values in session storage for multi-step form
    const bookingData = {
      location_id: locationSelect.value,
      package_id: packageSelect.value,
      booking_date: dateInput.value,
      booking_time: timeSelect.value
    };
    
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    
    // Navigate to next step
    window.location.href = 'booking-step2.html';
  });
}

// Initialize the guest details form (step 2)
export function initGuestDetailsForm() {
  // Get stored booking data
  const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
  
  // Redirect if no booking data
  if (!bookingData.location_id) {
    window.location.href = 'booking.html';
    return;
  }
  
  // Get form elements
  const childNameInput = document.getElementById('child-name');
  const childAgeInput = document.getElementById('child-age');
  const numChildrenInput = document.getElementById('num-children');
  const numAdultsInput = document.getElementById('num-adults');
  const specialRequestsInput = document.getElementById('special-requests');
  const nextButton = document.getElementById('next-button');
  
  // Get package details to validate children count
  getPackagesByLocation(bookingData.location_id).then(result => {
    if (result.success) {
      const selectedPackage = result.packages.find(pkg => pkg.id == bookingData.package_id);
      
      if (selectedPackage) {
        // Set min/max children
        numChildrenInput.min = selectedPackage.min_children;
        if (selectedPackage.max_children) {
          numChildrenInput.max = selectedPackage.max_children;
        }
        
        // Set helper text
        const helperText = document.getElementById('children-helper-text');
        if (helperText) {
          helperText.textContent = `This package requires between ${selectedPackage.min_children} and ${selectedPackage.max_children || 'unlimited'} children`;
        }
      }
    }
  });
  
  // Form validation
  function validateForm() {
    const isValid = 
      childNameInput.value.trim() !== '' &&
      childAgeInput.value !== '' &&
      numChildrenInput.value !== '' &&
      numAdultsInput.value !== '';
    
    nextButton.disabled = !isValid;
  }
  
  // Add event listeners
  childNameInput.addEventListener('input', validateForm);
  childAgeInput.addEventListener('input', validateForm);
  numChildrenInput.addEventListener('input', validateForm);
  numAdultsInput.addEventListener('input', validateForm);
  
  // Form submission handler
  nextButton.addEventListener('click', () => {
    // Update booking data
    bookingData.child_name = childNameInput.value.trim();
    bookingData.child_age = childAgeInput.value;
    bookingData.num_children = numChildrenInput.value;
    bookingData.num_adults = numAdultsInput.value;
    bookingData.special_requests = specialRequestsInput.value.trim();
    
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    
    // Navigate to next step
    window.location.href = 'booking-step3.html';
  });
}

// Initialize the contact info form (step 3)
export function initContactInfoForm() {
  // Get stored booking data
  const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
  
  // Redirect if no booking data
  if (!bookingData.location_id) {
    window.location.href = 'booking.html';
    return;
  }
  
  // Get form elements
  const parentNameInput = document.getElementById('parent-name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const nextButton = document.getElementById('next-button');
  
  // Pre-fill form if user is logged in
  getCurrentUser().then(result => {
    if (result.success && result.profile) {
      parentNameInput.value = `${result.profile.first_name} ${result.profile.last_name}`.trim();
      emailInput.value = result.profile.email;
      phoneInput.value = result.profile.phone || '';
      validateForm();
    }
  });
  
  // Form validation
  function validateForm() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = 
      parentNameInput.value.trim() !== '' &&
      emailRegex.test(emailInput.value.trim()) &&
      phoneInput.value.trim() !== '';
    
    nextButton.disabled = !isValid;
  }
  
  // Add event listeners
  parentNameInput.addEventListener('input', validateForm);
  emailInput.addEventListener('input', validateForm);
  phoneInput.addEventListener('input', validateForm);
  
  // Form submission handler
  nextButton.addEventListener('click', () => {
    // Update booking data
    bookingData.parent_name = parentNameInput.value.trim();
    bookingData.email = emailInput.value.trim();
    bookingData.phone = phoneInput.value.trim();
    
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    
    // Navigate to review page
    window.location.href = 'booking-review.html';
  });
}

// Initialize the booking review page
export function initBookingReview() {
  // Get stored booking data
  const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
  
  // Redirect if no booking data
  if (!bookingData.location_id) {
    window.location.href = 'booking.html';
    return;
  }
  
  // Get elements
  const locationElement = document.getElementById('review-location');
  const packageElement = document.getElementById('review-package');
  const dateElement = document.getElementById('review-date');
  const timeElement = document.getElementById('review-time');
  const childNameElement = document.getElementById('review-child-name');
  const childAgeElement = document.getElementById('review-child-age');
  const numChildrenElement = document.getElementById('review-num-children');
  const numAdultsElement = document.getElementById('review-num-adults');
  const specialRequestsElement = document.getElementById('review-special-requests');
  const parentNameElement = document.getElementById('review-parent-name');
  const emailElement = document.getElementById('review-email');
  const phoneElement = document.getElementById('review-phone');
  const totalPriceElement = document.getElementById('review-total-price');
  const confirmButton = document.getElementById('confirm-button');
  
  // Load location and package details
  Promise.all([
    getLocations(),
    getPackagesByLocation(bookingData.location_id)
  ]).then(([locationsResult, packagesResult]) => {
    if (locationsResult.success && packagesResult.success) {
      const location = locationsResult.locations.find(loc => loc.id == bookingData.location_id);
      const packageObj = packagesResult.packages.find(pkg => pkg.id == bookingData.package_id);
      
      if (location && packageObj) {
        // Display location and package
        locationElement.textContent = location.name;
        packageElement.textContent = packageObj.name;
        
        // Calculate total price
        const price = packageObj.price_override || packageObj.price;
        const totalPrice = price * bookingData.num_children;
        totalPriceElement.textContent = `€${totalPrice.toFixed(2)}`;
        
        // Store price in booking data
        bookingData.total_price = totalPrice;
        sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
      }
    }
  });
  
  // Format date for display
  const bookingDate = new Date(bookingData.booking_date);
  const formattedDate = bookingDate.toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Format time for display (convert from 24h to 12h format)
  const timeArr = bookingData.booking_time.split(':');
  const hours = parseInt(timeArr[0]);
  const minutes = timeArr[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedTime = `${formattedHours}:${minutes} ${ampm}`;
  
  // Display booking details
  dateElement.textContent = formattedDate;
  timeElement.textContent = formattedTime;
  childNameElement.textContent = bookingData.child_name;
  childAgeElement.textContent = bookingData.child_age;
  numChildrenElement.textContent = bookingData.num_children;
  numAdultsElement.textContent = bookingData.num_adults;
  specialRequestsElement.textContent = bookingData.special_requests || 'None';
  parentNameElement.textContent = bookingData.parent_name;
  emailElement.textContent = bookingData.email;
  phoneElement.textContent = bookingData.phone;
  
  // Confirm button handler
  confirmButton.addEventListener('click', () => {
    // Disable button to prevent double submission
    confirmButton.disabled = true;
    confirmButton.textContent = 'Processing...';
    
    // Create booking
    createBooking(bookingData).then(result => {
      if (result.success) {
        // Clear booking data from session storage
        sessionStorage.removeItem('bookingData');
        
        // Store booking ID for confirmation page
        sessionStorage.setItem('bookingConfirmation', JSON.stringify({
          bookingId: result.booking.id,
          childName: bookingData.child_name,
          location: locationElement.textContent,
          package: packageElement.textContent,
          date: formattedDate,
          time: formattedTime,
          totalPrice: bookingData.total_price
        }));
        
        // Navigate to confirmation page
        window.location.href = 'confirmation.html';
      } else {
        showError('Error creating booking: ' + result.error);
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirm Booking';
      }
    });
  });
}

// Initialize the confirmation page
export function initConfirmationPage() {
  // Get confirmation data
  const confirmationData = JSON.parse(sessionStorage.getItem('bookingConfirmation') || '{}');
  
  // Redirect if no confirmation data
  if (!confirmationData.bookingId) {
    window.location.href = 'booking.html';
    return;
  }
  
  // Get elements
  const bookingIdElement = document.getElementById('confirmation-booking-id');
  const childNameElement = document.getElementById('confirmation-child-name');
  const locationElement = document.getElementById('confirmation-location');
  const packageElement = document.getElementById('confirmation-package');
  const dateElement = document.getElementById('confirmation-date');
  const timeElement = document.getElementById('confirmation-time');
  const totalPriceElement = document.getElementById('confirmation-total-price');
  
  // Display confirmation details
  bookingIdElement.textContent = confirmationData.bookingId;
  childNameElement.textContent = confirmationData.childName;
  locationElement.textContent = confirmationData.location;
  packageElement.textContent = confirmationData.package;
  dateElement.textContent = confirmationData.date;
  timeElement.textContent = confirmationData.time;
  totalPriceElement.textContent = `€${confirmationData.totalPrice.toFixed(2)}`;
  
  // Clear confirmation data after displaying
  sessionStorage.removeItem('bookingConfirmation');
}

// Helper function to show error messages
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  } else {
    alert(message);
  }
}
