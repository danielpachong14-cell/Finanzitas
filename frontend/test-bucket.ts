import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBucket() {
    console.log("Testing access to 'receipts' bucket...");

    // 1. Check if bucket exists/is accessible by trying to list files
    const { data: listData, error: listError } = await supabase.storage.from('receipts').list();

    if (listError) {
        console.error("❌ ERROR: Cannot access 'receipts' bucket.");
        console.error(listError);
        // return;
    } else {
        console.log("✅ SUCCESS: Accessed 'receipts' bucket. Files found:", listData?.length);
    }

    // 2. Try to upload a dummy text file
    console.log("\\nAttempting to upload a test file...");
    const dummyContent = "This is a test file to verify the receipts bucket is operational.";
    const fileName = `private/test-file-${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, dummyContent, {
            contentType: 'text/plain',
            upsert: false
        });

    if (uploadError) {
        console.error("❌ ERROR: Failed to upload to 'receipts' bucket.");
        console.error("Make sure the bucket has the correct RLS policies or is configured to allow public uploads if RLS is disabled or your anon key lacks permissions without a user session.");
        console.error(uploadError);
    } else {
        console.log("✅ SUCCESS: Uploaded test file:", uploadData?.path);

        // Try to get public URL
        const { data: pubUrlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
        console.log("🔗 Public URL:", pubUrlData.publicUrl);

        // Clean up
        console.log("Cleaning up test file...");
        const { error: removeError } = await supabase.storage.from('receipts').remove([uploadData.path]);
        if (removeError) {
            console.error("❌ ERROR: Failed to delete test file:", removeError);
        } else {
            console.log("✅ SUCCESS: Cleaned up test file.");
        }
    }
}

testBucket();
