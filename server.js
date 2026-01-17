const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'bookings.json');

// Ensure bookings file exists
try {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', { flag: 'wx' });
} catch (e) {
  // If file exists or cannot create, log and continue
  console.warn('Warning: could not ensure bookings.json exists:', e.message);
}

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Safe read/write helpers
function readBookings() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error('Failed to read bookings.json, returning empty list:', e.message);
    return [];
  }
}
function writeBookings(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write bookings.json:', e.message);
    throw e;
  }
}

function generateSlots(dateStr) {
  const slots = [];
  for (let h = 11; h <= 16; h++) slots.push(`${String(h).padStart(2, '0')}:00`);
  return slots;
}

app.get('/slots', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'date required' });
  const parts = date.split('-');
  const day = Number(parts[2]);
  if (day === 25) return res.json({ date, available: [] });
  const all = generateSlots(date);
  const bookings = readBookings().filter(b => b.date === date).map(b => b.time);
  const available = all.filter(t => !bookings.includes(t));
  res.json({ date, available });
});

app.post('/book', (req, res) => {
  const { date, time, service, userId, name, initData } = req.body;
  if (!date || !time || !service || !userId) return res.status(400).json({ error: 'missing' });

  const parts = date.split('-');
  const day = Number(parts[2]);
  if (day === 25) return res.status(400).json({ error: 'booking not allowed on 25th' });

  // If initData provided and TELEGRAM_BOT_TOKEN set, verify it.
  if (initData) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        if (!checkTelegramInitData(initData, botToken)) {
          console.warn('initData verification FAILED for book request');
          return res.status(403).json({ error: 'initData verification failed' });
        }
      } else {
        // No token available: do not block, just warn (temporary)
        console.warn('TELEGRAM_BOT_TOKEN not set on server — skipping initData verification (temporary)');
      }
    } catch (e) {
      console.error('Error during initData verification:', e);
      return res.status(500).json({ error: 'verification error' });
    }
  }

  const bookings = readBookings();
  if (bookings.find(b => b.date === date && b.time === time)) return res.status(409).json({ error: 'slot taken' });
  const entry = { date, time, service, userId, name, createdAt: new Date().toISOString() };
  bookings.push(entry);
  try {
    writeBookings(bookings);
  } catch (e) {
    return res.status(500).json({ error: 'failed to save booking' });
  }
  res.json({ ok: true, booking: entry });
});

app.post('/auth', (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData required' });
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set on server — /auth will accept any initData (temporary)');
      return res.json({ ok: true, warning: 'no bot token on server - verification skipped' });
    }
    const ok = checkTelegramInitData(initData, botToken);
    if (!ok) return res.status(403).json({ error: 'invalid' });
    res.json({ ok: true });
  } catch (e) {
    console.error('auth error', e);
    res.status(500).json({ error: 'server error' });
  }
});

// Telegram initData verification helper
function parseInitData(initData) {
  const out = {};
  initData.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx);
    const v = decodeURIComponent(pair.slice(idx + 1));
    out[k] = v;
  });
  return out;
}

function checkTelegramInitData(initData, botToken) {
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not set on server');
  const data = parseInitData(initData);
  const hash = data.hash;
  if (!hash) return false;
  delete data.hash;
  const dataCheckArr = Object.keys(data).sort().map(k => `${k}=${data[k]}`);
  const dataCheckString = dataCheckArr.join('\n');
  // secret = sha256(botToken) raw bytes
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return hmac === hash;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));