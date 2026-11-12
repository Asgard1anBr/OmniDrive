/* Registro do Service Worker — em arquivo próprio porque a CSP bloqueia <script> inline. */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
