/* config.js — environment settings. Loaded first (blocking) so the saved theme applies before first paint.
   No secrets belong here: a Google Client ID is public by design. */
window.JIBUY_CONFIG = Object.freeze({
  STORE_NAME: 'Jibuy',
  SUPPORT_PHONE: '+234 800 000 0000',
  CURRENCY: 'NGN',
  LOCALE: 'en-NG',
  /* Google Sign-In: create an OAuth "Web application" client in Google Cloud Console,
     add your site origin (e.g. http://localhost:3000) under "Authorized JavaScript origins", paste the Client ID. */
  GOOGLE_CLIENT_ID: '',
  /* Backend: '' = local mode (localStorage). Set to e.g. 'http://localhost:3000' to use server.js. */
  API_BASE: '',
  FREE_DELIVERY_THRESHOLD: 50000,
  PAGE_SIZE: 24,
  /* Delivery fee (₦) by state. Anything not listed falls back to 5000. */
  DELIVERY_ZONES: [
    { fee: 2000, states: ['Lagos'] },
    { fee: 2500, states: ['Oyo', 'Ogun', 'Osun'] },
    { fee: 3000, states: ['Ondo', 'Ekiti', 'Edo', 'Kwara', 'Kogi', 'Delta'] },
    { fee: 3500, states: ['FCT - Abuja', 'Nasarawa', 'Niger', 'Anambra', 'Enugu', 'Imo', 'Abia', 'Ebonyi', 'Rivers', 'Bayelsa', 'Akwa Ibom', 'Cross River', 'Benue', 'Plateau'] },
    { fee: 5000, states: ['Kaduna', 'Kano', 'Katsina', 'Jigawa', 'Zamfara', 'Sokoto', 'Kebbi', 'Bauchi', 'Gombe', 'Adamawa', 'Taraba', 'Borno', 'Yobe'] }
  ]
});

(function () {
  try {
    var t = localStorage.getItem('jibuy:theme');
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* storage blocked: stay on default theme */ }
})();
