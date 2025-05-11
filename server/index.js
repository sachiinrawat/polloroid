import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Initialize server
const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const db = new sqlite3.Database(path.join(__dirname, 'polloroid.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

// Create tables
function createTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        poloBalance INTEGER DEFAULT 30,
        location TEXT,
        age INTEGER,
        profileImage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        description TEXT NOT NULL,
        requiredVotes INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiresAt TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS pollOptions (
        id TEXT PRIMARY KEY,
        pollId TEXT NOT NULL,
        imageUrl TEXT NOT NULL,
        voteCount INTEGER DEFAULT 0,
        FOREIGN KEY (pollId) REFERENCES polls(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        pollId TEXT NOT NULL,
        optionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pollId, userId),
        FOREIGN KEY (pollId) REFERENCES polls(id),
        FOREIGN KEY (optionId) REFERENCES pollOptions(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// JWT Secret
const JWT_SECRET = 'polloroid-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      db.run(
        'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
        [userId, username, email, hashedPassword],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1d' });
          res.status(201).json({
            token,
            user: {
              id: userId,
              username,
              email,
              poloBalance: 30
            }
          });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          poloBalance: user.poloBalance,
          profileImage: user.profileImage
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/api/polls', (req, res) => {
  db.all(`
    SELECT p.*, u.username, u.profileImage
    FROM polls p
    JOIN users u ON p.userId = u.id
    ORDER BY p.createdAt DESC
  `, [], (err, polls) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const getOptions = (poll, callback) => {
      db.all('SELECT * FROM pollOptions WHERE pollId = ?', [poll.id], (err, options) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, { ...poll, options });
      });
    };

    let completed = 0;
    const pollsWithOptions = [];

    polls.forEach((poll) => {
      getOptions(poll, (err, pollWithOptions) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        pollsWithOptions.push(pollWithOptions);
        completed++;

        if (completed === polls.length) {
          res.json(pollsWithOptions);
        }
      });
    });
  });
});

