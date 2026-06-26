import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase no configurado');
    }
    client = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return client;
}
