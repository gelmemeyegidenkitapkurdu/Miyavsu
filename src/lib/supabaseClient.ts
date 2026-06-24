import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://oxqobtlcbksfdajnvnoz.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cW9idGxjYmtzZmRham52bm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NTE3MzUsImV4cCI6MjA2NzUyNzczNX0.fIC24RysJVlnTS3LAxtqwe1luz3ED_SrfQeLnjmPnMk";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const adminEmail =
  import.meta.env.VITE_ADMIN_EMAIL ?? "gelmemeyegidenkitapkurdu@gmail.com";
