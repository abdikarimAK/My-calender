// Supabase Configuration


const SUPABASE_URL = 'https://izqkwycxtmgsmnafbuwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mM0XsuQLXzh1VeZunH2a_w_tXRAIIGN';



// ============================================
// DEBUG: Check credentials
// ============================================
console.log('🔍 DEBUG: Starting Supabase initialization...');

if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.error('❌ ERROR: Supabase credentials not set!');
    console.error('Please update supabase-config.js with your real credentials');
    alert('FEIL: Supabase ikke konfigurert!\n\nÅpne Console (F12) for detaljer.');
} else {
    console.log('✅ DEBUG: Credentials found');
    console.log('📍 DEBUG: URL length:', SUPABASE_URL.length, 'characters');
    console.log('📍 DEBUG: Key length:', SUPABASE_ANON_KEY.length, 'characters');

    // Check for common issues
    if (SUPABASE_URL.startsWith(' ') || SUPABASE_URL.endsWith(' ')) {
        console.warn('⚠️ WARNING: URL has leading/trailing spaces!');
    }
    if (SUPABASE_ANON_KEY.startsWith(' ') || SUPABASE_ANON_KEY.endsWith(' ')) {
        console.warn('⚠️ WARNING: API key has leading/trailing spaces!');
    }
    if (!SUPABASE_URL.startsWith('https://')) {
        console.error('❌ ERROR: URL should start with https://');
    }
    if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
        console.error('❌ ERROR: API key should start with eyJ');
    }
}

// ============================================
// Initialize Supabase client
// ============================================
try {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ ERROR: Supabase library not loaded!');
        console.error('Make sure this script is loaded AFTER the Supabase CDN script');
        alert('FEIL: Supabase bibliotek ikke lastet!\n\nSjekk at CDN-scriptet er før config-filen.');
    } else {
        console.log('✅ DEBUG: Supabase library loaded');

        // Create Supabase client
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ DEBUG: Supabase client created');
        console.log('📦 DEBUG: Client object:', typeof window.supabaseClient);

        // Test connection immediately
        console.log('🔄 DEBUG: Testing database connection...');
        window.supabaseClient
            .from('calendar_data')
            .select('count')
            .then(result => {
                if (result.error) {
                    console.error('❌ DATABASE ERROR:', result.error);
                    console.error('Error details:', result.error.message);
                    if (result.error.message.includes('JWT')) {
                        console.error('💡 TIP: Your API key might be invalid or expired');
                    }
                    if (result.error.message.includes('relation')) {
                        console.error('💡 TIP: Table "calendar_data" might not exist in database');
                    }
                } else {
                    console.log('✅ DATABASE CONNECTION SUCCESS!');
                    console.log('📊 DEBUG: Connection result:', result);
                }
            })
            .catch(err => {
                console.error('❌ CONNECTION TEST FAILED:', err);
            });
    }
} catch (error) {
    console.error('❌ INITIALIZATION ERROR:', error);
    console.error('Error message:', error.message);
}

console.log('🏁 DEBUG: Supabase config file finished loading');