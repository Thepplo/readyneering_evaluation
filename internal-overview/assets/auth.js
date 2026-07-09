

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   export const SUPABASE_URL = 'https://supabase-andqfive-u72683.vm.elestio.app';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc4MjQwOTI0LCJleHAiOleHAiOjIwOTM2MDA5MjR9.RY78HRRVwTCZFZIlok07BQm0hMM-t9J9B8ZD_w_TW8M';

   export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

   export async function requireSession() {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session) {
       const returnTo = encodeURIComponent(location.pathname + location.search);
       location.replace(`/login?return_to=${returnTo}`);
       return null;
     }
     return session;
   }

   export async function signOut() {
     await supabase.auth.signOut();
     location.replace('/login');
   }