const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!DISCORD_TOKEN || !TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing required environment variables: DISCORD_BOT_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

function sendTelegramMessage(text) {
  const postData = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'Markdown',
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[${new Date().toISOString()}] ✓ Sent: ${text}`);
      } else {
        console.error(`Telegram error (${res.statusCode}):`, data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Failed to send Telegram message:', error.message);
  });

  req.write(postData);
  req.end();
}

client.on('voiceStateUpdate', (oldState, newState) => {
  const username = newState.member?.user?.username || oldState.member?.user?.username || 'Unknown User';

  // Joined a channel
  if (oldState.channelId === null && newState.channelId !== null) {
    const channelName = newState.channel?.name || 'Unknown Channel';
    console.log(`[${new Date().toISOString()}] ${username} JOINED ${channelName}`);
    sendTelegramMessage(`🎧 *${username}* joined **${channelName}**`);
  }

  // Left a channel
  if (oldState.channelId !== null && newState.channelId === null) {
    const channelName = oldState.channel?.name || 'Unknown Channel';
    console.log(`[${new Date().toISOString()}] ${username} LEFT ${channelName}`);
    sendTelegramMessage(`🚪 *${username}* left **${channelName}**`);
  }
});

client.on('clientReady', () => {
  console.log(`[${new Date().toISOString()}] ✓ Bot logged in as ${client.user.tag}`);
});

client.on('error', (error) => {
  console.error('Discord client error:', error.message);
});

// Auto-reconnect on disconnect
client.on('shardDisconnect', () => {
  console.log('Disconnected. Reconnecting...');
  client.login(DISCORD_TOKEN);
});

client.login(DISCORD_TOKEN);
