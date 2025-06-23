// Initialize Database with Sample Data
import { 
    createLocation,
    createPackage,
    testConnection
} from './supabase.js';

// Test connection first
console.log('Testing database connection...');
const connectionTest = await testConnection();

if (!connectionTest.success) {
    console.error('Database connection failed:', connectionTest.error);
    alert('Database connection failed! Please check your Supabase configuration.');
} else {
    console.log('✅ Database connection successful');
    
    // Initialize sample data
    await initializeSampleData();
}

async function initializeSampleData() {
    console.log('Initializing sample data...');
    
    try {
        // Create sample locations
        const locations = [
            {
                name: 'Fitzone Leopardstown',
                address: 'Leopardstown Business Park, Dublin 18, Ireland',
                phone: '+353 1 123 4567',
                email: 'leopardstown@fitzone.ie',
                daily_capacity: 8,
                active: true
            },
            {
                name: 'Fitzone Clontarf',
                address: 'Clontarf Retail Park, Dublin 3, Ireland',
                phone: '+353 1 234 5678',
                email: 'clontarf@fitzone.ie',
                daily_capacity: 6,
                active: true
            },
            {
                name: 'Fitzone Westmanstown',
                address: 'Westmanstown Sports Centre, Dublin 15, Ireland',
                phone: '+353 1 345 6789',
                email: 'westmanstown@fitzone.ie',
                daily_capacity: 10,
                active: true
            }
        ];
        
        console.log('Creating locations...');
        for (const location of locations) {
            const result = await createLocation(location);
            if (result.success) {
                console.log(`✅ Created location: ${location.name}`);
            } else {
                console.error(`❌ Failed to create location ${location.name}:`, result.error);
            }
        }
        
        // Create sample packages
        const packages = [
            {
                name: 'Adventure Zone',
                description: 'Our most popular package featuring obstacle courses, climbing walls, and team challenges perfect for kids aged 6-14.',
                price: 199.99,
                duration: 2,
                features: [
                    'Obstacle courses and climbing walls',
                    'Team building activities',
                    'Professional party host',
                    'Party room for cake and food',
                    'Birthday child gets a special gift',
                    'Setup and cleanup included'
                ],
                active: true
            },
            {
                name: 'Go-Kart Racing',
                description: 'High-speed electric go-kart racing experience for adrenaline-seeking birthday parties.',
                price: 249.99,
                duration: 2.5,
                features: [
                    'Electric go-kart racing sessions',
                    'Safety briefing and equipment',
                    'Racing trophies for winners',
                    'Party room access',
                    'Professional supervision',
                    'Photo session with winner podium'
                ],
                active: true
            },
            {
                name: 'Play & Dance',
                description: 'Perfect for younger children with soft play areas, music, and dance activities.',
                price: 149.99,
                duration: 1.5,
                features: [
                    'Soft play area access',
                    'Music and dance activities',
                    'Arts and crafts corner',
                    'Dedicated party host',
                    'Party room for refreshments',
                    'Age-appropriate games and activities'
                ],
                active: true
            },
            {
                name: 'VIP Ultimate Experience',
                description: 'Our premium package combining multiple activities with exclusive VIP treatment.',
                price: 399.99,
                duration: 3,
                features: [
                    'Access to all activity zones',
                    'Go-kart racing session',
                    'Climbing wall challenge',
                    'Private VIP party room',
                    'Dedicated party coordinator',
                    'Professional photography',
                    'Personalized decorations',
                    'Premium party favors',
                    'Extended celebration time'
                ],
                active: true
            },
            {
                name: 'Climbing Wall Challenge',
                description: 'Specialized climbing and rope course adventure for outdoor enthusiasts.',
                price: 179.99,
                duration: 2,
                features: [
                    'Indoor climbing wall access',
                    'Rope course challenges',
                    'Safety equipment provided',
                    'Certified climbing instructors',
                    'Achievement certificates',
                    'Group photo session'
                ],
                active: true
            }
        ];
        
        console.log('Creating packages...');
        for (const pkg of packages) {
            const result = await createPackage(pkg);
            if (result.success) {
                console.log(`✅ Created package: ${pkg.name} - $${pkg.price}`);
            } else {
                console.error(`❌ Failed to create package ${pkg.name}:`, result.error);
            }
        }
        
        console.log('🎉 Sample data initialization completed!');
        alert(`Sample data initialized successfully! 
        
✅ ${locations.length} locations created
✅ ${packages.length} packages created

You can now:
1. Test booking functionality on the booking form
2. Manage data through the admin dashboard
3. View availability and analytics

The system is ready for production use!`);
        
    } catch (error) {
        console.error('Error initializing sample data:', error);
        alert('Error initializing sample data: ' + error.message);
    }
}

// Auto-run if loaded as a module
if (typeof window !== 'undefined') {
    console.log('Data initialization script loaded');
} 