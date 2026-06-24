import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oxqobtlcbksfdajnvnoz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cW9idGxjYmtzZmRham52bm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NTE3MzUsImV4cCI6MjA2NzUyNzczNX0.fIC24RysJVlnTS3LAxtqwe1luz3ED_SrfQeLnjmPnMk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const blob = new Blob(['test'], { type: 'text/plain' });
supabase.storage.from('books').upload('test.txt', blob, { upsert: true }).then(res => {
  console.log('Upload:', res);
});
