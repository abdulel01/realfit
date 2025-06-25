// Update to script.js to integrate EmailJS for email confirmation

// Import Supabase functions and client
import { 
  supabase,
  getLocations, 
  getPackages, 
  getPackagesByLocation, 
  getTimeSlots, 
  createBooking,
  testConnection,
  checkAvailability,
  getUnavailableDates
} from './supabase.js';

// Import EmailJS functions
import { sendBookingConfirmationEmail } from './emailjs-integration.js';

// Import real-time data functions
import { 
  initializeRealTimeData, 
  onDataChange, 
  getCurrentData,
  showDataChangeNotification 
} from './realtime-data.js';

// Import Stripe payment functions
import { 
  initializeStripePayment, 
  processPayment, 
  updatePaymentSummary,
  validatePaymentStep 
} from './stripe-payment.js';

// Add debug logging for imports
console.log('Script.js loaded');

// Mobile Navigation Functions
function initializeMobileNavigation() {
    console.log('🔧 Initializing enhanced mobile navigation...');
    
    // Get elements
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navUl = document.querySelector('nav ul');
    const navLinks = document.querySelectorAll('nav ul li a');
    const body = document.body;
    
    // Debug logging
    console.log('Mobile menu button found:', !!mobileMenuBtn);
    console.log('Navigation menu found:', !!navUl);
    console.log('Navigation links found:', navLinks.length);
    
    if (!mobileMenuBtn || !navUl) {
        console.error('❌ Mobile menu elements not found!');
        console.log('Looking for:', {
            mobileMenuBtn: '.mobile-menu-btn',
            navUl: 'nav ul'
        });
        return;
    }
    
    // State management
    let isMenuOpen = false;
    
    // Toggle mobile menu function
    function toggleMobileMenu(e) {
        if (e) e.preventDefault();
        
        isMenuOpen = !isMenuOpen;
        console.log('📱 Toggle mobile menu:', isMenuOpen ? 'OPEN' : 'CLOSED');
        
        // Toggle classes
        mobileMenuBtn.classList.toggle('active', isMenuOpen);
        navUl.classList.toggle('active', isMenuOpen);
        body.classList.toggle('menu-open', isMenuOpen);
        
        // Prevent body scroll when menu is open
        if (isMenuOpen) {
            body.style.overflow = 'hidden';
        } else {
            body.style.overflow = '';
        }
        
        // Update ARIA attributes for accessibility
        mobileMenuBtn.setAttribute('aria-expanded', isMenuOpen);
        navUl.setAttribute('aria-hidden', !isMenuOpen);
    }
    
    // Close mobile menu function
    function closeMobileMenu() {
        if (isMenuOpen) {
            console.log('📱 Closing mobile menu');
            isMenuOpen = false;
            mobileMenuBtn.classList.remove('active');
            navUl.classList.remove('active');
            body.classList.remove('menu-open');
            body.style.overflow = '';
            
            // Update ARIA attributes
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            navUl.setAttribute('aria-hidden', 'true');
        }
    }
    
    // Event Listeners
    
    // 1. Mobile menu button click
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    mobileMenuBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        toggleMobileMenu();
    }, { passive: false });
    
    // 2. Navigation link clicks - close menu
    navLinks.forEach((link, index) => {
        link.addEventListener('click', function() {
            console.log(`📱 Nav link clicked: ${link.textContent.trim()}`);
            // Small delay to allow navigation to start
            setTimeout(closeMobileMenu, 100);
        });
        
        // Touch events for better mobile response
        link.addEventListener('touchend', function() {
            setTimeout(closeMobileMenu, 100);
        });
    });
    
    // 3. Click outside menu to close
    document.addEventListener('click', function(e) {
        // Check if click is outside menu and button
        if (isMenuOpen && 
            !mobileMenuBtn.contains(e.target) && 
            !navUl.contains(e.target)) {
            console.log('📱 Clicked outside menu - closing');
            closeMobileMenu();
        }
    });
    
    // 4. Touch events for better mobile handling
    document.addEventListener('touchstart', function(e) {
        if (isMenuOpen && 
            !mobileMenuBtn.contains(e.target) && 
            !navUl.contains(e.target)) {
            closeMobileMenu();
        }
    }, { passive: true });
    
    // 5. Escape key to close menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isMenuOpen) {
            console.log('📱 Escape key pressed - closing menu');
            closeMobileMenu();
        }
    });
    
    // 6. Window resize - close menu if switching to desktop
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (window.innerWidth > 768 && isMenuOpen) {
                console.log('📱 Resized to desktop - closing menu');
                closeMobileMenu();
            }
        }, 100);
    });
    
    // 7. Orientation change on mobile devices
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            if (window.innerWidth > 768 && isMenuOpen) {
                closeMobileMenu();
            }
        }, 500); // Delay to allow orientation change to complete
    });
    
    // Initialize ARIA attributes
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.setAttribute('aria-controls', 'main-navigation');
    mobileMenuBtn.setAttribute('aria-label', 'Toggle navigation menu');
    navUl.setAttribute('aria-hidden', 'true');
    navUl.setAttribute('id', 'main-navigation');
    
    console.log('✅ Enhanced mobile navigation initialized successfully');
    
    // Return control functions for external use
    return {
        toggle: toggleMobileMenu,
        close: closeMobileMenu,
        isOpen: () => isMenuOpen
    };
}