// Get expired polls (poll history)
app.get('/api/polls/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(`
    SELECT p.*, u.username, u.profileImage
    FROM polls p
    JOIN users u ON p.userId = u.id
    WHERE p.userId = ? AND p.expiresAt IS NOT NULL AND p.expiresAt < datetime('now')
    ORDER BY p.createdAt DESC
  `, [userId], (err, polls) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const getOptions = (poll, callback) => {
      db.all('SELECT * FROM pollOptions WHERE pollId = ?', [poll.id], (err, options) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, { ...poll, options });
      });
    };

    let completed = 0;
    const pollsWithOptions = [];

    if (polls.length === 0) {
      return res.json([]);
    }

    polls.forEach((poll) => {
      getOptions(poll, (err, pollWithOptions) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        pollsWithOptions.push(pollWithOptions);
        completed++;

        if (completed === polls.length) {
          res.json(pollsWithOptions);
        }
      });
    });
  });
});

app.post('/api/polls', authenticateToken, upload.array('images', 8), (req, res) => {
  const { description, requiredVotes, duration } = req.body;
  const files = req.files;
  const userId = req.user.id;

  db.get('SELECT poloBalance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const requiredPolo = parseInt(requiredVotes);
    if (user.poloBalance < requiredPolo) {
      return res.status(400).json({ error: 'Insufficient polo balance' });
    }

    const pollId = uuidv4();
    
    // Calculate expiration date based on duration (in hours)
    const expiresAt = duration ? new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString() : null;

    db.run(
      'INSERT INTO polls (id, userId, description, requiredVotes, expiresAt) VALUES (?, ?, ?, ?, ?)',
      [pollId, userId, description, requiredVotes, expiresAt],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        files.forEach((file) => {
          db.run(
            'INSERT INTO pollOptions (id, pollId, imageUrl) VALUES (?, ?, ?)',
            [uuidv4(), pollId, `/uploads/${file.filename}`]
          );
        });

        db.run(
          'UPDATE users SET poloBalance = poloBalance - ? WHERE id = ?',
          [requiredPolo, userId]
        );

        db.run(
          'INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), userId, -requiredPolo, 'debit', 'Poll creation']
        );

        res.status(201).json({ message: 'Poll created successfully' });
      }
    );
  });
});

app.post('/api/votes', authenticateToken, (req, res) => {
  const { pollId, optionId } = req.body;
  const userId = req.user.id;

  db.get('SELECT * FROM votes WHERE pollId = ? AND userId = ?', [pollId, userId], (err, vote) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (vote) {
      return res.status(400).json({ error: 'Already voted on this poll' });
    }

    db.run(
      'INSERT INTO votes (id, pollId, optionId, userId) VALUES (?, ?, ?, ?)',
      [uuidv4(), pollId, optionId, userId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.run('UPDATE pollOptions SET voteCount = voteCount + 1 WHERE id = ?', [optionId]);
        db.run('UPDATE users SET poloBalance = poloBalance + 1 WHERE id = ?', [userId]);

        db.run(
          'INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), userId, 1, 'credit', 'Vote reward']
        );

        res.status(200).json({ message: 'Vote recorded successfully' });
      }
    );
  });
});

app.get('/api/user/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    'SELECT id, username, email, poloBalance, location, age, profileImage, createdAt FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    }
  );
});

app.put('/api/user/profile', authenticateToken, upload.single('profileImage'), (req, res) => {
  const { username, email, age, location } = req.body;
  const userId = req.user.id;
  const profileImage = req.file ? `/uploads/${req.file.filename}` : undefined;

  let query = 'UPDATE users SET ';
  const params = [];
  const updates = [];

  if (username) {
    updates.push('username = ?');
    params.push(username);
  }

  if (email) {
    updates.push('email = ?');
    params.push(email);
  }

  if (age) {
    updates.push('age = ?');
    params.push(age);
  }

  if (location) {
    updates.push('location = ?');
    params.push(location);
  }

  if (profileImage) {
    updates.push('profileImage = ?');
    params.push(profileImage);
  }

  query += updates.join(', ');
  query += ' WHERE id = ?';
  params.push(userId);

  db.run(query, params, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: 'Profile updated successfully' });
  });
});

app.get('/api/user/transactions', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC',
    [userId],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(transactions);
    }
  );
});

app.get('/api/user/polls', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(`
    SELECT p.*, 
           (SELECT COUNT(*) FROM votes WHERE pollId = p.id) as totalVotes
    FROM polls p
    WHERE p.userId = ?
    ORDER BY p.createdAt DESC
  `, [userId], (err, polls) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const getOptions = (poll, callback) => {
      db.all('SELECT * FROM pollOptions WHERE pollId = ?', [poll.id], (err, options) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, { ...poll, options });
      });
    };

    let completed = 0;
    const pollsWithOptions = [];

    polls.forEach((poll) => {
      getOptions(poll, (err, pollWithOptions) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        pollsWithOptions.push(pollWithOptions);
        completed++;

        if (completed === polls.length) {
          res.json(pollsWithOptions);
        }
      });
    });
  });
});

app.post('/api/transaction/deposit', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  db.run('UPDATE users SET poloBalance = poloBalance + ? WHERE id = ?', [amount, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.run(
      'INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), userId, amount, 'credit', 'Deposit'],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ message: 'Deposit successful' });
      }
    );
  });
});

app.post('/api/transaction/withdraw', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  db.get('SELECT poloBalance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (user.poloBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    db.run('UPDATE users SET poloBalance = poloBalance - ? WHERE id = ?', [amount, userId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run(
        'INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), userId, -amount, 'debit', 'Withdrawal'],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({ message: 'Withdrawal successful' });
        }
      );
    });
  });
});

// Create uploads directory if it doesn't exist
import fs from 'fs';
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});