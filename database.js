const path = require('path');
const fs = require('fs');

let dbClient;
let isPostgres = false;

// Check if we should connect to PostgreSQL (Render Cloud) or local SQLite
if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    dbClient = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Neon/Supabase SSL connections
        }
    });
    isPostgres = true;
    console.log('Database client: Connected to Cloud PostgreSQL Database.');
} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbDir = path.join(__dirname, '.data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir);
    }
    const dbPath = path.join(dbDir, 'messages.db');
    const sqliteDb = new sqlite3.Database(dbPath);
    
    // Promisify SQLite methods for a clean async interface matching PostgreSQL
    dbClient = {
        run: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                sqliteDb.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        },
        all: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                sqliteDb.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        },
        get: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                sqliteDb.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }
    };
    console.log('Database client: Connected to Local SQLite Database.');
}

// 1. Initialize Database Tables
async function initDb() {
    if (isPostgres) {
        // Create table in PostgreSQL
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                relation VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                photoUrl TEXT,
                editToken TEXT,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } else {
        // Create table in SQLite
        await dbClient.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                relation TEXT NOT NULL,
                message TEXT NOT NULL,
                photoUrl TEXT,
                editToken TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add editToken column if it doesn't exist (migration compatibility)
        try {
            await dbClient.run(`ALTER TABLE messages ADD COLUMN editToken TEXT`);
        } catch (e) {
            // Ignore error if column already exists
        }
    }
}

// Helper to normalize column names from database engines (PostgreSQL returns lowercase keys)
function normalizeRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        relation: row.relation,
        message: row.message,
        photoUrl: row.photourl !== undefined ? row.photourl : row.photoUrl,
        editToken: row.edittoken !== undefined ? row.edittoken : row.editToken,
        timestamp: row.timestamp
    };
}

// 2. Get All Messages (editToken omitted for security)
async function getMessages() {
    const sql = `SELECT id, name, relation, message, photoUrl, timestamp FROM messages ORDER BY timestamp ASC`;
    if (isPostgres) {
        const res = await dbClient.query(sql);
        return res.rows.map(normalizeRow);
    } else {
        const rows = await dbClient.all(sql);
        return rows.map(normalizeRow);
    }
}

// 3. Get Single Message by ID (includes editToken for ownership checks)
async function getMessageById(id) {
    if (isPostgres) {
        const res = await dbClient.query(`SELECT * FROM messages WHERE id = $1`, [id]);
        return normalizeRow(res.rows[0]);
    } else {
        const row = await dbClient.get(`SELECT * FROM messages WHERE id = ?`, [id]);
        return normalizeRow(row);
    }
}

// 4. Create New Message
async function createMessage(name, relation, message, photoUrl, editToken) {
    if (isPostgres) {
        const sql = `
            INSERT INTO messages (name, relation, message, photoUrl, editToken)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, timestamp
        `;
        const res = await dbClient.query(sql, [name, relation, message, photoUrl, editToken]);
        return {
            id: res.rows[0].id,
            name,
            relation,
            message,
            photoUrl,
            timestamp: res.rows[0].timestamp
        };
    } else {
        const sql = `
            INSERT INTO messages (name, relation, message, photoUrl, editToken)
            VALUES (?, ?, ?, ?, ?)
        `;
        const res = await dbClient.run(sql, [name, relation, message, photoUrl, editToken]);
        return {
            id: res.lastID,
            name,
            relation,
            message,
            photoUrl,
            timestamp: new Date().toISOString()
        };
    }
}

// 5. Update Existing Message
async function updateMessage(id, name, relation, message, photoUrl) {
    if (isPostgres) {
        const sql = `
            UPDATE messages 
            SET name = $1, relation = $2, message = $3, photoUrl = $4 
            WHERE id = $5
        `;
        await dbClient.query(sql, [name, relation, message, photoUrl, id]);
    } else {
        const sql = `
            UPDATE messages 
            SET name = ?, relation = ?, message = ?, photoUrl = ? 
            WHERE id = ?
        `;
        await dbClient.run(sql, [name, relation, message, photoUrl, id]);
    }
}

// 6. Delete Message by ID
async function deleteMessage(id) {
    if (isPostgres) {
        await dbClient.query(`DELETE FROM messages WHERE id = $1`, [id]);
    } else {
        await dbClient.run(`DELETE FROM messages WHERE id = ?`, [id]);
    }
}

module.exports = {
    initDb,
    getMessages,
    getMessageById,
    createMessage,
    updateMessage,
    deleteMessage
};
