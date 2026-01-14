// Supabase Configuration
// Replace with your actual credentials from Supabase Dashboard → Settings → API

const SUPABASE_URL = 'https://izqkwycxtmgsmnafbuwx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWt3eWN4dG1nc21uYWZidXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTY5ODUsImV4cCI6MjA4Mzk3Mjk4NX0.FLWDKJ404oKBUT5pxBcucR7sJ2F3Ttfnp4QycI_SEfo';

// Initialize Supabase client
if (typeof window.supabase === 'undefined') {
    console.error('ERROR: Supabase library not loaded. Make sure CDN script is loaded first.');
} else {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}