// Debug function for mobile navigation
function debugMobileNav() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navUl = document.querySelector('nav ul');
    
    console.log('🔍 Mobile Navigation Debug:', {
        mobileMenuBtn: {
            found: !!mobileMenuBtn,
            visible: mobileMenuBtn ? getComputedStyle(mobileMenuBtn).display !== 'none' : false,
            hasClickListener: mobileMenuBtn ? mobileMenuBtn.onclick !== null : false
        },
        navUl: {
            found: !!navUl,
            hasActiveClass: navUl ? navUl.classList.contains('active') : false
        },
        viewport: {
            width: window.innerWidth,
            isMobile: window.innerWidth <= 768
        }
    });
}

// Make debug function available globally
window.debugMobileNav = debugMobileNav;

// Test Supabase connection on load
testConnection().then(result => {
    console.log('Connection test result:', result);
});

// DOM Elements - Updated to match actual HTML IDs
const bookingForm = document.getElementById('booking-form');
const locationSelect = document.getElementById('location');
const packageGrid = document.getElementById('package-grid');
const partyDateInput = document.getElementById('party-date');
const partyTimeInput = document.getElementById('party-time');

// Store selected package data
let selectedPackage = null;

// Store form state
let currentStep = 1;
const totalSteps = 5; // Updated to include payment step

// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing form...');
    
    // Initialize mobile navigation
    initializeMobileNavigation();
    
    // Initialize real-time data system (only for booking/packages/locations pages)
    const currentPage = document.body.dataset.page;
    if (['booking', 'booking-v3', 'packages', 'locations'].includes(currentPage)) {
        console.log('🔄 Initializing real-time data for page:', currentPage);
        initializeRealTimeData();
        setupRealTimeListeners();
    }
    
    // Load initial data
    await loadLocations();
    // Don't load all packages initially - wait for location selection
    // Time slots will be loaded when location is selected
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize date picker
    initializeDatePicker();
    
    // Initialize time picker
    initializeTimePicker();
    
    // Initialize form navigation
    initializeFormNavigation();
    
    // Show initial message in package grid
    if (packageGrid) {
        packageGrid.innerHTML = '<div class="no-packages">Please select a location first to see available packages</div>';
    }
});

// Setup real-time data listeners for live updates
function setupRealTimeListeners() {
    console.log('🔄 Setting up real-time listeners...');
    
    // Listen for package changes
    onDataChange('packages', (data) => {
        console.log('📦 Live package update detected');
        showDataChangeNotification('Package data updated', 'info');
        
        // Refresh packages if we're currently showing them
        if (packageGrid && packageGrid.children.length > 0 && 
            !packageGrid.querySelector('.no-packages')) {
            const currentLocationId = locationSelect?.value;
            if (currentLocationId) {
                loadPackagesByLocation(currentLocationId);
            }
        }
    });
    
    // Listen for location changes
    onDataChange('locations', (data) => {
        console.log('📍 Live location update detected');
        showDataChangeNotification('Location data updated', 'info');
        loadLocations(); // Refresh locations dropdown
    });
    
    // Listen for booking changes (for availability updates)
    onDataChange('bookings', (data) => {
        console.log('📊 Live booking update detected');
        
        // If we're showing availability, refresh it
        const selectedDate = partyDateInput?.value;
        const selectedLocation = locationSelect?.value;
        if (selectedDate && selectedLocation) {
            console.log('🔄 Refreshing availability due to booking change');
            checkDateAvailability();
        }
    });
    
    // Listen for time slot changes
    onDataChange('timeSlots', (data) => {
        console.log('⏰ Live time slot update detected');
        showDataChangeNotification('Time slots updated', 'info');
        
        const selectedLocation = locationSelect?.value;
        const selectedDate = partyDateInput?.value;
        if (selectedLocation) {
            loadTimeSlots(selectedLocation, selectedDate);
        }
    });
}

// Initialize Flatpickr date picker
function initializeDatePicker() {
    if (partyDateInput) {
        flatpickr(partyDateInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: [], // Add unavailable dates here later
            onChange: function(selectedDates, dateStr, instance) {
                console.log('Date selected:', dateStr);
                handleDateChange();
            }
        });
    }
}

// Initialize time picker
function initializeTimePicker() {
    if (partyTimeInput) {
        // Make it a dropdown instead of text input for better UX
        const timeSelect = document.createElement('select');
        timeSelect.id = 'party-time';
        timeSelect.name = 'party_time';
        timeSelect.required = true;
        
        partyTimeInput.parentNode.replaceChild(timeSelect, partyTimeInput);
        
        // Load time slots into the new select element (initially empty until location is selected)
        loadTimeSlots();
    }
}

