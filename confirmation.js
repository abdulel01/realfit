// Confirmation page script
console.log("Confirmation page loaded, starting data retrieval...");

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM loaded, checking for booking data...");
    
    try {
        // Check for booking data in sessionStorage first
        const bookingDataString = sessionStorage.getItem('bookingData');
        let bookingData = null;
        
        console.log("SessionStorage booking data:", bookingDataString);
        
        if (bookingDataString) {
            try {
                bookingData = JSON.parse(bookingDataString);
                console.log("Successfully parsed booking data from sessionStorage:", bookingData);
            } catch (parseError) {
                console.error("Error parsing sessionStorage data:", parseError);
            }
        } else {
            console.log("No sessionStorage data found, checking URL parameters...");
            // Fallback: Try to get booking ID from URL and fetch from database
            const urlParams = new URLSearchParams(window.location.search);
            const bookingId = urlParams.get('bookingId');
            
            if (bookingId) {
                console.log("Fetching booking details for ID:", bookingId);
                try {
                    // Use global supabase client to fetch booking
                    const { data, error } = await supabase
                        .from('bookings')
                        .select(`
                            *,
                            locations (name),
                            packages (name)
                        `)
                        .eq('id', bookingId)
                        .single();
                    
                    if (error) {
                        console.error("Supabase error:", error);
                    } else if (data) {
                        bookingData = data;
                        console.log("Retrieved booking data from database:", bookingData);
                    }
                } catch (error) {
                    console.error("Error fetching booking from database:", error);
                }
            }
        }
        
        if (bookingData) {
            console.log("Found booking data, populating confirmation page:", bookingData);
            populateConfirmationFields(bookingData);
        } else {
            // Handle case where no booking details are found
            console.error("No booking data found in sessionStorage or database");
            
            // For debugging: Try to populate with test data if available
            const urlParams = new URLSearchParams(window.location.search);
            const bookingId = urlParams.get('bookingId');
            
            // Last resort: Try one more time to fetch from database with simpler query
            if (bookingId) {
                console.log("Making final attempt to fetch from database with basic query...");
                try {
                    const { data: basicData, error: basicError } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('id', bookingId)
                        .single();
                    
                    if (!basicError && basicData) {
                        console.log("✅ Basic database fetch successful:", basicData);
                        bookingData = basicData;
                        
                        // Manually populate the fields with basic data
                        populateConfirmationFields(bookingData);
                        return; // Exit here if successful
                    }
                } catch (finalError) {
                    console.error("Final database attempt failed:", finalError);
                }
            }
            
            const detailsContainer = document.querySelector('.confirmation-details');
            if (detailsContainer) {
                detailsContainer.innerHTML = `
                    <h3>Booking Details Not Found</h3>
                    <p>It seems there was an issue retrieving your booking details. Please try booking again or contact us directly.</p>
                    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em;">
                        <strong>Debug Information:</strong><br>
                        Session data: ${bookingDataString ? 'Found' : 'Missing'}<br>
                        URL ID: ${bookingId || 'Missing'}<br>
                        <a href="/test-confirmation-data.html" target="_blank" style="color: #007bff;">🔧 Open Debug Tool</a>
                    </div>
                `;
            }
        }
        
        // Helper function to populate fields
        function populateConfirmationFields(data) {
            console.log("Populating fields with data:", data);
            
            // Location names mapping
            const locationNames = {
                'leopardstown': 'Fitzone Leopardstown',
                'clontarf': 'Fitzone Clontarf', 
                'westmanstown': 'Fitzone Westmanstown',
                '1': 'Fitzone Leopardstown',
                '2': 'Fitzone Clontarf',
                '3': 'Fitzone Westmanstown'
            };
            
            // Package names mapping
            const packageNames = {
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
            
            // Format date and time
            const formatDateTime = (date, time) => {
                if (!date) return 'Not specified';
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('en-IE', {
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric'
                });
                return time ? `${formattedDate} at ${time}` : formattedDate;
            };
            
            // Populate each field safely
            const setElementText = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || 'Not specified';
                    console.log(`Set ${id} to: ${value || 'Not specified'}`);
                } else {
                    console.error(`Element not found: ${id}`);
                }
            };
            
            // Location
            let locationName = data.locationName || 'Not specified';
            if (data.locations?.name) locationName = data.locations.name;
            else if (data.location_id) locationName = locationNames[data.location_id] || 'Not specified';
            else if (data.location) locationName = locationNames[data.location] || data.location;
            setElementText('confirm_location', locationName);
            
            // Package
            let packageName = data.packageName || 'Not specified';
            if (data.packages?.name) packageName = data.packages.name;
            else if (data.package_id) packageName = packageNames[data.package_id] || 'Not specified';
            else if (data.package) packageName = packageNames[data.package] || data.package;
            setElementText('confirm_package', packageName);
            
            // Date & Time
            setElementText('confirm_datetime', formatDateTime(data.booking_date || data.date, data.booking_time || data.time));
            
            // Child details
            setElementText('confirm_child_name', data.child_name || data.childName);
            setElementText('confirm_child_age', data.child_age || data.childAge);
            setElementText('confirm_num_guests', data.num_children || data.numGuests);
            
            // Contact details
            setElementText('confirm_parent_name', data.parent_name || data.parentName);
            setElementText('confirm_parent_email', data.email);
            setElementText('confirm_parent_phone', data.phone);
            
            // Additional info
            setElementText('confirm_requests', data.special_requests || data.specialRequests || 'None');
            setElementText('confirm_price', data.total_price ? `€${parseFloat(data.total_price).toFixed(2)}` : 'Not calculated');
        }
    } catch (e) {
        console.error("Error loading booking details:", e);
        const detailsContainer = document.querySelector('.confirmation-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = '<h3>Error Loading Booking Details</h3><p>There was an error processing your booking information. Please contact us directly for assistance.</p>';
        }
    }
});
