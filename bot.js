const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!DISCORD_TOKEN || !TELEGRAM_TOKEN) {
  console.error('Missing required environment variables: DISCORD_BOT_TOKEN, TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

// =============================================
// MAPPING: Discord Server ID → Telegram Chat ID
// Add a new line for each server you want to monitor
// =============================================
const SERVER_TO_TELEGRAM = {
  '1213282437711527956': '-680290099',   // current server → 5Д
  '762767062149365770':  '-501588967',   // new server → пацики крч
};
// =============================================

function sendTelegramMessage(chatId, text) {
  const postData = JSON.stringify({
    chat_id: chatId,
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
        console.log(`[${new Date().toISOString()}] ✓ Sent to ${chatId}: ${text}`);
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const guildId = newState.guild?.id || oldState.guild?.id;
  const telegramChatId = SERVER_TO_TELEGRAM[guildId];

  if (!telegramChatId) {
    console.log(`[${new Date().toISOString()}] No Telegram mapping for server ${guildId} — skipping`);
    return;
  }

  const username = newState.member?.user?.username || oldState.member?.user?.username || 'Unknown User';

  // Joined a channel
  if (oldState.channelId === null && newState.channelId !== null) {
    const channelName = newState.channel?.name || 'Unknown Channel';
    console.log(`[${new Date().toISOString()}] ${username} JOINED ${channelName} (server ${guildId})`);
    sendTelegramMessage(telegramChatId, `🎧 *${username}* joined **${channelName}**`);
  }

  // Left a channel
  if (oldState.channelId !== null && newState.channelId === null) {
    const channelName = oldState.channel?.name || 'Unknown Channel';
    console.log(`[${new Date().toISOString()}] ${username} LEFT ${channelName} (server ${guildId})`);
    sendTelegramMessage(telegramChatId, `🚪 *${username}* left **${channelName}**`);
  }
});

client.on('clientReady', () => {
  console.log(`[${new Date().toISOString()}] ✓ Bot logged in as ${client.user.tag}`);
  console.log('Monitoring servers:');
  for (const [serverId, chatId] of Object.entries(SERVER_TO_TELEGRAM)) {
    console.log(`  Discord ${serverId} → Telegram ${chatId}`);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error.message);
});

client.login(DISCORD_TOKEN);