// Load locations into dropdown
async function loadLocations() {
    try {
        const result = await getLocations();
        if (result.success && locationSelect) {
            // Clear existing options except the first
            locationSelect.innerHTML = '<option value="">Choose a location...</option>';
            
            result.data.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = `${location.name} - ${location.address}`;
                locationSelect.appendChild(option);
            });
            console.log('Locations loaded:', result.data.length);
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Load packages into grid
async function loadPackages() {
    try {
        const result = await getPackages();
        if (result.success && packageGrid) {
            packageGrid.innerHTML = ''; // Clear existing packages
            
            result.data.forEach(pkg => {
                const packageCard = createPackageCard(pkg);
                packageGrid.appendChild(packageCard);
            });
            console.log('Packages loaded:', result.data.length);
        }
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

// Create package card element
function createPackageCard(pkg) {
    const card = document.createElement('div');
    card.className = 'package-card';
    card.dataset.packageId = pkg.id;
    card.dataset.price = pkg.price;
    
    card.innerHTML = `
        <div class="package-header">
            <h3>${pkg.name}</h3>
            <div class="package-price">€${pkg.price}</div>
        </div>
        <div class="package-description">
            <p>${pkg.description || 'Perfect for your party!'}</p>
        </div>
        <div class="package-features">
            <ul>
                <li>Duration: ${pkg.duration || '2 hours'}</li>
                <li>Max guests: ${pkg.max_guests || '20'}</li>
                <li>Age range: ${pkg.min_age || '4'}-${pkg.max_age || '16'} years</li>
            </ul>
        </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => selectPackage(card, pkg));
    
    return card;
}

// Handle package selection
function selectPackage(cardElement, pkg) {
    // Remove selection from other cards
    document.querySelectorAll('.package-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select this card
    cardElement.classList.add('selected');
    selectedPackage = pkg;
    
    console.log('Package selected:', pkg);
    
    // Update total price display if exists
    updateTotalPrice();
}

// Load time slots into dropdown
async function loadTimeSlots(locationId = null, selectedDate = null) {
    try {
        const timeSelect = document.getElementById('party-time');
        console.log('🕒 Loading time slots - Element found:', !!timeSelect, 'Location:', locationId, 'Date:', selectedDate);
        
        if (!timeSelect) {
            console.error('❌ Time select element not found!');
            return;
        }
        
        // If no location is selected, show placeholder
        if (!locationId) {
            timeSelect.innerHTML = '<option value="">Select a location first...</option>';
            console.log('📍 No location selected, showing placeholder');
            return;
        }
        
        // Show loading state
        timeSelect.innerHTML = '<option value="">Loading time slots...</option>';
        
        // Calculate day of week if date is provided
        let dayOfWeek = null;
        if (selectedDate) {
            const date = new Date(selectedDate);
            dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            console.log('📅 Date selected, day of week:', dayOfWeek);
        }
        
        console.log('🔍 Fetching time slots for location:', locationId, 'day:', dayOfWeek);
        console.log('🕐 Current timestamp:', new Date().toISOString());
        const result = await getTimeSlots(locationId, dayOfWeek);
        console.log('⏰ Time slots result:', result);
        console.log('📋 Raw time slots data:', result.data);
        
        if (result.success && timeSelect) {
            // Clear all existing options first
            timeSelect.innerHTML = '<option value="">Select a time...</option>';
            
            if (!result.data || result.data.length === 0) {
                console.log('⚠️ No time slots found');
                timeSelect.innerHTML = '<option value="">No time slots available for this day</option>';
                return;
            }
            
            // Deduplicate time slots on the frontend as well (safety measure)
            const seenTimes = new Set();
            const uniqueSlots = result.data.filter(slot => {
                const timeValue = slot.value || slot.start_time;
                if (seenTimes.has(timeValue)) {
                    console.log(`⚠️ Filtering duplicate time slot: ${timeValue}`);
                    return false;
                }
                seenTimes.add(timeValue);
                return true;
            });
            
            console.log('✅ Adding', uniqueSlots.length, 'unique time slots to dropdown (filtered from', result.data.length, 'total)');
            uniqueSlots.forEach((slot, index) => {
                const option = document.createElement('option');
                option.value = slot.value || slot.start_time;
                option.textContent = slot.name || slot.display_name || slot.value || slot.start_time;
                timeSelect.appendChild(option);
                console.log(`  ${index + 1}. ${option.textContent} (${option.value})`);
            });
            
            console.log('✅ Time slots loaded successfully:', uniqueSlots.length);
        } else {
            console.error('❌ Failed to load time slots:', result.error);
            timeSelect.innerHTML = '<option value="">Error loading time slots</option>';
        }
    } catch (error) {
        console.error('❌ Error loading time slots:', error);
        const timeSelect = document.getElementById('party-time');
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="">Error loading time slots</option>';
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Location change event
    if (locationSelect) {
        locationSelect.addEventListener('change', handleLocationChange);
    }
    
    // Number of guests change event
    const numGuestsInput = document.getElementById('num-guests');
    if (numGuestsInput) {
        numGuestsInput.addEventListener('input', updateTotalPrice);
        numGuestsInput.addEventListener('change', updateTotalPrice);
    }
    
    // Date change event (handled by Flatpickr now)
    // Package selection is handled by individual card clicks
    
    // Form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleFormSubmission);
    }
}

// Handle location change
async function handleLocationChange() {
    const locationId = locationSelect.value;
    
    console.log('🏢 Location changed to:', locationId);
    
    // Clear package selection
    selectedPackage = null;
    
    if (!locationId) {
        // Show placeholder message if no location selected
        if (packageGrid) {
            packageGrid.innerHTML = '<div class="no-packages">Please select a location first to see available packages</div>';
        }
        // Clear time slots
        console.log('🔄 Clearing time slots (no location)');
        await loadTimeSlots();
        return;
    }
    
    // Load packages for selected location
    console.log('📦 Loading packages for location:', locationId);
    await loadPackagesByLocation(locationId);
    
    // Load time slots for selected location
    console.log('⏰ Loading time slots for location:', locationId);
    const selectedDate = partyDateInput?.value;
    console.log('📅 Current selected date:', selectedDate);
    await loadTimeSlots(locationId, selectedDate);
    
    // Check date availability if date is already selected
    if (selectedDate) {
        console.log('🔍 Checking date availability for:', selectedDate);
        await checkDateAvailability();
    }
}

// Load packages for specific location
async function loadPackagesByLocation(locationId) {
    try {
        console.log('Loading packages for location:', locationId);
        
        if (!packageGrid) {
            console.error('Package grid not found');
            return;
        }
        
        // Show loading message
        packageGrid.innerHTML = '<div class="loading-packages">Loading available packages...</div>';
        
        const result = await getPackagesByLocation(locationId);
        
        if (result.success) {
            packageGrid.innerHTML = ''; // Clear loading message
            
            if (result.data.length === 0) {
                packageGrid.innerHTML = '<div class="no-packages">No packages available for this location</div>';
                return;
            }
            
            result.data.forEach(pkg => {
                const packageCard = createPackageCard(pkg);
                packageGrid.appendChild(packageCard);
            });
            
            console.log('Packages loaded for location:', result.data.length);
        } else {
            console.error('Error loading packages:', result.error);
            packageGrid.innerHTML = '<div class="error-packages">Error loading packages. Please try again.</div>';
        }
    } catch (error) {
        console.error('Error loading packages by location:', error);
        if (packageGrid) {
            packageGrid.innerHTML = '<div class="error-packages">Error loading packages. Please try again.</div>';
        }
    }
}

// Handle date change
async function handleDateChange() {
    const locationId = locationSelect?.value;
    const selectedDate = partyDateInput?.value;
    
    console.log('📅 Date changed to:', selectedDate, 'for location:', locationId);
    
    if (locationId && selectedDate) {
        console.log('🔍 Checking availability and reloading time slots');
        await checkDateAvailability();
        // Reload time slots for the selected date
        await loadTimeSlots(locationId, selectedDate);
    } else if (locationId) {
        // If we have a location but no date, show all time slots
        console.log('⏰ Reloading all time slots for location');
        await loadTimeSlots(locationId);
    }
}

// Handle package change
function handlePackageChange() {
    updateTotalPrice();
}

// Check if selected date is available
async function checkDateAvailability() {
    const locationId = locationSelect.value;
    const selectedDate = partyDateInput.value;
    
    if (!locationId || !selectedDate) return;
    
    try {
        const result = await checkAvailability(locationId, selectedDate);
        
        if (result.success) {
            const messageDiv = document.getElementById('availabilityMessage') || createAvailabilityMessage();
            
            if (result.available) {
                messageDiv.innerHTML = `✅ Available! ${result.remaining} spots remaining out of ${result.capacity}`;
                messageDiv.className = 'availability-message success';
            } else {
                messageDiv.innerHTML = `❌ Fully booked for this date. Please select another date.`;
                messageDiv.className = 'availability-message error';
            }
        } else {
            console.error('Availability check failed:', result.error);
        }
    } catch (error) {
        console.error('Error checking availability:', error);
    }
}

// Create availability message element
function createAvailabilityMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'availabilityMessage';
    messageDiv.className = 'availability-message';
    
    // Insert after date input
    partyDateInput.parentNode.insertBefore(messageDiv, partyDateInput.nextSibling);
    
    return messageDiv;
}

// Update total price
function updateTotalPrice() {
    if (!selectedPackage) return;
    
    // Get number of children for price calculation
    const numChildrenElement = document.getElementById('num-guests');
    const numChildren = numChildrenElement ? parseInt(numChildrenElement.value) || 1 : 1;
    
    // Calculate total price (package price per child)
    const totalPrice = parseFloat(selectedPackage.price) * numChildren;
    
    const totalPriceElement = document.getElementById('summary-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = `€${totalPrice.toFixed(2)}`;
    }
    
    // Update any other price displays
    const summaryTotalElement = document.querySelector('.summary-total span');
    if (summaryTotalElement) {
        summaryTotalElement.textContent = `€${totalPrice.toFixed(2)}`;
    }
}

// Handle form submission (now handles payment step)
async function handleFormSubmission(event) {
    event.preventDefault();
    
    console.log('Form submission started...');
    
    // Validate required selections
    if (!selectedPackage) {
        showMessage('❌ Please select a package', 'error');
        return;
    }
    
    try {
        // Get number of children and calculate total price
        const numChildren = parseInt(document.getElementById('num-guests').value) || 1;
        const totalPrice = parseFloat(selectedPackage.price) * numChildren;
        
        // Collect form data from the multi-step form
            const bookingData = {
            parent_name: document.getElementById('parent-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            booking_date: document.getElementById('party-date').value,
            booking_time: document.getElementById('party-time').value,
            location_id: parseInt(document.getElementById('location').value),
            package_id: parseInt(selectedPackage.id),
            num_children: numChildren,
            num_adults: 2, // Default to 2 adults
            child_name: document.getElementById('child-name').value,
            child_age: parseInt(document.getElementById('child-age').value),
            special_requests: document.getElementById('special-requests').value || '',
                status: 'pending',
            payment_status: 'unpaid',
            total_price: totalPrice // Use calculated total price
        };
        
        console.log('Booking data prepared:', bookingData);
        
        // Check availability one more time
        const availabilityCheck = await checkAvailability(
            bookingData.location_id, 
            bookingData.booking_date
        );
        
        if (!availabilityCheck.success || !availabilityCheck.available) {
            throw new Error('This date is no longer available. Please select another date.');
        }
        
        // Check if payment is being skipped
        if (window.skipPayment) {
            console.log('Skipping payment, creating booking with manual payment status...');
            
            // Update booking data for manual payment
            const manualBookingData = {
                ...bookingData,
                payment_status: 'pending_manual',
                status: 'pending_payment',
                notes: 'Manual payment required - customer will be contacted'
            };
            
            // Create booking in database
            const bookingResult = await createBookingInDatabase(manualBookingData);
            
            if (!bookingResult.success) {
                throw new Error('Failed to create booking: ' + bookingResult.error);
            }
            
            // Store booking data for confirmation page
            sessionStorage.setItem('bookingData', JSON.stringify(manualBookingData));
            
            // Redirect to confirmation page
            console.log('Manual booking created successfully, redirecting...');
            window.location.href = `confirmation.html?bookingId=${bookingResult.bookingId}&manual=true`;
            
            return;
        }
        
        // Process payment first
        console.log('Processing payment...');
        
        // Use Stripe Payment Intents system
        const paymentResult = await processPayment(bookingData);
        
        if (!paymentResult.success) {
            throw new Error(paymentResult.error || 'Payment failed');
        }
        
        console.log('Payment successful, creating booking...');
        
        // Update booking data with payment info
        const updatedBookingData = {
            ...bookingData,
            ...paymentResult.bookingData,
            payment_status: 'paid'
        };
        
        // Create booking in database
        const bookingResult = await createBookingInDatabase(updatedBookingData);
        
        if (!bookingResult.success) {
            throw new Error('Payment successful but booking creation failed. Please contact support.');
        }
        
        // Store booking data for confirmation page
        sessionStorage.setItem('bookingData', JSON.stringify(updatedBookingData));
        
        // Redirect to confirmation page
        console.log('Booking created successfully, redirecting...');
        window.location.href = `confirmation.html?bookingId=${bookingResult.bookingId}`;
        
        return;
        
    } catch (error) {
        console.error('Booking failed:', error);
        showMessage('❌ Booking failed: ' + error.message, 'error');
    }
}

// Create booking in database
async function createBookingInDatabase(bookingData) {
    try {
        console.log('Creating booking in database:', bookingData);
        
        // Prepare clean booking data
        const cleanBookingData = {
            parent_name: bookingData.parent_name,
            email: bookingData.email,
            phone: bookingData.phone,
            booking_date: bookingData.booking_date,
            booking_time: bookingData.booking_time,
            location_id: parseInt(bookingData.location_id),
            package_id: parseInt(bookingData.package_id),
            num_children: parseInt(bookingData.num_children),
            num_adults: parseInt(bookingData.num_adults) || 2,
            child_name: bookingData.child_name,
            child_age: parseInt(bookingData.child_age),
            special_requests: bookingData.special_requests || '',
            total_price: parseFloat(bookingData.total_price)
        };

        // Set status and payment status based on payment type
        if (bookingData.payment_status === 'pending_manual') {
            cleanBookingData.status = 'pending_payment';
            cleanBookingData.payment_status = 'pending_manual';
            if (bookingData.notes) {
                cleanBookingData.special_requests += (cleanBookingData.special_requests ? '\n' : '') + bookingData.notes;
            }
        } else {
            cleanBookingData.status = 'confirmed';
            cleanBookingData.payment_status = 'paid';
        }

        // Add payment details if available
        if (bookingData.payment_intent_id) {
            cleanBookingData.payment_intent_id = bookingData.payment_intent_id;
        }
        if (bookingData.amount_paid) {
            cleanBookingData.amount_paid = parseFloat(bookingData.amount_paid);
        }

        console.log('Clean booking data for database:', cleanBookingData);

        const { data, error } = await supabase
            .from('bookings')
            .insert(cleanBookingData)
            .select()
            .single();
        
        if (error) {
            console.error('Database error creating booking:', error);
            console.error('Full error details:', error);
            console.error('Booking data that failed:', bookingData);
            return { success: false, error: error.message };
        }
        
        console.log('Booking created successfully:', data);
        return { success: true, bookingId: data.id, booking: data };
        
    } catch (error) {
        console.error('Error creating booking:', error);
        console.error('Error stack:', error.stack);
        
        // Try a simple test insert to see if Supabase connection works
        try {
            console.log('Testing Supabase connection...');
            const { data: testData, error: testError } = await supabase
                .from('bookings')
                .select('id')
                .limit(1);
                
            if (testError) {
                console.error('Supabase connection test failed:', testError);
                return { success: false, error: 'Database connection failed: ' + testError.message };
            } else {
                console.log('Supabase connection test passed');
            }
        } catch (testErr) {
            console.error('Supabase connection test error:', testErr);
        }
        
        return { success: false, error: error.message };
    }
}

// Show message to user
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.booking-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `booking-message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of form
    bookingForm.insertBefore(messageDiv, bookingForm.firstChild);
    
    // Auto-remove after 5 seconds for success messages
    if (type === 'success') {
                        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Add CSS for package cards and improved styling
const style = document.createElement('style');
style.textContent = `
    /* Multi-step form styling */
    .form-step {
        display: none;
        animation: fadeIn 0.5s ease-in;
    }
    
    .form-step.active {
        display: block;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(10px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    .step-indicator {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
        padding: 0 20px;
    }
    
    .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
    }
    
    .step:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 15px;
        left: 60%;
        right: -40%;
        height: 2px;
        background: #e0e0e0;
        z-index: 1;
    }
    
    .step.completed:not(:last-child)::after {
        background: #28a745;
    }
    
    .step-number {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #e0e0e0;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-bottom: 8px;
        position: relative;
        z-index: 2;
        transition: all 0.3s ease;
    }
    
    .step.active .step-number {
        background: #007bff;
        color: white;
    }
    
    .step.completed .step-number {
        background: #28a745;
        color: white;
    }
    
    .step.completed .step-number::after {
        content: '✓';
        position: absolute;
    }
    
    .step-title {
        font-size: 0.9em;
        color: #666;
        text-align: center;
        font-weight: 500;
    }
    
    .step.active .step-title {
        color: #007bff;
        font-weight: 600;
    }
    
    .step.completed .step-title {
        color: #28a745;
    }
    
    .progress-container {
        background: #f0f0f0;
        height: 4px;
        border-radius: 2px;
        margin-bottom: 40px;
        overflow: hidden;
    }
    
    #progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #007bff, #0056b3);
        width: 0%;
        transition: width 0.5s ease;
    }
    
    /* Form navigation buttons */
    .form-navigation {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
    }
    
    .prev-btn, .next-btn, .submit-btn {
        padding: 12px 30px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .prev-btn {
        background: #6c757d;
        color: white;
    }
    
    .prev-btn:hover {
        background: #545b62;
    }
    
    .next-btn {
        background: #007bff;
        color: white;
        margin-left: auto;
    }
    
    .next-btn:hover {
        background: #0056b3;
    }
    
    .submit-btn {
        background: #28a745;
        color: white;
        margin-left: auto;
    }
    
    .submit-btn:hover {
        background: #1e7e34;
    }
    
    .submit-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
    }
    
    /* Error messages */
    .error-message {
        color: #dc3545;
        font-size: 0.875em;
        margin-top: 5px;
        display: none;
    }
    
    /* Summary styling */
    .summary-section {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }
    
    .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #e9ecef;
    }
    
    .summary-item:last-child {
        border-bottom: none;
    }
    
    .summary-total {
        display: flex;
        justify-content: space-between;
        padding: 15px 0 0 0;
        border-top: 2px solid #28a745;
        margin-top: 15px;
        font-size: 1.2em;
        font-weight: bold;
        color: #28a745;
    }
    
    .label {
        color: #555;
    }

    .package-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin: 15px 0;
    }
    
    .package-card {
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        padding: 20px;
        background: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .package-card:hover {
        border-color: #007bff;
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,123,255,0.2);
    }
    
    .package-card.selected {
        border-color: #28a745;
        background: #f8fff9;
        box-shadow: 0 4px 15px rgba(40,167,69,0.2);
    }
    
    .package-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .package-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.4em;
    }
    
    .package-price {
        font-size: 1.5em;
        font-weight: bold;
        color: #28a745;
    }
    
    .package-description {
        margin-bottom: 15px;
        color: #666;
    }
    
    .package-features ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .package-features li {
        padding: 5px 0;
        border-bottom: 1px solid #f0f0f0;
        color: #555;
    }
    
    .package-features li:last-child {
        border-bottom: none;
    }
    
    .package-features li:before {
        content: "✓ ";
        color: #28a745;
        font-weight: bold;
        margin-right: 8px;
    }

    .booking-message {
        padding: 10px;
        margin: 10px 0;
        border-radius: 5px;
        font-weight: bold;
    }
    
    .booking-message.success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .booking-message.error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f1b2b8;
    }
    
    .availability-message {
        padding: 8px;
        margin: 5px 0;
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: bold;
    }
    
    .availability-message.success {
        background-color: #d4edda;
        color: #155724;
    }
    
    .availability-message.error {
        background-color: #f8d7da;
        color: #721c24;
    }
    
    /* Flatpickr custom styling */
    .flatpickr-calendar {
        box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
        border-radius: 8px !important;
    }
    
    .flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange {
        background: #007bff !important;
        border-color: #007bff !important;
    }
    
    /* Time select styling */
    #party-time {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 16px;
        background: white;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
        .step-indicator {
            flex-direction: column;
            gap: 20px;
        }
        
        .step:not(:last-child)::after {
            display: none;
        }
        
        .package-grid {
            grid-template-columns: 1fr;
        }
        
        .step-title {
            font-size: 0.8em;
        }
    }
`;
document.head.appendChild(style);

// Initialize form navigation
function initializeFormNavigation() {
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const submitBtn = document.querySelector('.submit-btn');
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateCurrentStep()) {
                nextStep();
            }
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevStep);
    }
    
    updateStepDisplay();
}

// Validate current step
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        case 4:
            return validateStep4();
        default:
            return true;
    }
}

