import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.DB_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
