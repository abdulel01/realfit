// Supabase Integration for Summer Camp Website

// Using ESM.sh CDN which is more reliable with local development
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase configuration
const supabaseUrl = 'https://annyssisoigjibiocyzu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubnlzc2lzb2lnamliaW9jeXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMzIxMDYsImV4cCI6MjA2MjkwODEwNn0.99ilyM9a9NVSNZZ4uiAcv92Nwr3wn6tcd2UhPwgiwg8'

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Export the supabase client for use in other modules
export { supabase }

console.log('Supabase client initialized successfully')

// Real-time subscriptions storage
const activeSubscriptions = new Map()

// REAL-TIME SUBSCRIPTION FUNCTIONS
export function subscribeToBookings(callback) {
    const channel = supabase
        .channel('bookings-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'bookings' },
            (payload) => {
                console.log('Real-time booking change:', payload)
                callback(payload)
            }
        )
        .subscribe()
    
    activeSubscriptions.set('bookings', channel)
    console.log('Subscribed to bookings real-time updates')
    return channel
}

export function subscribeToPackages(callback) {
    const channel = supabase
        .channel('packages-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'packages' },
            (payload) => {
                console.log('Real-time package change:', payload)
                callback(payload)
            }
        )
        .subscribe()
    
    activeSubscriptions.set('packages', channel)
    console.log('Subscribed to packages real-time updates')
    return channel
}

export function subscribeToLocations(callback) {
    const channel = supabase
        .channel('locations-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'locations' },
            (payload) => {
                console.log('Real-time location change:', payload)
                callback(payload)
            }
        )
        .subscribe()
    
    activeSubscriptions.set('locations', channel)
    console.log('Subscribed to locations real-time updates')
    return channel
}

export function subscribeToTimeSlots(callback) {
    const channel = supabase
        .channel('timeslots-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'time_slots' },
            (payload) => {
                console.log('Real-time time slot change:', payload)
                callback(payload)
            }
        )
        .subscribe()
    
    activeSubscriptions.set('time_slots', channel)
    console.log('Subscribed to time slots real-time updates')
    return channel
}

// Subscribe to all tables at once
export function subscribeToAllTables(callbacks) {
    if (callbacks.bookings) subscribeToBookings(callbacks.bookings)
    if (callbacks.packages) subscribeToPackages(callbacks.packages)
    if (callbacks.locations) subscribeToLocations(callbacks.locations)
    if (callbacks.timeSlots) subscribeToTimeSlots(callbacks.timeSlots)
}

// Unsubscribe from specific table
export function unsubscribeFrom(tableName) {
    const channel = activeSubscriptions.get(tableName)
    if (channel) {
        supabase.removeChannel(channel)
        activeSubscriptions.delete(tableName)
        console.log(`Unsubscribed from ${tableName} real-time updates`)
    }
}

// Unsubscribe from all tables
export function unsubscribeFromAll() {
    for (const [tableName, channel] of activeSubscriptions) {
        supabase.removeChannel(channel)
        console.log(`Unsubscribed from ${tableName} real-time updates`)
    }
    activeSubscriptions.clear()
}

// Get active subscriptions
export function getActiveSubscriptions() {
    return Array.from(activeSubscriptions.keys())
}

// Test connection function
export async function testConnection() {
    try {
        const { data, error } = await supabase.from('bookings').select('count', { count: 'exact', head: true })
        if (error) throw error
        console.log('Supabase connection test successful')
        return { success: true, message: 'Connected to Supabase' }
    } catch (error) {
        console.error('Supabase connection failed:', error)
        return { success: false, error: error.message }
    }
}

// BOOKINGS CRUD OPERATIONS
export async function createBooking(bookingData) {
    try {
        console.log('Creating booking with data:', bookingData)
        
        const { data, error } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
        
        if (error) throw error
        
        console.log('Booking created successfully:', data)
        return { success: true, data: data[0] }
    } catch (error) {
        console.error('Error creating booking:', error)
        return { success: false, error: error.message }
    }
}

export async function getBookings(filters = {}) {
    try {
        let query = supabase.from('bookings').select(`
            *,
            locations(name, address),
            packages(name, price)
        `)
        
        // Apply filters if provided
        if (filters.id) query = query.eq('id', filters.id)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.location_id) query = query.eq('location_id', filters.location_id)
        if (filters.date_from) query = query.gte('booking_date', filters.date_from)
        if (filters.date_to) query = query.lte('booking_date', filters.date_to)
        
        const { data, error } = await query.order('created_at', { ascending: false })
        
        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching bookings:', error)
        return { success: false, error: error.message }
    }
}

export async function updateBooking(id, updates) {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .update(updates)
            .eq('id', id)
            .select()
        
        if (error) throw error
        return { success: true, data: data[0] }
    } catch (error) {
        console.error('Error updating booking:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteBooking(id) {
    try {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error deleting booking:', error)
        return { success: false, error: error.message }
    }
}

// PACKAGES CRUD OPERATIONS
export async function getPackages() {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .order('name')
        
        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching packages:', error)
        return { success: false, error: error.message }
    }
}

