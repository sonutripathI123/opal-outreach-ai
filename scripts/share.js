/**
 * Opal Outreach AI - Live Shareable HTTPS Tunnel Starter
 * Allows instant secure demonstration on mobile phones and remote laptops over HTTPS.
 */
const { spawn } = require('child_process');

console.log('🚀 Starting Opal Outreach AI on production port 3000...');

// Start next server
const server = spawn('npx', ['next', 'start', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
});

server.on('error', (err) => {
  console.error('Failed to start Next.js server:', err);
});

console.log('\n======================================================');
console.log('   OPAL OUTREACH AI - PRODUCTION HUB READY');
console.log('======================================================');
console.log('📍 Local Access:   http://localhost:3000');
console.log('🔑 Admin Email:    sonutripathi9305@gmail.com');
console.log('🔑 Admin Password: 02122025');
console.log('======================================================\n');
console.log('To generate an instant shareable public HTTPS tunnel on any laptop:');
console.log('Run in terminal: npx localtunnel --port 3000');
console.log('or: npx cloudflared tunnel --url http://localhost:3000\n');