// Validate Step 1: Event Details
function validateStep1() {
    let valid = true;
    
    // Location validation
    const location = document.getElementById('location').value;
    if (!location) {
        showFieldError('location-error', 'Please select a location');
        valid = false;
        } else {
        clearFieldError('location-error');
    }
    
    // Package validation
    if (!selectedPackage) {
        showFieldError('package-error', 'Please select a package');
        valid = false;
    } else {
        clearFieldError('package-error');
    }
    
    // Date validation
    const partyDate = document.getElementById('party-date').value;
    if (!partyDate) {
        showFieldError('party-date-error', 'Please select a party date');
        valid = false;
    } else {
        clearFieldError('party-date-error');
    }
    
    // Time validation
    const partyTime = document.getElementById('party-time').value;
    if (!partyTime) {
        showFieldError('party-time-error', 'Please select a party time');
        valid = false;
    } else {
        clearFieldError('party-time-error');
    }
    
    return valid;
}

// Validate Step 2: Guest Details
function validateStep2() {
    let valid = true;
    
    const childName = document.getElementById('child-name').value.trim();
    if (!childName) {
        showFieldError('child-name-error', 'Please enter the child\'s name');
        valid = false;
    } else {
        clearFieldError('child-name-error');
    }
    
    const childAge = document.getElementById('child-age').value;
    if (!childAge || childAge < 1 || childAge > 16) {
        showFieldError('child-age-error', 'Please enter a valid age (1-16)');
        valid = false;
    } else {
        clearFieldError('child-age-error');
    }
    
    const numGuests = document.getElementById('num-guests').value;
    if (!numGuests || numGuests < 5 || numGuests > 50) {
        showFieldError('num-guests-error', 'Please enter number of guests (5-50)');
        valid = false;
    } else {
        clearFieldError('num-guests-error');
    }
    
    return valid;
}