export async function createPackage(packageData) {
    try {
        const { data, error } = await supabase
            .from('packages')
            .insert([packageData])
            .select()
        
        if (error) throw error
        return { success: true, data: data[0] }
    } catch (error) {
        console.error('Error creating package:', error)
        return { success: false, error: error.message }
    }
}

export async function updatePackage(id, updates) {
    try {
        const { data, error } = await supabase
            .from('packages')
            .update(updates)
            .eq('id', id)
            .select()
        
        if (error) throw error
        return { success: true, data: data[0] }
    } catch (error) {
        console.error('Error updating package:', error)
        return { success: false, error: error.message }
    }
}

export async function deletePackage(id) {
    try {
        // Hard delete since there's no active column
        const { error } = await supabase
            .from('packages')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error deleting package:', error)
        return { success: false, error: error.message }
    }
}

// LOCATIONS CRUD OPERATIONS
export async function getLocations() {
    try {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('name')
        
        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching locations:', error)
        return { success: false, error: error.message }
    }
}

export async function createLocation(locationData) {
    try {
        const { data, error } = await supabase
            .from('locations')
            .insert([locationData])
            .select()
        
        if (error) throw error
        return { success: true, data: data[0] }
    } catch (error) {
        console.error('Error creating location:', error)
        return { success: false, error: error.message }
    }
}

