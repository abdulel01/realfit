import { supabase } from './supabase.js';

// Admin configuration
const ADMIN_EMAIL = 'ace@icloud.com';

// Global state
let currentSection = 'dashboard';
let currentDate = new Date().toISOString().split('T')[0];
let currentLocationId = null;

// Enhanced error tracking
let initializationErrors = [];
let connectionStatus = 'unknown';

// Test Supabase connection immediately
console.log('🔍 Testing Supabase connection...');
(async () => {
    try {
        const { data, error } = await supabase.from('bookings').select('count', { count: 'exact', head: true });
        if (error) {
            connectionStatus = 'error';
            console.error('❌ Supabase connection failed:', error);
        } else {
            connectionStatus = 'connected';
            console.log('✅ Supabase connection successful!');
        }
    } catch (err) {
        connectionStatus = 'error';
        console.error('❌ Supabase connection test failed:', err);
    }
})();

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin dashboard initializing...');
    console.log('📊 Connection status:', connectionStatus);
    
    try {
        // Wait a moment for connection test to complete
        if (connectionStatus === 'unknown') {
            console.log('⏳ Waiting for connection test...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (connectionStatus === 'error') {
            throw new Error('Supabase connection failed. Please check your internet connection and Supabase configuration.');
        }
        
        // Check authentication first
        console.log('Step 1: Checking authentication...');
        await checkAuthentication();
        
        // Initialize the dashboard
        console.log('Step 2: Initializing dashboard...');
        await initializeDashboard();
    
    // Set up event listeners
        console.log('Step 3: Setting up event listeners...');
    setupEventListeners();
        
        // Load initial data
        console.log('Step 4: Loading initial data...');
        await loadDashboardData();
        
        // Set up real-time subscriptions
        console.log('Step 5: Setting up real-time subscriptions...');
        setupRealTimeSubscriptions();
        
        console.log('✅ Admin dashboard initialization complete!');
        
        // Show success message
        showAlert('Admin dashboard loaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Admin dashboard initialization failed:', error);
        initializationErrors.push(error.message);
        
        // Show detailed error information
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-banner';
        errorDiv.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 1rem; margin: 1rem; border-radius: 5px; border-left: 4px solid #dc3545;">
                <h3>🚨 Dashboard Initialization Failed</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Connection Status:</strong> ${connectionStatus}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                <details>
                    <summary>🔧 Troubleshooting Steps</summary>
                    <ol>
                        <li>Check your internet connection</li>
                        <li>Verify Supabase is accessible: <a href="https://annyssisoigjibiocyzu.supabase.co" target="_blank">Test Supabase URL</a></li>
                        <li>Try the <a href="supabase-test.html" target="_blank">Supabase Diagnostic Tool</a></li>
                        <li>Check browser console for additional errors</li>
                        <li>Refresh the page</li>
                    </ol>
                </details>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Retry
                </button>
                <button onclick="window.open('supabase-test.html', '_blank')" style="margin-top: 1rem; margin-left: 0.5rem; padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔧 Run Diagnostics
                </button>
            </div>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Real-time subscriptions
function setupRealTimeSubscriptions() {
    console.log('🔄 Setting up real-time subscriptions...');
    
    // Subscribe to bookings changes
    supabase
        .channel('admin-bookings')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'bookings' },
            (payload) => {
                console.log('📊 Live booking update:', payload);
                loadDashboardData();
                if (document.getElementById('bookings-section').classList.contains('active')) {
                    loadBookingsData();
                }
            }
        )
        .subscribe();
        
    console.log('✅ Real-time subscriptions activated');
}

// Authentication check
async function checkAuthentication() {
    try {
        console.log('🔐 Checking authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            // For development, skip auth temporarily
            console.log('⚠️ Skipping auth for development mode');
            return;
        }
        
        if (!session?.user) {
            console.log('⚠️ No user session found, skipping auth for development');
            return;
        }
        
        if (session.user.email !== ADMIN_EMAIL) {
            console.log('⚠️ User not admin, but allowing for development');
            // Don't redirect in development
            return;
        }
        
        console.log('✅ Admin authenticated:', session.user.email);
    } catch (error) {
        console.error('Authentication error:', error);
        // Don't redirect on error for development
        console.log('⚠️ Auth error, continuing in development mode');
    }
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// Initialize dashboard
async function initializeDashboard() {
    // Load locations for time slots
    await loadLocationsForTimeSlots();
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.onclick.toString().match(/showSection\('(.+?)'\)/)?.[1];
            if (section) {
                showSection(section);
            }
        });
    });
    
    // User menu logout
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                await supabase.auth.signOut();
                redirectToLogin();
            }
        });
    }
}

// Navigation functions
window.showSection = function(sectionName) {
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[onclick*="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Update header title
    const headerTitle = document.querySelector('.header-title');
    const titles = {
        'dashboard': 'Dashboard',
        'bookings': 'Bookings Management',
        'packages': 'Packages Management',
        'locations': 'Locations Management',
        'timeslots': 'Time Slots Management'
    };
    headerTitle.textContent = titles[sectionName] || 'Dashboard';
    
    // Show/hide sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Load section-specific data
        loadSectionData(sectionName);
    }
};

