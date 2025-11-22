// server.js
console.log("🔥 server.js started");
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');

const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- VIEW ENGINE (must be AFTER const app = express()) -----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----- MIDDLEWARE -----
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ----- HELPERS -----
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ----- HEALTHCHECK -----
app.get('/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    version: '1.0',
  });
});

// ----- DASHBOARD PAGE ("/") -----
// ----- DASHBOARD PAGE ("/") -----
app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT code, target_url, total_clicks, last_clicked_at, created_at FROM links ORDER BY created_at DESC'
    );
    res.render('dashboard', {
      links: rows,
      baseUrl: process.env.BASE_URL || `http://localhost:${PORT}`,
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).send('Server error');
  }
});



// ----- STATS PAGE ("/code/:code") -----
app.get('/code/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT code, target_url, total_clicks, last_clicked_at, created_at FROM links WHERE code = $1',
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).send('Link not found');
    }

    res.render('stats', {
      link: rows[0],
      baseUrl: process.env.BASE_URL || `http://localhost:${PORT}`,
    });
  } catch (err) {
    console.error('Error loading stats:', err);
    res.status(500).send('Server error');
  }
});

// ----- API: CREATE LINK (POST /api/links) -----
app.post('/api/links', async (req, res) => {
  try {
    let { url, code } = req.body;

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid or missing URL' });
    }

    url = url.trim();
    if (code) code = code.trim();

    if (code && !isValidCode(code)) {
      return res.status(400).json({
        error: 'Code must be 6-8 chars, letters and numbers only',
      });
    }

    if (!code) {
      let unique = false;
      while (!unique) {
        const candidate = generateCode(6);
        const existing = await pool.query('SELECT 1 FROM links WHERE code = $1', [candidate]);
        if (existing.rowCount === 0) {
          code = candidate;
          unique = true;
        }
      }
    } else {
      const { rowCount } = await pool.query('SELECT 1 FROM links WHERE code = $1', [code]);
      if (rowCount > 0) {
        return res.status(409).json({ error: 'Code already exists' });
      }
    }

    const insertResult = await pool.query(
      'INSERT INTO links (code, target_url) VALUES ($1, $2) RETURNING code, target_url, total_clicks, last_clicked_at, created_at',
      [code, url]
    );

    const link = insertResult.rows[0];
    res.status(201).json({ link });
  } catch (err) {
    console.error('Error creating link:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----- API: LIST ALL LINKS (GET /api/links) -----
app.get('/api/links', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT code, target_url, total_clicks, last_clicked_at, created_at FROM links ORDER BY created_at DESC'
    );
    res.json({ links: rows });
  } catch (err) {
    console.error('Error listing links:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----- API: STATS FOR ONE CODE (GET /api/links/:code) -----
app.get('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT code, target_url, total_clicks, last_clicked_at, created_at FROM links WHERE code = $1',
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ link: rows[0] });
  } catch (err) {
    console.error('Error fetching link stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----- API: DELETE LINK (DELETE /api/links/:code) -----
app.delete('/api/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query('DELETE FROM links WHERE code = $1', [code]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----- REDIRECT ROUTE ("/:code") -----
app.get('/:code', async (req, res) => {
  const { code } = req.params;

  if (code === 'favicon.ico') {
    return res.status(404).end();
  }

  try {
    const { rows } = await pool.query(
      'SELECT target_url FROM links WHERE code = $1',
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const targetUrl = rows[0].target_url;

    await pool.query(
      'UPDATE links SET total_clicks = total_clicks + 1, last_clicked_at = NOW() WHERE code = $1',
      [code]
    );

    res.redirect(302, targetUrl);
  } catch (err) {
    console.error('Error during redirect:', err);
    res.status(500).send('Server error');
  }
});

// ----- START SERVER -----
(async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 TinyLink server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
