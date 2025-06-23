// Real-time Data Manager for Fitzone Application
// This module provides live data updates across all pages

import { 
    subscribeToBookings, 
    subscribeToPackages, 
    subscribeToLocations, 
    subscribeToTimeSlots,
    unsubscribeFromAll,
    getActiveSubscriptions
} from './supabase.js';

// Global state for real-time data
let realtimeData = {
    bookings: [],
    packages: [],
    locations: [],
    timeSlots: [],
    isConnected: false,
    lastUpdate: null
};

// Event listeners for data changes
const dataChangeListeners = {
    bookings: new Set(),
    packages: new Set(),
    locations: new Set(),
    timeSlots: new Set(),
    connection: new Set()
};

// Initialize real-time data system
export function initializeRealTimeData(options = {}) {
    console.log('🔄 Initializing real-time data system...');
    
    // Set up subscriptions based on options
    if (options.subscribeToBookings !== false) {
        subscribeToBookings(handleBookingUpdate);
    }
    
    if (options.subscribeToPackages !== false) {
        subscribeToPackages(handlePackageUpdate);
    }
    
    if (options.subscribeToLocations !== false) {
        subscribeToLocations(handleLocationUpdate);
    }
    
    if (options.subscribeToTimeSlots !== false) {
        subscribeToTimeSlots(handleTimeSlotUpdate);
    }
    
    realtimeData.isConnected = true;
    realtimeData.lastUpdate = new Date();
    
    // Notify connection listeners
    notifyListeners('connection', { connected: true });
    
    console.log('✅ Real-time data system active');
    
    if (options.showIndicator !== false) {
        showLiveDataIndicator();
    }
}

// Handle booking updates
function handleBookingUpdate(payload) {
    console.log('📊 Live booking update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch(eventType) {
        case 'INSERT':
            realtimeData.bookings.push(newRecord);
            break;
        case 'UPDATE':
            const updateIndex = realtimeData.bookings.findIndex(b => b.id === newRecord.id);
            if (updateIndex >= 0) {
                realtimeData.bookings[updateIndex] = newRecord;
            }
            break;
        case 'DELETE':
            realtimeData.bookings = realtimeData.bookings.filter(b => b.id !== oldRecord.id);
            break;
    }
    
    realtimeData.lastUpdate = new Date();
    notifyListeners('bookings', { eventType, newRecord, oldRecord, data: realtimeData.bookings });
}

// Handle package updates
function handlePackageUpdate(payload) {
    console.log('📦 Live package update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch(eventType) {
        case 'INSERT':
            realtimeData.packages.push(newRecord);
            break;
        case 'UPDATE':
            const updateIndex = realtimeData.packages.findIndex(p => p.id === newRecord.id);
            if (updateIndex >= 0) {
                realtimeData.packages[updateIndex] = newRecord;
            }
            break;
        case 'DELETE':
            realtimeData.packages = realtimeData.packages.filter(p => p.id !== oldRecord.id);
            break;
    }
    
    realtimeData.lastUpdate = new Date();
    notifyListeners('packages', { eventType, newRecord, oldRecord, data: realtimeData.packages });
}

// Handle location updates
function handleLocationUpdate(payload) {
    console.log('📍 Live location update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch(eventType) {
        case 'INSERT':
            realtimeData.locations.push(newRecord);
            break;
        case 'UPDATE':
            const updateIndex = realtimeData.locations.findIndex(l => l.id === newRecord.id);
            if (updateIndex >= 0) {
                realtimeData.locations[updateIndex] = newRecord;
            }
            break;
        case 'DELETE':
            realtimeData.locations = realtimeData.locations.filter(l => l.id !== oldRecord.id);
            break;
    }
    
    realtimeData.lastUpdate = new Date();
    notifyListeners('locations', { eventType, newRecord, oldRecord, data: realtimeData.locations });
}

// Handle time slot updates
function handleTimeSlotUpdate(payload) {
    console.log('⏰ Live time slot update:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch(eventType) {
        case 'INSERT':
            realtimeData.timeSlots.push(newRecord);
            break;
        case 'UPDATE':
            const updateIndex = realtimeData.timeSlots.findIndex(t => t.id === newRecord.id);
            if (updateIndex >= 0) {
                realtimeData.timeSlots[updateIndex] = newRecord;
            }
            break;
        case 'DELETE':
            realtimeData.timeSlots = realtimeData.timeSlots.filter(t => t.id !== oldRecord.id);
            break;
    }
    
    realtimeData.lastUpdate = new Date();
    notifyListeners('timeSlots', { eventType, newRecord, oldRecord, data: realtimeData.timeSlots });
}

// Subscribe to data changes
export function onDataChange(type, callback) {
    if (dataChangeListeners[type]) {
        dataChangeListeners[type].add(callback);
        
        // Return unsubscribe function
        return () => {
            dataChangeListeners[type].delete(callback);
        };
    }
    
    console.warn(`Unknown data type: ${type}`);
    return () => {};
}

// Notify listeners
function notifyListeners(type, data) {
    if (dataChangeListeners[type]) {
        dataChangeListeners[type].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${type} listener:`, error);
            }
        });
    }
}

// Get current data state
export function getCurrentData(type = null) {
    if (type) {
        return realtimeData[type] || null;
    }
    return { ...realtimeData };
}

// Show live data indicator
function showLiveDataIndicator() {
    // Check if indicator already exists
    if (document.querySelector('.live-data-indicator')) {
        return;
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'live-data-indicator';
    indicator.innerHTML = `
        <i class="fas fa-circle live-dot"></i>
        <span>Live</span>
    `;
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        .live-data-indicator {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(40, 167, 69, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 4px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .live-dot {
            font-size: 6px;
            animation: livePulse 2s infinite;
        }
        
        @keyframes livePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .live-data-indicator.disconnected {
            background: rgba(220, 53, 69, 0.9);
        }
        
        .live-data-indicator.disconnected .live-dot {
            animation: none;
            opacity: 0.7;
        }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(indicator);
    
    // Update indicator on connection changes
    onDataChange('connection', (data) => {
        if (data.connected) {
            indicator.classList.remove('disconnected');
            indicator.innerHTML = `
                <i class="fas fa-circle live-dot"></i>
                <span>Live</span>
            `;
        } else {
            indicator.classList.add('disconnected');
            indicator.innerHTML = `
                <i class="fas fa-circle live-dot"></i>
                <span>Offline</span>
            `;
        }
    });
}

// Show notification for data changes
export function showDataChangeNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `data-change-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-sync-alt"></i>
        <span>${message}</span>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#data-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'data-notification-styles';
        styles.textContent = `
            .data-change-notification {
                position: fixed;
                top: 50px;
                right: 10px;
                background: rgba(255, 255, 255, 0.95);
                border-left: 3px solid #007bff;
                padding: 8px 12px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 9998;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                backdrop-filter: blur(10px);
                animation: slideInRight 0.3s ease;
            }
            
            .data-change-notification.success { border-left-color: #28a745; }
            .data-change-notification.warning { border-left-color: #ffc107; }
            .data-change-notification.error { border-left-color: #dc3545; }
            
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 2 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Cleanup function
export function cleanup() {
    console.log('🧹 Cleaning up real-time data system...');
    unsubscribeFromAll();
    
    // Clear all listeners
    for (const type in dataChangeListeners) {
        dataChangeListeners[type].clear();
    }
    
    realtimeData.isConnected = false;
    notifyListeners('connection', { connected: false });
    
    // Remove indicators
    const indicator = document.querySelector('.live-data-indicator');
    if (indicator) indicator.remove();
}

// Auto cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Export data state and utilities
export { realtimeData }; 