// Load section-specific data
async function loadSectionData(sectionName) {
    try {
        console.log(`📋 Loading section data for: ${sectionName}`);
        
        switch (sectionName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'bookings':
                await loadBookingsData();
                break;
            case 'packages':
                await loadPackagesData();
                break;
            case 'locations':
                await loadLocationsData();
                break;
            case 'timeslots':
                await loadLocationsForTimeSlots();
                await loadTimeSlots();
                break;
            default:
                console.warn(`Unknown section: ${sectionName}`);
        }
        
        console.log(`✅ Section data loaded for: ${sectionName}`);
    } catch (error) {
        console.error(`❌ Error loading section ${sectionName}:`, error);
        showAlert(`Error loading ${sectionName}: ${error.message}`, 'error');
    }
}

// Dashboard functions
async function loadDashboardData() {
    try {
        console.log('🔄 Loading dashboard data...');
        
        // Get total bookings
        const { count: totalBookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });
        
        if (bookingsError) {
            console.error('Error loading bookings count:', bookingsError);
        }
        
        // Get total revenue
        const { data: revenueData, error: revenueError } = await supabase
            .from('bookings')
            .select('total_price')
            .in('status', ['confirmed', 'completed']);
        
        if (revenueError) {
            console.error('Error loading revenue data:', revenueError);
        }
        
        const totalRevenue = revenueData?.reduce((sum, booking) => 
            sum + (parseFloat(booking.total_price) || 0), 0) || 0;
        
        // Get pending bookings
        const { count: pendingBookings, error: pendingError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (pendingError) {
            console.error('Error loading pending bookings:', pendingError);
        }
        
        // Get unique customers
        const { data: customerData, error: customerError } = await supabase
            .from('bookings')
            .select('email')
            .not('email', 'is', null);
        
        if (customerError) {
            console.error('Error loading customer data:', customerError);
        }
        
        const uniqueCustomers = new Set(customerData?.map(b => b.email) || []).size;
        
        // Update stats with fallback values
        const totalBookingsEl = document.getElementById('total-bookings');
        const totalRevenueEl = document.getElementById('total-revenue');
        const pendingBookingsEl = document.getElementById('pending-bookings');
        const totalCustomersEl = document.getElementById('total-customers');
        
        if (totalBookingsEl) totalBookingsEl.textContent = totalBookings || 0;
        if (totalRevenueEl) totalRevenueEl.textContent = `€${totalRevenue.toFixed(2)}`;
        if (pendingBookingsEl) pendingBookingsEl.textContent = pendingBookings || 0;
        if (totalCustomersEl) totalCustomersEl.textContent = uniqueCustomers;
        
        // Load recent bookings
        await loadRecentBookings();
        
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showAlert('Error loading dashboard data: ' + error.message, 'error');
    }
}

