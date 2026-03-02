import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];

async function updateColors() {
    const { data: users, error: authError } = await supabase.auth.admin?.listUsers() || { data: { users: [] } };
    
    const { data: institutions, error } = await supabase
        .from('institutions')
        .select('*')
        .or('color.is.null,color.eq.#888888,color.eq.bg-muted-foreground');

    if (error) {
        console.error("Error fetching", error);
        return;
    }

    if (!institutions || institutions.length === 0) {
        console.log("No institutions need updating.");
        return;
    }

    console.log(`Found ${institutions.length} institutions to update...`);

    for (const inst of institutions) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const { error: updateError } = await supabase
            .from('institutions')
            .update({ color: randomColor })
            .eq('id', inst.id);
            
        if (updateError) {
            console.error(`Failed to update ${inst.id}:`, updateError);
        } else {
            console.log(`Updated ${inst.name} with color ${randomColor}`);
        }
    }
}

updateColors();
