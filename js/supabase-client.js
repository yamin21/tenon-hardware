// Shared Supabase client for storefront auth (login/signup). Anon key is
// public by design — same key the ERP's own React app uses client-side.
const SUPABASE_URL = 'https://iysuyyrcgbngiyrqgdrt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5DSjoZ3OKFZ0zynKTnk8Sw_eJ2Ebjnk';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