async function loadRecentBookings() {
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                packages (name),
                locations (name)
            `)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const container = document.getElementById('recent-bookings');
        
        if (!container) {
            console.error('Recent bookings container not found');
            return;
        }
    
    if (!bookings || bookings.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 2rem; color: #64748b;">No recent bookings found.</p>';
        return;
    }
    
        const table = `
            <div class="table-container">
                <table class="table">
            <thead>
                        <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Package</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                            <tr>
                                <td>#${booking.id}</td>
                                <td>${booking.parent_name || 'N/A'}</td>
                                <td>${booking.packages?.name || 'N/A'}</td>
                                <td>${booking.locations?.name || 'N/A'}</td>
                                <td>${formatDate(booking.booking_date)}</td>
                                <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
                                <td>€${booking.total_price || '0.00'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
            </div>
        `;
        
        container.innerHTML = table;
    } catch (error) {
        console.error('Error loading recent bookings:', error);
        const container = document.getElementById('recent-bookings');
        if (container) {
            container.innerHTML = '<p class="text-center text-danger">Error loading recent bookings: ' + error.message + '</p>';
        }
    }
}

// Bookings functions
async function loadBookingsData() {
    try {
        const container = document.getElementById('bookings-table');
        if (!container) {
            console.error('Bookings table container not found');
            return;
        }
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner spinner"></i>Loading bookings...</div>';
        
        console.log('🔄 Loading all bookings...');
        
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                packages (name),
                locations (name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('📊 Loaded bookings:', bookings?.length || 0);
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 2rem; color: #64748b;">No bookings found.</p>';
            return;
        }
        
        const table = `
            <div class="table-container">
                <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Package</th>
                            <th>Location</th>
                            <th>Date & Time</th>
                            <th>Guests</th>
                        <th>Status</th>
                            <th>Total</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                    <tbody>
                        ${bookings.map(booking => `
                            <tr>
                                <td>#${booking.id}</td>
                                <td>${booking.parent_name || 'N/A'}</td>
                                <td>${booking.email || 'N/A'}</td>
                                <td>${booking.packages?.name || 'N/A'}</td>
                                <td>${booking.locations?.name || 'N/A'}</td>
                                <td>${formatDateTime(booking.booking_date, booking.booking_time)}</td>
                                <td>${booking.num_children || 0}</td>
                                <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
                                <td>€${booking.total_price || '0.00'}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="action-btn view" onclick="viewBooking(${booking.id})" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="action-btn edit" onclick="editBooking(${booking.id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn delete" onclick="deleteBooking(${booking.id})" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                </td>
            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = table;
        } catch (error) {
        console.error('❌ Error loading bookings:', error);
        const container = document.getElementById('bookings-table');
        container.innerHTML = `<p class="text-center text-danger">Error loading bookings: ${error.message}</p>`;
    }
}

// Packages functions
async function loadPackagesData() {
    try {
        const container = document.getElementById('packages-table');
        if (!container) {
            console.error('Packages table container not found');
            return;
        }
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner spinner"></i>Loading packages...</div>';
        
        const { data: packages, error } = await supabase
            .from('packages')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        if (!packages || packages.length === 0) {
            container.innerHTML = '<p class="text-center">No packages found.</p>';
            return;
        }
        
        const table = `
            <div class="table-container">
                <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                            <th>Age Range</th>
                        <th>Price</th>
                            <th>Min Guests</th>
                            <th>Max Guests</th>
                            <th>Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                    <tbody>
                        ${packages.map(pkg => `
                            <tr>
                                <td><strong>${pkg.name}</strong></td>
                                <td>${pkg.description || 'N/A'}</td>
                                <td>${pkg.age_range || 'N/A'}</td>
                                <td>€${pkg.price || '0.00'}</td>
                                <td>${pkg.min_children || 'N/A'}</td>
                                <td>${pkg.max_children || 'N/A'}</td>
                                <td><span class="status-badge ${pkg.is_active ? 'confirmed' : 'cancelled'}">${pkg.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="action-btn edit" onclick="editPackage(${pkg.id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn delete" onclick="deletePackage(${pkg.id})" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
        container.innerHTML = table;
    } catch (error) {
        console.error('Error loading packages:', error);
        showAlert('Error loading packages: ' + error.message, 'error');
    }
}

// Locations functions
async function loadLocationsData() {
    try {
        const container = document.getElementById('locations-table');
        if (!container) {
            console.error('Locations table container not found');
        return;
    }
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner spinner"></i>Loading locations...</div>';
        
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        if (!locations || locations.length === 0) {
            container.innerHTML = '<p class="text-center">No locations found.</p>';
        return;
    }
    
        const table = `
            <div class="table-container">
                <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Phone</th>
                            <th>Email</th>
                            <th>Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                    <tbody>
                        ${locations.map(location => `
                            <tr>
                                <td><strong>${location.name}</strong></td>
                                <td>${location.address}</td>
                                <td>${location.phone || 'N/A'}</td>
                                <td>${location.email || 'N/A'}</td>
                                <td><span class="status-badge ${location.is_active ? 'confirmed' : 'cancelled'}">${location.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="action-btn edit" onclick="editLocation(${location.id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn delete" onclick="deleteLocation(${location.id})" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
        container.innerHTML = table;
    } catch (error) {
        console.error('Error loading locations:', error);
        showAlert('Error loading locations: ' + error.message, 'error');
    }
}

// Time slots functions
async function loadLocationsForTimeSlots() {
    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        const select = document.getElementById('timeslot-location');
        if (select) {
            select.innerHTML = '<option value="">Select a location...</option>';
            locations?.forEach(location => {
                select.innerHTML += `<option value="${location.id}">${location.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        showAlert('Error loading locations: ' + error.message, 'error');
    }
}

async function loadTimeSlots() {
    const locationId = document.getElementById('timeslot-location').value;
    const date = document.getElementById('timeslot-date').value;
    
    const container = document.getElementById('timeslots-display');
    if (!container) {
        console.error('Timeslots display container not found');
        return;
    }
    
    if (!locationId) {
        container.innerHTML = 
            '<div class="empty-state"><i class="fas fa-map-marker-alt"></i><h3>Select a Location</h3><p>Choose a location to view and manage time slots</p></div>';
        return;
    }
    
    try {
        container.innerHTML = 
            '<div class="loading"><i class="fas fa-spinner spinner"></i>Loading time slots...</div>';
        
        // Get location name for display
        const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
        
        // Get all time slots for the location
        const { data: timeSlots, error: slotsError } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .order(['day_of_week', 'start_time']);
        
        if (slotsError) throw slotsError;
        
        // Get existing bookings for selected date
        let bookedTimes = [];
        let bookingCounts = {};
        if (date) {
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('booking_time, num_children')
                .eq('location_id', locationId)
                .eq('booking_date', date)
                .eq('status', 'confirmed');
            
            if (bookingsError) throw bookingsError;
            
            bookings?.forEach(booking => {
                bookedTimes.push(booking.booking_time);
                bookingCounts[booking.booking_time] = (bookingCounts[booking.booking_time] || 0) + booking.num_children;
            });
        }
        
        if (!timeSlots || timeSlots.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No Time Slots Found</h3>
                    <p>No time slots are configured for ${location?.name || 'this location'}</p>
                    <button class="btn btn-primary" onclick="openAddTimeSlotModal()">
                        <i class="fas fa-plus"></i> Add First Time Slot
                    </button>
                </div>
            `;
            return;
        }
        
        // Group time slots by day of week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const groupedSlots = {};
        
        timeSlots.forEach(slot => {
            const dayName = dayNames[slot.day_of_week];
            if (!groupedSlots[dayName]) {
                groupedSlots[dayName] = [];
            }
            groupedSlots[dayName].push(slot);
        });
        
        // Create enhanced time slots display
        let slotsHtml = `
            <div class="timeslots-header">
                <div class="timeslots-title">
                    <h3><i class="fas fa-map-marker-alt"></i> ${location?.name || 'Location'}</h3>
                    ${date ? `<span class="date-badge"><i class="fas fa-calendar"></i> ${formatDateLong(date)}</span>` : ''}
                </div>
                <div class="timeslots-stats">
                    <div class="stat-item">
                        <span class="stat-value">${timeSlots.length}</span>
                        <span class="stat-label">Total Slots</span>
            </div>
                    <div class="stat-item">
                        <span class="stat-value">${timeSlots.filter(s => s.is_available).length}</span>
                        <span class="stat-label">Available</span>
            </div>
                    ${date ? `
                        <div class="stat-item">
                            <span class="stat-value">${bookedTimes.length}</span>
                            <span class="stat-label">Booked ${formatDate(date)}</span>
                </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Sort days to show in proper order (Monday first)
        const sortedDays = Object.keys(groupedSlots).sort((a, b) => {
            const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            return order.indexOf(a) - order.indexOf(b);
        });
        
        sortedDays.forEach(dayName => {
            const daySlots = groupedSlots[dayName];
            const dayIndex = dayNames.indexOf(dayName);
            const availableCount = daySlots.filter(s => s.is_available).length;
            const totalCount = daySlots.length;
            
            slotsHtml += `
                <div class="day-section">
                    <div class="day-header">
                        <div class="day-title">
                            <h4>${dayName}</h4>
                            <span class="day-stats">${availableCount}/${totalCount} available</span>
                </div>
                        <div class="day-actions">
                            <button class="btn btn-sm btn-outline" onclick="addTimeSlotForDay(${dayIndex}, '${dayName}')">
                                <i class="fas fa-plus"></i> Add Slot
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="toggleDaySlots(${dayIndex}, '${dayName}')">
                                <i class="fas fa-toggle-on"></i> Toggle All
                            </button>
                </div>
            </div>
                    <div class="time-slots-table" ${date ? 'data-has-bookings="true"' : ''}>
                        <div class="table-header">
                            <div>Time</div>
                            <div>Status</div>
                            ${date ? '<div>Bookings</div>' : ''}
                            <div>Actions</div>
                </div>
                        ${daySlots.map(slot => {
                            const slotTime = slot.start_time.substring(0, 5);
                            const isBooked = date && bookedTimes.includes(slotTime);
                            const bookingCount = bookingCounts[slotTime] || 0;
                            const statusClass = slot.is_available ? (isBooked ? 'booked' : 'available') : 'unavailable';
                            const statusText = slot.is_available ? (isBooked ? 'Booked' : 'Available') : 'Disabled';
                            const statusIcon = slot.is_available ? (isBooked ? 'calendar-check' : 'check-circle') : 'times-circle';
                            
                            return `
                                <div class="table-row ${statusClass}" style="grid-template-columns: ${date ? '2fr 1.5fr 1.5fr 1.5fr' : '2fr 1.5fr 1fr 1.5fr'}">
                                    <div class="time-cell">
                                        <strong>${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</strong>
                </div>
                                    <div class="status-cell">
                                        <span class="status-indicator ${statusClass}">
                                            <i class="fas fa-${statusIcon}"></i>
                                            ${statusText}
                                        </span>
            </div>
                                    ${date ? `
                                        <div class="booking-cell">
                                            ${isBooked ? `
                                                <span class="booking-count">
                                                    <i class="fas fa-users"></i>
                                                    ${bookingCount} ${bookingCount === 1 ? 'child' : 'children'}
                                                </span>
                                            ` : '<span class="no-bookings">No bookings</span>'}
                </div>
                                    ` : ''}
                                    <div class="actions-cell">
                                        <button class="action-btn edit" onclick="editTimeSlot(${slot.id}, '${slot.start_time}', '${slot.end_time}', ${slot.is_available})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn ${slot.is_available ? 'warning' : 'success'}" 
                                                onclick="toggleTimeSlotAvailability(${slot.id}, ${slot.is_available})" 
                                                title="${slot.is_available ? 'Disable' : 'Enable'}">
                                            <i class="fas fa-${slot.is_available ? 'eye-slash' : 'eye'}"></i>
                                        </button>
                                        <button class="action-btn delete" onclick="deleteTimeSlot(${slot.id}, '${formatTime(slot.start_time)}')" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                </div>
            </div>
                            `;
                        }).join('')}
            </div>
            </div>
            `;
        });
        
        container.innerHTML = slotsHtml;
        
        // Update current date display
        updateCurrentDateDisplay(date);
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        container.innerHTML = 
            '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Time Slots</h3><p>' + error.message + '</p></div>';
    }
}

// Make loadTimeSlots available globally
window.loadTimeSlots = loadTimeSlots;

// Date navigation functions
window.goToToday = function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('timeslot-date').value = today;
    loadTimeSlots();
};

window.previousDay = function() {
    const currentDate = document.getElementById('timeslot-date').value;
    if (!currentDate) return;
    
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    const newDate = date.toISOString().split('T')[0];
    document.getElementById('timeslot-date').value = newDate;
    loadTimeSlots();
};

window.nextDay = function() {
    const currentDate = document.getElementById('timeslot-date').value;
    if (!currentDate) return;
    
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 1);
    const newDate = date.toISOString().split('T')[0];
    document.getElementById('timeslot-date').value = newDate;
    loadTimeSlots();
};

// Enhanced time slot management functions
window.addTimeSlotForDay = function(dayIndex, dayName) {
    const locationId = document.getElementById('timeslot-location').value;
    
    if (!locationId) {
        showAlert('Please select a location first', 'warning');
        return;
    }
    
    const modal = createModal('add-day-timeslot-modal', `Add Time Slot for ${dayName}`);
    
    modal.querySelector('.modal-body').innerHTML = `
        <form id="add-day-timeslot-form">
            <div class="alert info">
                <i class="fas fa-info-circle"></i>
                Adding time slot for <strong>${dayName}</strong>
                </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Start Time</label>
                    <input type="time" name="start_time" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">End Time</label>
                    <input type="time" name="end_time" class="form-input" required>
                </div>
            </div>
            
                <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" name="is_available" checked>
                    <span class="checkmark"></span>
                    Available for booking
                </label>
                </div>
            
            <input type="hidden" name="day_of_week" value="${dayIndex}">
        </form>
    `;
    
    modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('add-day-timeslot-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="createDayTimeSlot()">Add Time Slot</button>
    `;
    
    showModal('add-day-timeslot-modal');
};

window.createDayTimeSlot = async function() {
    try {
        const form = document.getElementById('add-day-timeslot-form');
    const formData = new FormData(form);
        const locationId = document.getElementById('timeslot-location').value;
        
        const timeSlotData = {
            location_id: parseInt(locationId),
            day_of_week: parseInt(formData.get('day_of_week')),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            is_available: formData.get('is_available') === 'on'
        };
        
        // Validate times
        if (timeSlotData.start_time >= timeSlotData.end_time) {
            showAlert('End time must be after start time', 'error');
            return;
        }
        
        // Check for overlapping time slots
        const { data: existingSlots, error: checkError } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .eq('day_of_week', timeSlotData.day_of_week);
        
        if (checkError) throw checkError;
        
        const hasOverlap = existingSlots.some(slot => {
            const slotStart = slot.start_time;
            const slotEnd = slot.end_time;
            const newStart = timeSlotData.start_time;
            const newEnd = timeSlotData.end_time;
            
            return (newStart < slotEnd && newEnd > slotStart);
        });
        
        if (hasOverlap) {
            showAlert('Time slot overlaps with existing slot', 'error');
            return;
        }
        
        showAlert('Creating time slot...', 'info');
        
        const { error } = await supabase
            .from('time_slots')
            .insert([timeSlotData]);
        
        if (error) throw error;
        
        closeModal('add-day-timeslot-modal');
        showAlert('Time slot created successfully', 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error creating time slot:', error);
        showAlert('Error creating time slot: ' + error.message, 'error');
    }
};

window.toggleDaySlots = async function(dayIndex, dayName) {
    const locationId = document.getElementById('timeslot-location').value;
    
    try {
        // Get current day slots
        const { data: daySlots, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .eq('day_of_week', dayIndex);
        
        if (error) throw error;
        
        if (!daySlots || daySlots.length === 0) {
            showAlert(`No time slots found for ${dayName}`, 'warning');
            return;
        }
        
        const availableCount = daySlots.filter(s => s.is_available).length;
        const newAvailability = availableCount < daySlots.length / 2; // Enable if less than half are available
        
        const action = newAvailability ? 'enable' : 'disable';
        
        if (!confirm(`Are you sure you want to ${action} all ${daySlots.length} time slots for ${dayName}?`)) {
            return;
        }
        
        showAlert(`${action === 'enable' ? 'Enabling' : 'Disabling'} all slots for ${dayName}...`, 'info');
        
        const { error: updateError } = await supabase
            .from('time_slots')
            .update({ is_available: newAvailability })
            .eq('location_id', locationId)
            .eq('day_of_week', dayIndex);
        
        if (updateError) throw updateError;
        
        showAlert(`All time slots for ${dayName} ${action}d successfully`, 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error toggling day slots:', error);
        showAlert('Error updating time slots: ' + error.message, 'error');
    }
};

window.editTimeSlot = function(slotId, startTime, endTime, isAvailable) {
    const modal = createModal('edit-timeslot-modal', 'Edit Time Slot');
    
    modal.querySelector('.modal-body').innerHTML = `
        <form id="edit-timeslot-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Start Time</label>
                    <input type="time" name="start_time" class="form-input" value="${startTime}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">End Time</label>
                    <input type="time" name="end_time" class="form-input" value="${endTime}" required>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" name="is_available" ${isAvailable ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    Available for booking
                </label>
            </div>
        </form>
    `;
    
    modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('edit-timeslot-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="updateTimeSlot(${slotId})">Save Changes</button>
    `;
    
    showModal('edit-timeslot-modal');
};

window.updateTimeSlot = async function(slotId) {
    try {
        const form = document.getElementById('edit-timeslot-form');
    const formData = new FormData(form);
        
        const updates = {
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            is_available: formData.get('is_available') === 'on'
        };
        
        // Validate times
        if (updates.start_time >= updates.end_time) {
            showAlert('End time must be after start time', 'error');
            return;
        }
        
        showAlert('Updating time slot...', 'info');
        
        const { error } = await supabase
            .from('time_slots')
            .update(updates)
            .eq('id', slotId);
        
        if (error) throw error;
        
        closeModal('edit-timeslot-modal');
        showAlert('Time slot updated successfully', 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error updating time slot:', error);
        showAlert('Error updating time slot: ' + error.message, 'error');
    }
};

window.toggleTimeSlotAvailability = async function(slotId, currentlyAvailable) {
    try {
        const action = currentlyAvailable ? 'disable' : 'enable';
        if (!confirm(`Are you sure you want to ${action} this time slot?`)) {
            return;
        }
        
        showAlert(`${currentlyAvailable ? 'Disabling' : 'Enabling'} time slot...`, 'info');
        
        const { error } = await supabase
            .from('time_slots')
            .update({ is_available: !currentlyAvailable })
            .eq('id', slotId);
        
        if (error) throw error;
        
        showAlert(`Time slot ${currentlyAvailable ? 'disabled' : 'enabled'} successfully`, 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error toggling time slot:', error);
        showAlert('Error updating time slot: ' + error.message, 'error');
    }
};

window.deleteTimeSlot = async function(slotId, timeDisplay) {
    try {
        if (!confirm(`Are you sure you want to DELETE the ${timeDisplay} time slot?\n\nThis action cannot be undone and will:\n• Remove it from the booking form\n• Prevent future bookings at this time\n\nClick OK to permanently delete this time slot.`)) {
            return;
        }
        
        showAlert('Checking for existing bookings...', 'info');
        
        // Get the time slot details first
        const { data: timeSlot, error: slotError } = await supabase
            .from('time_slots')
            .select('start_time, location_id')
            .eq('id', slotId)
            .single();
        
        if (slotError) throw slotError;
        
        // Check if there are any existing bookings for this time slot
        const { data: existingBookings, error: bookingError } = await supabase
            .from('bookings')
            .select('id, booking_date, parent_name')
            .eq('booking_time', timeSlot.start_time.substring(0, 5))
            .eq('location_id', timeSlot.location_id)
            .eq('status', 'confirmed');
        
        if (bookingError) throw bookingError;
        
        if (existingBookings && existingBookings.length > 0) {
            const bookingDetails = existingBookings.map(b => `• ${b.parent_name} on ${formatDate(b.booking_date)}`).join('\n');
            showAlert(`Cannot delete time slot: There are ${existingBookings.length} existing confirmed booking(s) for this time:\n\n${bookingDetails}\n\nPlease contact these customers or wait until their parties are completed.`, 'error');
            return;
        }
        
        showAlert('Deleting time slot...', 'info');
        
        const { error } = await supabase
            .from('time_slots')
            .delete()
            .eq('id', slotId);
        
        if (error) throw error;
        
        showAlert(`Time slot ${timeDisplay} deleted successfully`, 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error deleting time slot:', error);
        showAlert('Error deleting time slot: ' + error.message, 'error');
    }
};

window.openAddTimeSlotModal = function() {
    const locationId = document.getElementById('timeslot-location').value;
    
    if (!locationId) {
        showAlert('Please select a location first', 'warning');
        return;
    }
    
    const modal = createModal('add-timeslot-modal', 'Add New Time Slot');
    
    modal.querySelector('.modal-body').innerHTML = `
        <form id="add-timeslot-form">
            <div class="alert info">
                <i class="fas fa-info-circle"></i>
                Add a new time slot to make it available for customer bookings.
            </div>
            
            <div class="form-group">
                <label class="form-label">Day of Week</label>
                <select name="day_of_week" class="form-select" required>
                    <option value="">Select day...</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                    <option value="0">Sunday</option>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Start Time</label>
                    <input type="time" name="start_time" class="form-input" value="09:00" required>
                </div>
                <div class="form-group">
                    <label class="form-label">End Time</label>
                    <input type="time" name="end_time" class="form-input" value="10:00" required>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" name="is_available" checked>
                    <span class="checkmark"></span>
                    Available for booking immediately
                </label>
            </div>
            
            <div class="alert warning">
                <i class="fas fa-clock"></i>
                <strong>Quick tip:</strong> Use the "Add Slot" buttons next to each day for faster adding.
            </div>
        </form>
    `;
    
    modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('add-timeslot-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="createTimeSlot()">Add Time Slot</button>
    `;
    
    showModal('add-timeslot-modal');
};

window.createTimeSlot = async function() {
    try {
        const form = document.getElementById('add-timeslot-form');
        const formData = new FormData(form);
        const locationId = document.getElementById('timeslot-location').value;
        
        const timeSlotData = {
            location_id: parseInt(locationId),
            day_of_week: parseInt(formData.get('day_of_week')),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            is_available: formData.get('is_available') === 'on'
        };
        
        // Validate times
        if (timeSlotData.start_time >= timeSlotData.end_time) {
            showAlert('End time must be after start time', 'error');
            return;
        }
        
        // Check for overlapping time slots
        const { data: existingSlots, error: checkError } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .eq('day_of_week', timeSlotData.day_of_week);
        
        if (checkError) throw checkError;
        
        const hasOverlap = existingSlots.some(slot => {
            const slotStart = slot.start_time;
            const slotEnd = slot.end_time;
            const newStart = timeSlotData.start_time;
            const newEnd = timeSlotData.end_time;
            
            return (newStart < slotEnd && newEnd > slotStart);
        });
        
        if (hasOverlap) {
            showAlert('Time slot overlaps with existing slot', 'error');
            return;
        }
        
        showAlert('Creating time slot...', 'info');
        
        const { error } = await supabase
            .from('time_slots')
            .insert([timeSlotData]);
        
        if (error) throw error;
        
        closeModal('add-timeslot-modal');
        showAlert('Time slot created successfully', 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error creating time slot:', error);
        showAlert('Error creating time slot: ' + error.message, 'error');
    }
};

window.openBulkToggleModal = function() {
    const locationId = document.getElementById('timeslot-location').value;
    
    if (!locationId) {
        showAlert('Please select a location first', 'warning');
        return;
    }
    
    const modal = createModal('bulk-toggle-modal', 'Bulk Toggle Time Slots');
    
    modal.querySelector('.modal-body').innerHTML = `
        <div class="alert info">
            <i class="fas fa-info-circle"></i>
            This will toggle availability for all time slots at the selected location.
        </div>
        
        <div class="form-group">
            <label class="form-label">Action</label>
            <select id="bulk-action" class="form-select" required>
                <option value="enable">Enable All Time Slots</option>
                <option value="disable">Disable All Time Slots</option>
            </select>
        </div>
        
        <div class="form-group">
            <label class="form-label">Apply to Days</label>
            <div class="checkbox-group">
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="0">
                    <span class="checkmark"></span>
                    Sunday
                </label>
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="1" checked>
                    <span class="checkmark"></span>
                    Monday
                </label>
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="2" checked>
                    <span class="checkmark"></span>
                    Tuesday
                </label>
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="3" checked>
                    <span class="checkmark"></span>
                    Wednesday
                </label>
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="4" checked>
                    <span class="checkmark"></span>
                    Thursday
                </label>
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="5" checked>
                    <span class="checkmark"></span>
                    Friday
                </label>
                <label class="form-checkbox">
                    <input type="checkbox" name="days" value="6">
                    <span class="checkmark"></span>
                    Saturday
                </label>
            </div>
        </div>
    `;
    
    modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('bulk-toggle-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="executeBulkToggle()">Apply Changes</button>
    `;
    
    showModal('bulk-toggle-modal');
};

window.executeBulkToggle = async function() {
    try {
        const action = document.getElementById('bulk-action').value;
        const selectedDays = Array.from(document.querySelectorAll('input[name="days"]:checked'))
            .map(cb => parseInt(cb.value));
        
        if (selectedDays.length === 0) {
            showAlert('Please select at least one day', 'warning');
            return;
        }
        
        const locationId = document.getElementById('timeslot-location').value;
        const isAvailable = action === 'enable';
        
        if (!confirm(`Are you sure you want to ${action} all time slots for the selected days?`)) {
            return;
        }
        
        showAlert(`${action === 'enable' ? 'Enabling' : 'Disabling'} time slots...`, 'info');
        
        const { error } = await supabase
            .from('time_slots')
            .update({ is_available: isAvailable })
            .eq('location_id', locationId)
            .in('day_of_week', selectedDays);
        
        if (error) throw error;
        
        closeModal('bulk-toggle-modal');
        showAlert(`Time slots ${action}d successfully`, 'success');
        await loadTimeSlots();
    } catch (error) {
        console.error('Error in bulk toggle:', error);
        showAlert('Error updating time slots: ' + error.message, 'error');
    }
};

// Modal functions
function createModal(id, title) {
    let modal = document.getElementById(id);
    if (modal) {
        modal.remove();
    }
    
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" onclick="closeModal('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
    }
}

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
};

// Placeholder functions for other modals
window.openAddBookingModal = function() {
    showAlert('Add booking functionality coming soon', 'info');
};

window.openAddPackageModal = function() {
    showAlert('Add package functionality coming soon', 'info');
};

window.openAddLocationModal = function() {
    showAlert('Add location functionality coming soon', 'info');
};

// Filter functions
window.filterBookings = function() {
    showAlert('Filter functionality coming soon', 'info');
};

window.refreshBookings = function() {
    loadBookingsData();
};

// Action functions (placeholders)
window.viewBooking = function(id) {
    showAlert(`View booking #${id} - functionality coming soon`, 'info');
};

window.editBooking = function(id) {
    showAlert(`Edit booking #${id} - functionality coming soon`, 'info');
};

window.deleteBooking = function(id) {
    if (confirm('Are you sure you want to delete this booking?')) {
        showAlert(`Delete booking #${id} - functionality coming soon`, 'info');
    }
};

window.editPackage = function(id) {
    showAlert(`Edit package #${id} - functionality coming soon`, 'info');
};

window.deletePackage = function(id) {
    if (confirm('Are you sure you want to delete this package?')) {
        showAlert(`Delete package #${id} - functionality coming soon`, 'info');
    }
};

window.editLocation = function(id) {
    showAlert(`Edit location #${id} - functionality coming soon`, 'info');
};

window.deleteLocation = function(id) {
    if (confirm('Are you sure you want to delete this location?')) {
        showAlert(`Delete location #${id} - functionality coming soon`, 'info');
    }
};

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IE');
}

function formatDateTime(dateString, timeString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString).toLocaleDateString('en-IE');
    return timeString ? `${date} ${timeString}` : date;
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
}

function formatDateLong(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function updateCurrentDateDisplay(date) {
    const display = document.getElementById('current-date-display');
    if (display) {
        if (date) {
            display.textContent = formatDateLong(date);
        } else {
            display.textContent = 'All days';
        }
    }
}

// Additional time slot utility functions
window.setTodayDate = function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('timeslot-date').value = today;
    loadTimeSlots();
};

window.exportTimeSlots = async function() {
    const locationId = document.getElementById('timeslot-location').value;
    
    if (!locationId) {
        showAlert('Please select a location first', 'warning');
        return;
    }
    
    try {
        const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
        
        const { data: timeSlots } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .order(['day_of_week', 'start_time']);
    
    if (!timeSlots || timeSlots.length === 0) {
            showAlert('No time slots to export', 'warning');
        return;
    }
    
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        let csvContent = 'Day,Start Time,End Time,Available\n';
    timeSlots.forEach(slot => {
            csvContent += `${dayNames[slot.day_of_week]},${slot.start_time},${slot.end_time},${slot.is_available ? 'Yes' : 'No'}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${location?.name || 'location'}_timeslots.csv`;
        a.click();
        
        showAlert('Time slots exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting time slots:', error);
        showAlert('Error exporting time slots: ' + error.message, 'error');
    }
};

// Placeholder functions to prevent JS errors
window.viewBooking = function(id) {
    showAlert('View booking functionality coming soon', 'info');
};

window.editBooking = function(id) {
    showAlert('Edit booking functionality coming soon', 'info');
};

window.deleteBooking = function(id) {
    if (confirm('Are you sure you want to delete this booking?')) {
        showAlert('Delete booking functionality coming soon', 'info');
    }
};

window.editPackage = function(id) {
    showAlert('Edit package functionality coming soon', 'info');
};

window.deletePackage = function(id) {
    if (confirm('Are you sure you want to delete this package?')) {
        showAlert('Delete package functionality coming soon', 'info');
    }
};

window.editLocation = function(id) {
    showAlert('Edit location functionality coming soon', 'info');
};

window.deleteLocation = function(id) {
    if (confirm('Are you sure you want to delete this location?')) {
        showAlert('Delete location functionality coming soon', 'info');
    }
};

window.openAddBookingModal = function() {
    showAlert('Add booking functionality coming soon', 'info');
};

window.openAddPackageModal = function() {
    showAlert('Add package functionality coming soon', 'info');
};

window.openAddLocationModal = function() {
    showAlert('Add location functionality coming soon', 'info');
};

window.filterBookings = function() {
    loadBookingsData();
};

window.refreshBookings = function() {
    loadBookingsData();
};

// Date navigation functions for time slots
window.previousDay = function() {
    const dateInput = document.getElementById('timeslot-date');
    if (dateInput.value) {
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() - 1);
        dateInput.value = currentDate.toISOString().split('T')[0];
        loadTimeSlots();
    }
};

window.nextDay = function() {
    const dateInput = document.getElementById('timeslot-date');
    if (dateInput.value) {
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() + 1);
        dateInput.value = currentDate.toISOString().split('T')[0];
        loadTimeSlots();
    }
};

// Alert system
function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    if (!container) return;
    
    const alertId = 'alert-' + Date.now();
    
    const alertColors = {
        'success': 'success',
        'error': 'error',
        'warning': 'warning',
        'info': 'info'
    };
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert ${alertColors[type] || 'info'}`;
    alert.style.cssText = `
        padding: 1rem;
        margin-bottom: 0.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="hideAlert('${alertId}')" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 1rem;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(alert);
    
    // Auto-hide after 5 seconds
    setTimeout(() => hideAlert(alertId), 5000);
}

function hideAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }
}

window.hideAlert = hideAlert;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✅ Admin dashboard loaded successfully'); 