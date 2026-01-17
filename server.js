const express = require('express');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'bookings.json');
try {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
} catch (e) {
  console.error('Failed to access bookings file', e);
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static('public'));

function readBookings() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeBookings(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateSlots(dateStr) {
  const slots = [];
  for (let h = 11; h <= 16; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

app.get('/slots', (req, res) => {
  const date = req.query.date; // YYYY-MM-DD
  if (!date) return res.status(400).json({error: 'date required'});
  const parts = date.split('-');
  const day = Number(parts[2]);
  if (day === 25) return res.json({date, available: []});
  const all = generateSlots(date);
  const bookings = readBookings().filter(b => b.date === date).map(b => b.time);
  const available = all.filter(t => !bookings.includes(t));
  res.json({date, available});
});

app.post('/book', (req, res) => {
  const {date, time, service, userId, name} = req.body;
  if (!date || !time || !service || !userId) return res.status(400).json({error: 'missing'});
  const parts = date.split('-');
  const day = Number(parts[2]);
  if (day === 25) return res.status(400).json({error: 'booking not allowed on 25th'});
  const bookings = readBookings();
  if (bookings.find(b => b.date === date && b.time === time)) return res.status(409).json({error: 'slot taken'});
  const entry = {date, time, service, userId, name, createdAt: new Date().toISOString()};
  bookings.push(entry);
  writeBookings(bookings);
  res.json({ok: true, booking: entry});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server on', PORT));
