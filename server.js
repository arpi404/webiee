const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Data file configuration
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'guestbook.json');

// Initial seed entries
const DEFAULT_ENTRIES = [
  {
    id: '1792619683076-zhg4',
    name: 'Tester ✨',
    message: 'Testing persistent guestbook backend! Looks awesome!',
    date: 'Oct 22, 2026, 03:24 AM',
    likes: 1
  }
];

// Helper: Read entries safely from JSON
function readEntries() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_ENTRIES, null, 2), 'utf-8');
      return DEFAULT_ENTRIES;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ENTRIES;
  } catch (err) {
    console.error('Error reading guestbook data:', err);
    return DEFAULT_ENTRIES;
  }
}

// Helper: Write entries safely using atomic rename
function writeEntries(entries) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(entries, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing guestbook data:', err);
    return false;
  }
}

// Simple IP-based rate limiting to prevent spam (max 1 sign per 5 seconds per IP)
const recentSigners = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const lastSigned = recentSigners.get(ip);
  if (lastSigned && now - lastSigned < 5000) {
    return true;
  }
  recentSigners.set(ip, now);
  return false;
}

// Sanitize string to prevent basic XSS injections
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ================= API ENDPOINTS ================= //

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'webiee-guestbook', timestamp: new Date().toISOString() });
});

// GET all entries
app.get('/api/guestbook', (req, res) => {
  const entries = readEntries();
  res.json({
    success: true,
    count: entries.length,
    entries: entries
  });
});

// POST new entry
app.post('/api/guestbook', (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Whoa there, slow down a bit! Please wait a few seconds before signing again ♡'
    });
  }

  const rawName = (req.body.name || '').trim();
  const rawMessage = (req.body.message || '').trim();

  if (!rawName || !rawMessage) {
    return res.status(400).json({
      success: false,
      message: 'Both name and message are required!'
    });
  }

  if (rawName.length > 40) {
    return res.status(400).json({
      success: false,
      message: 'Name is too long (maximum 40 characters).'
    });
  }

  if (rawMessage.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Message is too long (maximum 500 characters).'
    });
  }

  const cleanName = sanitize(rawName);
  const cleanMessage = sanitize(rawMessage);

  const now = new Date();
  const dateFormatted = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const newEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    message: cleanMessage,
    date: dateFormatted,
    likes: 0
  };

  const entries = readEntries();
  entries.unshift(newEntry);

  if (writeEntries(entries)) {
    return res.status(201).json({
      success: true,
      message: 'Guestbook signed successfully!',
      entry: newEntry,
      count: entries.length
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Failed to save your message. Please try again.'
    });
  }
});

// POST like entry
app.post('/api/guestbook/:id/like', (req, res) => {
  const entryId = req.params.id;
  const entries = readEntries();
  const target = entries.find(e => String(e.id) === String(entryId));

  if (!target) {
    return res.status(404).json({
      success: false,
      message: 'Entry not found'
    });
  }

  target.likes = (target.likes || 0) + 1;
  writeEntries(entries);

  return res.json({
    success: true,
    id: entryId,
    likes: target.likes
  });
});

// Start server with fallback if port is in use
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n===========================================`);
    console.log(`☆ Webiee Guestbook Server Running! ☆`);
    console.log(`Local: http://localhost:${port}`);
    console.log(`API:   http://localhost:${port}/api/guestbook`);
    console.log(`===========================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
