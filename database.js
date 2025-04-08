
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('bills.db', (err) => {
    if (err) {
        console.error('Could not connect to database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create tables
db.serialize(() => {
    // Valid bills table
    db.run(`CREATE TABLE IF NOT EXISTS valid_bills (
        serial_number TEXT PRIMARY KEY,
        bill_value INTEGER
    )`);

    // Tracked bills table
    db.run(`CREATE TABLE IF NOT EXISTS tracked_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_number TEXT,
        city TEXT,
        state TEXT,
        date TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Log table contents for debugging
    db.all("SELECT * FROM valid_bills", [], (err, rows) => {
        if (err) {
            console.error('Error checking valid bills:', err);
        } else {
            console.log('Valid bills in database:', rows);
        }
    });
});

module.exports = db;