export async function updateLocation(id, updates) {
    try {
        const { data, error } = await supabase
            .from('locations')
            .update(updates)
            .eq('id', id)
            .select()
        
        if (error) throw error
        return { success: true, data: data[0] }
    } catch (error) {
        console.error('Error updating location:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLocation(id) {
    try {
        // Hard delete since there's no active column
        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error deleting location:', error)
        return { success: false, error: error.message }
    }
}

// AVAILABILITY MANAGEMENT
export async function checkAvailability(locationId, bookingDate, timeSlot) {
    try {
        console.log('Checking availability for:', { locationId, bookingDate, timeSlot });
        
        // For now, let's not rely on a daily_capacity column that may not exist
        // We'll use a default capacity of 20 bookings per day per location
        const defaultCapacity = 20;
        
        // Count existing bookings for this date and location
        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('id')
            .eq('location_id', locationId)
            .eq('booking_date', bookingDate) // Fixed: use booking_date instead of event_date
            .neq('status', 'cancelled')
        
        if (bookingError) {
            console.error('Error querying bookings:', bookingError);
            throw bookingError;
        }
        
        console.log('Found existing bookings:', bookings.length);
        
        const currentBookings = bookings.length;
        const capacity = defaultCapacity;
        const available = capacity - currentBookings;
        
        const result = {
            success: true,
            available: available > 0,
            remaining: Math.max(0, available),
            capacity: capacity
        };
        
        console.log('Availability result:', result);
        return result;
        
    } catch (error) {
        console.error('Error checking availability:', error);
        return { success: false, error: error.message }
    }
}

export async function getUnavailableDates(locationId, startDate, endDate) {
    try {
        // Use default capacity since daily_capacity column may not exist
        const defaultCapacity = 20;
        
        // Get booking counts by date
        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('booking_date') // Fixed: use booking_date instead of event_date
            .eq('location_id', locationId)
            .gte('booking_date', startDate) // Fixed: use booking_date
            .lte('booking_date', endDate) // Fixed: use booking_date
            .neq('status', 'cancelled')
        
        if (bookingError) throw bookingError
        
        // Count bookings per date
        const bookingCounts = {}
        bookings.forEach(booking => {
            const date = booking.booking_date // Fixed: use booking_date
            bookingCounts[date] = (bookingCounts[date] || 0) + 1
        })
        
        // Find fully booked dates
        const capacity = defaultCapacity;
        const unavailableDates = Object.keys(bookingCounts)
            .filter(date => bookingCounts[date] >= capacity)
        
        return { success: true, unavailableDates }
    } catch (error) {
        console.error('Error getting unavailable dates:', error)
        return { success: false, error: error.message }
    }
}

// ANALYTICS FUNCTIONS
export async function getDashboardStats() {
    try {
        // Total bookings
        const { data: totalBookings, error: totalError } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
        
        if (totalError) throw totalError
        
        // Pending bookings
        const { data: pendingBookings, error: pendingError } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
        
        if (pendingError) throw pendingError
        
        // Today's bookings
        const today = new Date().toISOString().split('T')[0]
        const { data: todayBookings, error: todayError } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('booking_date', today) // Fixed: use booking_date instead of event_date
        
        if (todayError) throw todayError
        
        // Revenue this month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        const { data: monthlyRevenue, error: revenueError } = await supabase
            .from('bookings')
            .select('total_price') // Fixed: use total_price instead of total_amount
            .gte('created_at', startOfMonth.toISOString())
            .neq('status', 'cancelled')
        
        if (revenueError) throw revenueError
        
        const revenue = monthlyRevenue.reduce((sum, booking) => sum + (booking.total_price || 0), 0) // Fixed: use total_price
        
        return {
            success: true,
            stats: {
                totalBookings: totalBookings.count || 0,
                pendingBookings: pendingBookings.count || 0,
                todayBookings: todayBookings.count || 0,
                monthlyRevenue: revenue
            }
        }
    } catch (error) {
        console.error('Error getting dashboard stats:', error)
        return { success: false, error: error.message }
    }
}

// Legacy functions for compatibility
export async function getPackagesByLocation(locationId) {
    try {
        console.log('Getting packages for location:', locationId);
        
        const { data, error } = await supabase
            .from('location_packages')
            .select(`
                *,
                packages:package_id (
                    id,
                    name,
                    description,
                    price,
                    min_age,
                    max_age,
                    min_children,
                    max_children,
                    duration,
                    features,
                    is_popular,
                    is_exclusive,
                    badge_text,
                    badge_color,
                    image_url
                )
            `)
            .eq('location_id', locationId)
            .eq('is_available', true)
            .order('package_id');

        if (error) {
            console.error('Error querying location packages:', error);
            throw error;
        }

        // Extract the package data and apply any price overrides
        const packages = data.map(item => ({
            ...item.packages,
            // Use price override if available, otherwise use original price
            price: item.price_override || item.packages.price
        }));

        console.log('Found packages for location:', packages);
        return { success: true, data: packages };
        
    } catch (error) {
        console.error('Error fetching packages by location:', error);
        return { success: false, error: error.message };
    }
}

export async function getTimeSlots(locationId = null, dayOfWeek = null) {
    try {
        // If no location specified, return all available time slots from database
        if (!locationId) {
            const { data, error } = await supabase
                .from('time_slots')
                .select('start_time, end_time')
                .eq('is_available', true)
                .order('start_time');

            if (error) throw error;

            // Convert to the format expected by the frontend
            const uniqueTimes = [...new Set(data.map(slot => slot.start_time))];
            const timeSlots = uniqueTimes.map(time => {
                const [hours, minutes] = time.split(':');
                const hour12 = hours % 12 || 12;
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayName = `${hour12}:${minutes} ${ampm}`;
                
                return {
                    value: time,
                    name: displayName
                };
            });

            return { success: true, data: timeSlots };
        }

        // Get time slots for specific location and day
        let query = supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .eq('is_available', true);

        if (dayOfWeek !== null) {
            query = query.eq('day_of_week', dayOfWeek);
        }

        console.log('🔍 SUPABASE QUERY: location_id =', locationId, ', day_of_week =', dayOfWeek, ', is_available = true');
        const { data, error } = await query.order('start_time');
        console.log('📦 SUPABASE RAW RESULT:', { data, error });
        
        if (data) {
            console.log('🔢 Found', data.length, 'time slots');
            data.forEach(slot => {
                console.log(`  📅 Slot ID ${slot.id}: ${slot.start_time}-${slot.end_time}, available: ${slot.is_available}`);
            });
        }

        if (error) throw error;

        // Convert to the format expected by the frontend
        const timeSlots = data.map(slot => {
            const [hours, minutes] = slot.start_time.split(':');
            const hour12 = hours % 12 || 12;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayName = `${hour12}:${minutes} ${ampm}`;
            
            return {
                value: slot.start_time,
                name: displayName,
                id: slot.id,
                end_time: slot.end_time
            };
        });

        return { success: true, data: timeSlots };
    } catch (error) {
        console.error('Error getting time slots:', error);
        return { success: false, error: error.message };
    }
}

// TIME SLOTS MANAGEMENT FUNCTIONS
export async function getTimeSlotsForLocation(locationId) {
    try {
        console.log('Getting time slots for location:', locationId);
        
        const { data, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error querying time slots:', error);
            throw error;
        }

        console.log('Found time slots:', data);
        return { success: true, data: data || [] };
        
    } catch (error) {
        console.error('Error fetching time slots for location:', error);
        return { success: false, error: error.message };
    }
}

export async function createTimeSlot(timeSlotData) {
    try {
        console.log('Creating time slot:', timeSlotData);
        
        const { data, error } = await supabase
            .from('time_slots')
            .insert([{
                location_id: timeSlotData.locationId,
                day_of_week: timeSlotData.dayOfWeek,
                start_time: timeSlotData.startTime,
                end_time: timeSlotData.endTime,
                is_available: timeSlotData.isAvailable
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating time slot:', error);
            throw error;
        }

        console.log('Created time slot:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('Error creating time slot:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTimeSlot(id, updates) {
    try {
        console.log('Updating time slot:', id, updates);
        
        const { data, error } = await supabase
            .from('time_slots')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating time slot:', error);
            throw error;
        }

        console.log('Updated time slot:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('Error updating time slot:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteTimeSlot(id) {
    try {
        console.log('Deleting time slot:', id);
        
        const { data, error } = await supabase
            .from('time_slots')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error deleting time slot:', error);
            throw error;
        }

        console.log('Deleted time slot:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('Error deleting time slot:', error);
        return { success: false, error: error.message };
    }
}