// Validate Step 3: Contact Information
function validateStep3() {
    let valid = true;
    
    const parentName = document.getElementById('parent-name').value.trim();
    if (!parentName) {
        showFieldError('parent-name-error', 'Please enter parent/guardian name');
        valid = false;
    } else {
        clearFieldError('parent-name-error');
    }
    
    const email = document.getElementById('email').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showFieldError('email-error', 'Please enter a valid email address');
        valid = false;
    } else {
        clearFieldError('email-error');
    }
    
    const phone = document.getElementById('phone').value.trim();
    if (!phone) {
        showFieldError('phone-error', 'Please enter a phone number');
        valid = false;
    } else {
        clearFieldError('phone-error');
    }
    
    const terms = document.getElementById('terms').checked;
    if (!terms) {
        showFieldError('terms-error', 'Please agree to the terms and conditions');
        valid = false;
    } else {
        clearFieldError('terms-error');
    }
    
    return valid;
}

// Validate Step 4: Payment
function validateStep4() {
    return validatePaymentStep();
}

// Show field error
function showFieldError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Clear field error
function clearFieldError(errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Go to next step
async function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateStepDisplay();
        
        // Initialize payment when entering payment step
        if (currentStep === 4) {
            await initializePaymentStep();
        }
        
        // Update summary when entering review step
        if (currentStep === 5) {
            updateSummary();
        }
    }
}

