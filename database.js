require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

// Mengambil nama file DB dari .env (dengan fallback)
const DB_MOVIES = process.env.DB_MOVIES || "movies.db";
const DB_DIRECTORS = process.env.DB_DIRECTORS || "directors.db";

// Koneksi ke database movies || movies.db
const dbMovies = new sqlite3.Database(DB_MOVIES, (err) => {
  if (err) {
    console.error("Error connect to movies.db:", err.message);
    throw err;
  } else {
    console.log("Connected to movies.db");

    dbMovies.run(`CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, 
      director TEXT NOT NULL, 
      year INTEGER NOT NULL
    )`, (err) => {
      if (!err) {
        console.log("Table 'movies' created. Seeding initial data...");
        const insert = 'INSERT INTO movies (title, director, year) VALUES (?, ?, ?)';
        dbMovies.run(insert, ["Heavenly Creatures", "Peter Jackson", 1994]);
        dbMovies.run(insert, ["King Kong", "Peter Jackson", 2005]);
        dbMovies.run(insert, ["Spider-Man", "Sam Raimi", 2002]);
        dbMovies.run(insert, ["Aku dan Santriwati", "Firman Ardiansyah", 2025]);
      }
    });
  }
});

// Koneksi ke database directors || directors.db
const dbDirectors = new sqlite3.Database(DB_DIRECTORS, (err) => {
  if (err) {
    console.error("Error connect ke directors.db:", err.message);
    throw err;
  } else {
    console.log("Connected to directors.db");

    dbDirectors.run(`CREATE TABLE IF NOT EXISTS directors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, 
      birthYear INTEGER
    )`, (err) => {
      if (!err) {
        console.log("Table 'directors' created. Seeding initial data...");
        const insert = 'INSERT INTO directors (name, birthYear) VALUES (?, ?)';
        dbDirectors.run(insert, ["Peter Jackson", 1961]);
        dbDirectors.run(insert, ["Sam Raimi", 1959]);
        dbDirectors.run(insert, ["Firman Ardiansyah", 2006]);
      }
    });
  }
});

// Export dua koneksi database
module.exports = { dbMovies, dbDirectors };