const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://zkxwjvjkkcuzbbiupapq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_vrKF1-gxvR8FkpZAYem70w_wmq5BETg';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