// Go to previous step
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

// Update step display
function updateStepDisplay() {
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // Update form steps
    document.querySelectorAll('.form-step').forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // Update navigation buttons
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const submitBtn = document.querySelector('.submit-btn');
    
    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    }
    
    if (nextBtn) {
        nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
    }
}

// Update summary
function updateSummary() {
    // Location
    const locationSelect = document.getElementById('location');
    const locationText = locationSelect.options[locationSelect.selectedIndex].text;
    document.getElementById('summary-location').textContent = locationText;
    
    // Package
    if (selectedPackage) {
        document.getElementById('summary-package').textContent = selectedPackage.name;
        
        // Get number of children and calculate total price
        const numChildren = parseInt(document.getElementById('num-guests').value) || 1;
        const totalPrice = parseFloat(selectedPackage.price) * numChildren;
        document.getElementById('summary-price').textContent = `€${totalPrice.toFixed(2)}`;
    }
    
    // Date and Time
    const partyDate = document.getElementById('party-date').value;
    const partyTimeSelect = document.getElementById('party-time');
    const partyTimeText = partyTimeSelect.options[partyTimeSelect.selectedIndex].text;
    document.getElementById('summary-datetime').textContent = `${partyDate} at ${partyTimeText}`;
    
    // Guests
    const numGuests = document.getElementById('num-guests').value;
    document.getElementById('summary-guests').textContent = `${numGuests} children`;
    
    // Update total price calculation
    updateTotalPrice();
}

