const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We cannot use anon key to fetch assets directly without a logged in user.
// But we can authenticate using an email/password if we had a test user.
