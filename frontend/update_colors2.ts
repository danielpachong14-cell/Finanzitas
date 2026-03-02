import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local", supabaseUrl);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];

async function run() {
    const { data: institutions, error } = await supabase.from('institutions').select('*');
    if (error) {
        console.error("Error fetching", error);
        return;
    }
    if (!institutions) return console.log("No insts");
    
    for (const inst of institutions) {
        if (!inst.color || inst.color === '#888888' || inst.color === 'bg-muted-foreground') {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            await supabase.from('institutions').update({ color: randomColor }).eq('id', inst.id);
            console.log(`Updated ${inst.name} to ${randomColor}`);
        }
    }
    console.log("Done updating");
}
run();
