// MANUAL FIX for duplicates - Run this in browser console on admin page
// Go to admin.html, open browser console (F12), paste this and press Enter

async function fixDuplicateTimeSlots() {
    console.log('🔧 Starting duplicate time slot fix...');
    
    try {
        // Get all time slots
        const { data: allSlots, error } = await supabase
            .from('time_slots')
            .select('*')
            .order('id');
            
        if (error) throw error;
        
        console.log(`📊 Found ${allSlots.length} total time slots`);
        
        // Group by unique combination
        const seen = new Set();
        const duplicates = [];
        
        allSlots.forEach(slot => {
            const key = `${slot.location_id}-${slot.day_of_week}-${slot.start_time}-${slot.end_time}`;
            
            if (seen.has(key)) {
                duplicates.push(slot.id);
                console.log(`🔍 Found duplicate: ${slot.start_time} on day ${slot.day_of_week} (ID: ${slot.id})`);
            } else {
                seen.add(key);
            }
        });
        
        console.log(`❌ Found ${duplicates.length} duplicates to remove`);
        
        if (duplicates.length === 0) {
            console.log('✅ No duplicates found!');
            return;
        }
        
        // Delete duplicates
        for (const duplicateId of duplicates) {
            console.log(`🗑️ Deleting duplicate ID: ${duplicateId}`);
            
            const { error: deleteError } = await supabase
                .from('time_slots')
                .delete()
                .eq('id', duplicateId);
                
            if (deleteError) {
                console.error(`❌ Error deleting ${duplicateId}:`, deleteError);
            } else {
                console.log(`✅ Deleted duplicate ${duplicateId}`);
            }
        }
        
        console.log('🎉 Duplicate cleanup complete! Refreshing page...');
        
        // Refresh the admin interface
        if (typeof loadTimeSlots === 'function') {
            await loadTimeSlots();
        }
        
        alert('✅ Duplicates removed successfully! Check your booking form now.');
        
    } catch (error) {
        console.error('❌ Error fixing duplicates:', error);
        alert('❌ Error fixing duplicates. Check console for details.');
    }
}

// Run the fix
fixDuplicateTimeSlots(); 