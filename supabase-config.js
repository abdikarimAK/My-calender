// Supabase Configuration


const SUPABASE_URL = 'https://izqkwycxtmgsmnafbuwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mM0XsuQLXzh1VeZunH2a_w_tXRAIIGN';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabase;