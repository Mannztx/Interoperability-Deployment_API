// Sesi praktikum
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js');
const app = express();
const port = process.env.PORT || 3030;
// Impor bcrypt dan jwt (dependencies keamanan)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
// Impor middleware
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware.js');
// let idSeq = 4;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// dummy data
app.get('/', (req, res) => {
    res.send('Selamat Datang di Server API Movies & Directors (Firman Ardiansyah), Terimakasih');
});

// Cek status
app.get('/status', (req, res) => {
  res.json({
    ok: 'true',
    services: 'film-api',
    // timestamp: new Date()
  });
});

// Menambahkan route baru untuk registrasi
// AUTH Routes (Refactored for pg)
app.post('/auth/register', async (req, res) => {
  const {username, password} = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({error: 'Username dan Password harus diisi'});
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const sql = 'INSERT INTO users(username, password, role) VALUES ($1, $2, $3) RETURNING id, username';
    const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'user']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Kode error unik PostgreSQL
      returnres.status(409).json({error: 'Username sudah digunakan'});
    }
    next(err);
  }
});

app.post('/auth/register-admin', async(req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    returnres.status(400).json({error:'Username dan password harus di isi'});
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const sql = 'INSERT INTO users(username, password, role) VALUES ($1, $2, $3) RETURNING id, username';
    const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'admin']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      returnres.status(409).json({error: 'Username sudah digunakan'});
    }
    next(err);
  }
});

// Validasi kredensial dan mengembalikan
app.post("/auth/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const sql = "SELECT * FROM users WHERE username = $1";
    const result = await db.query(sql, [username.toLowerCase()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const payload = {
      user: { id: user.id, username: user.username, role: user.role },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login berhasil", token });
  } catch (err) {
    next(err);
  }
});


// Melihat semua daftar film
app.get("/movies", async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year, d.id AS director_id, d.name AS director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    ORDER BY m.id ASC
  `;

  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET movie by id
app.get("/movies/:id", async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year, d.id AS director_id, d.name AS director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    WHERE m.id = $1
  `;

  try {
    const result = await db.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Film tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Menambah data film baru
app.post("/movies", authenticateToken, async (req, res, next) => {
  const { title, director_id, year } = req.body;

  if (!title || !director_id || !year) {
    return res.status(400).json({
      error: "title, director_id, dan year wajib diisi",
    });
  }

  const sql =
    "INSERT INTO movies (title, director_id, year) VALUES ($1, $2, $3) RETURNING *";

  try {
    const result = await db.query(sql, [title, director_id, year]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Memperbarui data film dengan id tertentu
app.put("/movies/:id", [authenticateToken, authorizeRole("admin")], async (req, res, next) => {
    const { title, director_id, year } = req.body;
    const sql = "UPDATE movies SET title = $1, director_id = $2, year = $3 WHERE id = $4 RETURNING *";

    try {
      const result = await db.query(sql, [
        title,
        director_id,
        year,
        req.params.id,
      ]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Film tidak ditemukan" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// Menghapus data film dengan id tertentu
app.delete("/movies/:id", [authenticateToken, authorizeRole("admin")], async (req, res, next) => {
    const sql = "DELETE FROM movies WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(sql, [req.params.id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Film tidak ditemukan" });
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// Melihat daftar semua sutradara
// app.get("/directors", (req, res) => {
//   dbDirectors.all("SELECT * FROM directors", [], (err, rows) => {
//     if (err) return res.status(500).json({error: err.message});
//     res.json(rows);
//   });
// });

app.get("/directors", async (req, res, next) => {
  const sql = 'SELECT id, name, "birthYear" FROM directors ORDER BY id ASC';
  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// // Melihat data sutradara berdasarkan id
// app.get("/directors/:id", (req, res) => {
//   dbDirectors.get("SELECT * FROM directors WHERE id = ?", [req.params.id], (err, row) => {
//     if (err) return res.status(500).json({error: err.message});
//     if (!row) return res.status(404).json({error: "Director not found"});
//     res.json(row);
//   });
// });

app.get('/directors/:id', async (req, res, next) => {
  const sql = 'SELECT id, name, "birthYear" FROM directors WHERE id = $1';
  try {
    const result = await db.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Director tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// // Menambah data sutradara
// app.post("/directors", authenticateToken, (req, res) => {
//   const {name, birthYear} = req.body;
//   dbDirectors.run(
//     "INSERT INTO directors (name, birthYear) VALUES (?, ?)",
//     [name, birthYear],
//     function (err) {
//       if (err) return res.status(500).json({error: err.message});
//       res.json({id: this.lastID, name, birthYear});
//     }
//   );
// });

app.post('/directors', [authenticateToken, authorizeRole('admin')], async (req, res, next) => {
  const { name, birthYear } = req.body;
  if (!name || !birthYear) {
    return res.status(400).json({ error: 'name dan birthYear wajib diisi' });
  }
  const sql = 'INSERT INTO directors (name, "birthYear") VALUES ($1, $2) RETURNING *'; 
  try {
    const result = await db.query(sql, [name, birthYear]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// // Memperbarui data sutradara dengan id tertentu
// app.put("/directors/:id", authenticateToken, (req, res) => {
//   const {id} = req.params;
//   const {name, birthYear} = req.body;
//   dbDirectors.run(
//     "UPDATE directors SET name = ?, birthYear = ? WHERE id = ?",
//     [name, birthYear, req.params.id],
//     function (err) {
//       if (err) return res.status(500).json({error: err.message});
//       res.json({message: `Data sutradara dengan id ${id} berhasil diperbarui`});
//     }
//   );
// });

app.put("/directors/:id", [authenticateToken, authorizeRole("admin")], async (req, res, next) => {
  const { name, birthYear } = req.body;
  if (!name || !birthYear) {
    return res.status(400).json({ error: 'name dan birthYear wajib diisi' });
  }
  const sql = 'UPDATE directors SET name = $1, "birthYear" = $2 WHERE id = $3 RETURNING *';

  try {
    const result = await db.query(sql, [name, birthYear, req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Director tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// // Menghapus data sutradara dengan id tertentu
// app.delete("/directors/:id", authenticateToken, (req, res) => {
//   const {id} = req.params;
//   dbDirectors.run("DELETE FROM directors WHERE id = ?", req.params.id, function (err) {
//     if (err) return res.status(500).json({error: err.message});
//     res.json({message: `Data sutradara dengan id ${id} berhasil dihapus`});
//   });
// });

app.delete("/directors/:id", [authenticateToken, authorizeRole("admin")], async (req, res, next) => {
  const sql = 'DELETE FROM directors WHERE id = $1 RETURNING *';

  try {
    const result = await db.query(sql, [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Director tidak ditemukan' });
    }
    res.status(204).send(); 
  } catch (err) {
    next(err);
  }
});

// Fallback & Error Handling
app.use((req, res) => {
    res.status(404).json({error: "Route not found"});
});

app.use((err, req, res, next) => {
  console.error('[SERVERERROR]', err.stack);
  res.status(500).json({error:'Terjadi kesalahan pada server'});
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server Running on http://localhost:${port}`);
});

// Implementasi Operasi Baca
// Daftar film awal
// let movies = [
//     {id: 1, title: 'Avenger', director: 'Peter Jackson', year: 2010},
//     {id: 2, title: 'Spiderman', director: 'Peter Jackson', year: 2004},
//     {id: 3, title: 'Perjuangan Mendapatkan Santriwati', director: 'Firman Ardiansyah', year: 2025},
// ];
// console.log(movies);

// Mengembalikan daftar semua film
// app.get('/movies', (req, res) => {
//     res.json(movies);
// });

// // Mengembalikan detail satu film berdasarkan id
// app.get('/movies/:id', (req, res) => {
//     const id = Number(req.params.id);
//     const movie = movies.find(m => m.id === parseInt(req.params.id));
//     if (movie) {
//         res.json(movie);
//     } else {
//         res.status(404).send('Movie not found');
//     }
// });


// // Implementasi Operasi Tulis (CRUD)

// // Membuat film baru
// app.post('/movies', (req, res) => {
//     const {title, director, year} = req.body || {};
//     if(!title || !director || !year) {
//         returnres.status(400).json({error:'title, director, year wajib di isi'});
//     }
//     const newMovie = {id: movies.length + 1, title, director, year};
//     movies.push(newMovie);
//     res.status(201).json(newMovie);
// });

// // Memperbarui data film berdasarkan id
// app.put('/movies/:id', (req, res) => {
//     const id = Number(req.params.id);
//     const movieIndex = movies.findIndex(m => m.id === id);
//     if (movieIndex === -1) {
//         returnres.status(404).json({error: 'Movie tidak ditemukan'});
//     }
//     const {title, director, year} = req.body || {};
//     const updatedMovie = {id, title, director, year};
//     movies[movieIndex] = updatedMovie;
//     res.json(updatedMovie);
// });

// // Menghapus film berdasarkan id
// app.delete('/movies/:id', (req, res) => {
//     const id = Number(req.params.id);
//     const movieIndex = movies.findIndex(m => m.id === id);
//     if (movieIndex === -1) {
//         returnres.status(404).json({error: 'Movie tidak ditemukan'});
//     }
//     movies.splice(movieIndex, 1);
//     res.status(204).send();
// });


// // Tugas Praktikum 2

// // Daftar director/sutradara awal
// let directors = [
//     {id: '0A1', name: 'Petter Jackson', birthYear: 1961},
//     {id: '0A2', name: 'Firman Ardiansyah', birthYear: 2006},
// ];

// // Mengembalikan daftar semua sutradara
// app.get('/directors', (req, res) => {
//     res.json(directors);
// });

// // Mengembalikan detail satu sutradara berdasarkan id
// app.get('/directors/:id', (req, res) => {
//     const id = req.params.id;
//     const director = directors.find(m => m.id === req.params.id);
//     if (director) {
//         res.json(director);
//     } else {
//         res.status(404).send('Director not found');
//     }
// });

// // Memperbarui data sutradara berdasarkan id
// app.post('/directors', (req, res) => {
//     const {name, birthYear} = req.body || {};
//     if(!name || !birthYear) {
//         returnres.status(400).json({error:'name & birtYear wajib di isi'});
//     }
//     const current = directors.length + 1;
//     const newDirector = {id: `0A${current}`, name, birthYear};
//     directors.push(newDirector);
//     res.status(201).json(newDirector);
// });

// // Memperbarui data sutradara berdasarkan id
// app.put('/directors/:id', (req, res) => {
//     const id = req.params.id;
//     const directorIndex = directors.findIndex(m => m.id === id);
//     if (directorIndex === -1) {
//         returnres.status(404).json({error: 'Director not found'});
//     }
//     const {name, birthYear} = req.body || {};
//     const updatedDirector = {id, name, birthYear};
//     directors[directorIndex] = updatedDirector;
//     res.json(updatedDirector);
// });

// // Menghapus sutradara berdasarkan id
// app.delete('/directors/:id', (req, res) => {
//     const id = req.params.id;
//     const directorIndex = directors.findIndex(m => m.id === id);
//     if (directorIndex === -1) {
//         returnres.status(404).json({error: 'Director not found'});
//     }
//     directors.splice(directorIndex, 1);
//     res.status(200).send('Delete success');
// });