// Initialize payment step
async function initializePaymentStep() {
    console.log('Initializing payment step...');
    
    if (!selectedPackage) {
        showMessage('❌ Please select a package first', 'error');
        return;
    }
    
    try {
        // Get the number of guests and calculate total
        const numGuests = parseInt(document.getElementById('num-guests').value) || 1;
        const totalAmount = updatePaymentSummary(selectedPackage, numGuests);
        
        console.log(`Payment details: Package: ${selectedPackage.name}, Guests: ${numGuests}, Total: €${totalAmount}`);
        
        // Check if payment element container exists
        const paymentElementContainer = document.getElementById('payment-element');
        if (!paymentElementContainer) {
            console.error('Payment element container not found');
            showMessage('❌ Payment interface not available on this page', 'error');
            return;
        }
        
        // Show loading state
        paymentElementContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Initializing payment system...</div>';
        
        // Initialize Stripe payment elements
        const result = await initializeStripePayment(totalAmount);
        
        if (!result.success) {
            console.error('Failed to initialize Stripe payment:', result.error);
            
            // Show user-friendly error message
            if (result.error.includes('fetch') || result.error.includes('network') || result.error.includes('Load failed')) {
                paymentElementContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; border: 2px solid #ffc107; border-radius: 8px; background: #fff3cd; color: #856404;">
                        <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Payment System Temporarily Unavailable</h4>
                        <p style="margin: 0 0 15px 0;">Our payment system is currently being updated. You can still proceed with your booking and we'll contact you to arrange payment.</p>
                        <button onclick="proceedWithoutPayment()" class="button" style="background: #28a745; margin-top: 10px;">
                            Continue Without Payment
                        </button>
                    </div>
                `;
            } else {
                paymentElementContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; border: 2px solid #dc3545; border-radius: 8px; background: #f8d7da; color: #721c24;">
                        <h4 style="margin: 0 0 10px 0; color: #721c24;">❌ Payment Error</h4>
                        <p style="margin: 0;">${result.error}</p>
                        <button onclick="location.reload()" class="button" style="margin-top: 10px;">
                            Refresh Page
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        console.log('Payment step initialized successfully');
        
        // Add payment errors container if it doesn't exist
        if (!document.getElementById('payment-errors')) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'payment-errors';
            errorDiv.style.display = 'none';
            errorDiv.style.color = '#dc3545';
            errorDiv.style.marginTop = '10px';
            errorDiv.style.padding = '10px';
            errorDiv.style.border = '1px solid #dc3545';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.backgroundColor = '#f8d7da';
            paymentElementContainer.parentNode.insertBefore(errorDiv, paymentElementContainer.nextSibling);
        }
        
    } catch (error) {
        console.error('Error initializing payment step:', error);
        
        const paymentElementContainer = document.getElementById('payment-element');
        if (paymentElementContainer) {
            paymentElementContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; border: 2px solid #dc3545; border-radius: 8px; background: #f8d7da; color: #721c24;">
                    <h4 style="margin: 0 0 10px 0; color: #721c24;">❌ Payment System Error</h4>
                    <p style="margin: 0 0 15px 0;">There was an error loading the payment system: ${error.message}</p>
                    <button onclick="location.reload()" class="button" style="margin-top: 10px;">
                        Refresh Page
                    </button>
                </div>
            `;
        }
        
        showMessage('❌ Failed to initialize payment: ' + error.message, 'error');
    }
}

// Function to proceed without payment (for offline bookings)
window.proceedWithoutPayment = function() {
    console.log('Proceeding without payment...');
    
    const paymentElementContainer = document.getElementById('payment-element');
    if (paymentElementContainer) {
        paymentElementContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; border: 2px solid #28a745; border-radius: 8px; background: #d4edda; color: #155724;">
                <h4 style="margin: 0 0 10px 0; color: #155724;">✅ Booking Will Be Processed Manually</h4>
                <p style="margin: 0;">Your booking details will be saved and we'll contact you within 24 hours to arrange payment and confirm your party.</p>
            </div>
        `;
    }
    
    // Mark that we're proceeding without payment
    window.skipPayment = true;
    
    // Enable the submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Booking (Payment Later)';
    }
}
