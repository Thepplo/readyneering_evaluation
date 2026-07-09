import { supabase } from '/assets/auth.js';

   const params = new URLSearchParams(location.search);
   const returnTo = params.get('return_to') || '/dashboard';

   document.getElementById('login-form').addEventListener('submit', async (e) => {
     e.preventDefault();
     const email = document.getElementById('email').value.trim().toLowerCase();
     const msg = document.getElementById('login-message');

     msg.textContent = 'Sending...';

     await supabase.auth.signInWithOtp({
       email,
       options: {
         shouldCreateUser: false,
         emailRedirectTo: `${location.origin}${returnTo}`,
       },
     });

     msg.textContent = 'If your email is registered, a link is on its way. Check your inbox.';
   });