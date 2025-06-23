// Enhanced Time Slots Management Functions
// Add these functions to admin.js to improve the time slots interface

// Enhanced loadTimeSlots function with better UI and quick actions
async function loadTimeSlotsEnhanced() {
    const locationId = document.getElementById('timeslot-location').value;
    const date = document.getElementById('timeslot-date').value;
    
    const container = document.getElementById('timeslots-display');
    if (!container) {
        console.error('Timeslots display container not found');
        return;
    }
    
    if (!locationId) {
        container.innerHTML = `
            <div class="enhanced-empty-state">
                <div class="empty-icon">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <h3>Select a Location</h3>
                <p>Choose a location to view and manage time slots with quick controls</p>
                <div class="empty-actions">
                    <button class="btn btn-primary" onclick="document.getElementById('timeslot-location').focus()">
                        <i class="fas fa-mouse-pointer"></i>
                        Select Location
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    try {
        container.innerHTML = `
            <div class="enhanced-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <h3>Loading time slots...</h3>
                <p>Preparing enhanced management interface</p>
            </div>
        `;
        
        // Get location info
        const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
        
        // Get time slots
        const { data: timeSlots, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('location_id', locationId)
            .order(['day_of_week', 'start_time']);
        
        if (error) throw error;
        
        // Get bookings for selected date
        let bookings = [];
        let bookingCounts = {};
        if (date) {
            const { data: dateBookings } = await supabase
                .from('bookings')
                .select('booking_time, num_children, status, parent_name, child_name')
                .eq('location_id', locationId)
                .eq('booking_date', date)
                .in('status', ['confirmed', 'pending']);
            
            bookings = dateBookings || [];
            
            bookings.forEach(booking => {
                const time = booking.booking_time;
                if (!bookingCounts[time]) {
                    bookingCounts[time] = { count: 0, children: 0, bookings: [] };
                }
                bookingCounts[time].count++;
                bookingCounts[time].children += booking.num_children;
                bookingCounts[time].bookings.push(booking);
            });
        }
        
        if (!timeSlots || timeSlots.length === 0) {
            container.innerHTML = `
                <div class="enhanced-empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <h3>No Time Slots Found</h3>
                    <p>No time slots are configured for ${location?.name || 'this location'}</p>
                    <div class="empty-actions">
                        <button class="btn btn-primary" onclick="openAddTimeSlotModal()">
                            <i class="fas fa-plus"></i>
                            Add First Time Slot
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Filter slots for current day if date is selected
        let displaySlots = timeSlots;
        if (date) {
            const selectedDay = new Date(date).getDay();
            displaySlots = timeSlots.filter(slot => slot.day_of_week === selectedDay);
        }
        
        // Calculate stats
        const totalSlots = displaySlots.length;
        const availableSlots = displaySlots.filter(s => s.is_available).length;
        const bookedSlots = date ? Object.keys(bookingCounts).length : 0;
        const totalChildren = date ? Object.values(bookingCounts).reduce((sum, b) => sum + b.children, 0) : 0;
        
        // Create enhanced interface
        let html = `
            <div class="enhanced-timeslots-header">
                <div class="location-info">
                    <div class="location-details">
                        <h3>
                            <i class="fas fa-map-marker-alt"></i>
                            ${location?.name || 'Location'}
                        </h3>
                        ${date ? `
                            <div class="date-info">
                                <i class="fas fa-calendar"></i>
                                ${formatDateLong(date)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="enhanced-stats">
                    <div class="stat-card primary">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${totalSlots}</div>
                            <div class="stat-label">Total Slots</div>
                        </div>
                    </div>
                    
                    <div class="stat-card success">
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${availableSlots}</div>
                            <div class="stat-label">Available</div>
                        </div>
                    </div>
                    
                    ${date ? `
                        <div class="stat-card warning">
                            <div class="stat-icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${bookedSlots}</div>
                                <div class="stat-label">Booked</div>
                            </div>
                        </div>
                        
                        <div class="stat-card info">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${totalChildren}</div>
                                <div class="stat-label">Children</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="bulk-actions">
                    <button class="btn btn-outline btn-sm" onclick="bulkEnableSlots(${locationId}, '${date}')">
                        <i class="fas fa-eye"></i>
                        Enable All
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="bulkDisableSlots(${locationId}, '${date}')">
                        <i class="fas fa-eye-slash"></i>
                        Disable All
                    </button>
                </div>
            </div>
            
            <div class="enhanced-timeslots-grid">
        `;
        
        // Sort slots by time
        displaySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        displaySlots.forEach(slot => {
            const slotTime = slot.start_time.substring(0, 5);
            const booking = bookingCounts[slotTime];
            const isBooked = date && booking;
            
            let statusClass = 'available';
            let statusText = 'Available for Customers';
            let statusIcon = 'check-circle';
            let statusColor = '#10b981';
            
            if (!slot.is_available) {
                statusClass = 'disabled';
                statusText = 'Hidden from Customers';
                statusIcon = 'eye-slash';
                statusColor = '#ef4444';
            } else if (isBooked) {
                statusClass = 'booked';
                statusText = `${booking.count} Booking${booking.count > 1 ? 's' : ''}`;
                statusIcon = 'calendar-check';
                statusColor = '#f59e0b';
            }
            
            html += `
                <div class="enhanced-slot-card ${statusClass}">
                    <div class="slot-header">
                        <div class="slot-time">
                            <i class="fas fa-clock"></i>
                            <span class="time-range">
                                ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                            </span>
                        </div>
                        
                        <div class="slot-status" style="color: ${statusColor}">
                            <i class="fas fa-${statusIcon}"></i>
                            <span>${statusText}</span>
                        </div>
                    </div>
                    
                    ${isBooked ? `
                        <div class="booking-details">
                            <div class="booking-summary">
                                <strong>${booking.children} children</strong> across ${booking.count} booking${booking.count > 1 ? 's' : ''}
                            </div>
                            <div class="booking-list">
                                ${booking.bookings.map(b => `
                                    <div class="booking-item">
                                        <span class="customer-name">${b.parent_name}</span>
                                        <span class="child-info">${b.child_name} (${b.num_children} child${b.num_children > 1 ? 'ren' : ''})</span>
                                        <span class="booking-status status-${b.status}">${b.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="slot-actions">
                        <button class="quick-action-btn ${slot.is_available ? 'disable' : 'enable'}" 
                                onclick="quickToggleSlot(${slot.id}, ${!slot.is_available})"
                                title="${slot.is_available ? 'Hide from customers' : 'Show to customers'}">
                            <i class="fas fa-${slot.is_available ? 'eye-slash' : 'eye'}"></i>
                            <span>${slot.is_available ? 'Hide' : 'Show'}</span>
                        </button>
                        
                        <button class="quick-action-btn edit" 
                                onclick="editTimeSlot(${slot.id}, '${slot.start_time}', '${slot.end_time}', ${slot.is_available})"
                                title="Edit time slot">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </button>
                        
                        <button class="quick-action-btn delete" 
                                onclick="confirmDeleteSlot(${slot.id}, '${formatTime(slot.start_time)}', ${isBooked ? booking.count : 0})"
                                title="Delete time slot">
                            <i class="fas fa-trash"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Update current date display
        updateCurrentDateDisplay(date);
        
    } catch (error) {
        console.error('Error loading enhanced time slots:', error);
        container.innerHTML = `
            <div class="enhanced-error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Time Slots</h3>
                <p>Failed to load time slots: ${error.message}</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="loadTimeSlotsEnhanced()">
                        <i class="fas fa-refresh"></i>
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

// Quick toggle function for individual slots
window.quickToggleSlot = async function(slotId, makeAvailable) {
    try {
        const { error } = await supabase
            .from('time_slots')
            .update({ is_available: makeAvailable })
            .eq('id', slotId);
        
        if (error) throw error;
        
        showAlert(
            `Time slot ${makeAvailable ? 'enabled' : 'disabled'} successfully! ${makeAvailable ? 'Customers can now book this slot.' : 'This slot is now hidden from customers.'}`,
            'success'
        );
        
        loadTimeSlotsEnhanced(); // Refresh the display
        
    } catch (error) {
        console.error('Error toggling slot:', error);
        showAlert('Error updating time slot availability', 'error');
    }
};

// Bulk enable slots
window.bulkEnableSlots = async function(locationId, date) {
    try {
        let query = supabase
            .from('time_slots')
            .update({ is_available: true })
            .eq('location_id', locationId);
        
        if (date) {
            const selectedDay = new Date(date).getDay();
            query = query.eq('day_of_week', selectedDay);
        }
        
        const { error } = await query;
        
        if (error) throw error;
        
        showAlert('All time slots enabled successfully!', 'success');
        loadTimeSlotsEnhanced();
        
    } catch (error) {
        console.error('Error enabling slots:', error);
        showAlert('Error enabling time slots', 'error');
    }
};

// Bulk disable slots
window.bulkDisableSlots = async function(locationId, date) {
    if (!confirm('Are you sure you want to disable all time slots? This will hide them from customers.')) {
        return;
    }
    
    try {
        let query = supabase
            .from('time_slots')
            .update({ is_available: false })
            .eq('location_id', locationId);
        
        if (date) {
            const selectedDay = new Date(date).getDay();
            query = query.eq('day_of_week', selectedDay);
        }
        
        const { error } = await query;
        
        if (error) throw error;
        
        showAlert('All time slots disabled successfully!', 'warning');
        loadTimeSlotsEnhanced();
        
    } catch (error) {
        console.error('Error disabling slots:', error);
        showAlert('Error disabling time slots', 'error');
    }
};

// Enhanced delete confirmation
window.confirmDeleteSlot = async function(slotId, timeText, bookingCount) {
    let confirmMessage = `Are you sure you want to delete the ${timeText} time slot?`;
    
    if (bookingCount > 0) {
        confirmMessage += `\n\nWARNING: This slot has ${bookingCount} confirmed booking${bookingCount > 1 ? 's' : ''}. Deleting it may affect customer bookings.`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('time_slots')
            .delete()
            .eq('id', slotId);
        
        if (error) throw error;
        
        showAlert('Time slot deleted successfully!', 'success');
        loadTimeSlotsEnhanced();
        
    } catch (error) {
        console.error('Error deleting slot:', error);
        showAlert('Error deleting time slot', 'error');
    }
};

// Enhanced CSS styles for the new interface
const enhancedTimeSlotsCSS = `
<style>
/* Enhanced Time Slots Styles */
.enhanced-empty-state, .enhanced-loading, .enhanced-error-state {
    text-align: center;
    padding: 4rem 2rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 2px dashed #cbd5e1;
}

.enhanced-empty-state .empty-icon,
.enhanced-loading .loading-spinner,
.enhanced-error-state .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #64748b;
}

.enhanced-loading .loading-spinner i {
    color: #2563eb;
}

.enhanced-error-state .error-icon {
    color: #ef4444;
}

.enhanced-timeslots-header {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    padding: 2rem;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.5rem;
}

.location-details h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

.date-info {
    font-size: 0.875rem;
    opacity: 0.9;
}

.enhanced-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.stat-card {
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 100px;
}

.stat-icon {
    font-size: 1.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
}

.stat-label {
    font-size: 0.75rem;
    opacity: 0.9;
}

.bulk-actions {
    display: flex;
    gap: 0.5rem;
}

.enhanced-timeslots-grid {
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    background: white;
    border-radius: 0 0 12px 12px;
}

.enhanced-slot-card {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.2s ease;
}

.enhanced-slot-card:hover {
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
}

.enhanced-slot-card.available {
    border-color: #10b981;
    background: linear-gradient(135deg, #f0fdf4, #ffffff);
}

.enhanced-slot-card.disabled {
    border-color: #ef4444;
    background: linear-gradient(135deg, #fef2f2, #ffffff);
    opacity: 0.8;
}

.enhanced-slot-card.booked {
    border-color: #f59e0b;
    background: linear-gradient(135deg, #fffbeb, #ffffff);
}

.slot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
}

.slot-time {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.125rem;
}

.slot-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
}

.booking-details {
    background: rgba(245, 158, 11, 0.1);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.booking-summary {
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #92400e;
}

.booking-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.booking-item {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 6px;
    font-size: 0.75rem;
}

.customer-name {
    font-weight: 600;
}

.child-info {
    color: #64748b;
}

.booking-status {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.625rem;
}

.status-confirmed {
    background: #dcfce7;
    color: #166534;
}

.status-pending {
    background: #fef3c7;
    color: #92400e;
}

.slot-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.quick-action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
}

.quick-action-btn.enable {
    background: #10b981;
    color: white;
}

.quick-action-btn.enable:hover {
    background: #059669;
    transform: translateY(-1px);
}

.quick-action-btn.disable {
    background: #f59e0b;
    color: white;
}

.quick-action-btn.disable:hover {
    background: #d97706;
    transform: translateY(-1px);
}

.quick-action-btn.edit {
    background: #6366f1;
    color: white;
}

.quick-action-btn.edit:hover {
    background: #4f46e5;
    transform: translateY(-1px);
}

.quick-action-btn.delete {
    background: #ef4444;
    color: white;
}

.quick-action-btn.delete:hover {
    background: #dc2626;
    transform: translateY(-1px);
}

@media (max-width: 768px) {
    .enhanced-timeslots-header {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }
    
    .enhanced-stats {
        justify-content: center;
    }
    
    .enhanced-timeslots-grid {
        grid-template-columns: 1fr;
    }
    
    .slot-header {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
        text-align: center;
    }
    
    .booking-item {
        grid-template-columns: 1fr;
        text-align: center;
    }
}
</style>
`;

// Inject the enhanced CSS
document.head.insertAdjacentHTML('beforeend', enhancedTimeSlotsCSS); 