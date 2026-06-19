// Shared Supabase client for storefront auth (login/signup). Anon key is
// public by design — same key the ERP's own React app uses client-side.
const SUPABASE_URL = 'https://iysuyyrcgbngiyrqgdrt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c3V5eXJjZ2JuZ2l5cnFnZHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTU3MDYsImV4cCI6MjA5NDMzMTcwNn0.ipH9Q4jyGpX2sZ7HJQVh3mOo58Sst8BoGaqhX7_4ZPs';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
