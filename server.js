const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/i;
        if (allowed.test(path.extname(file.originalname)) || allowed.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed.'));
        }
    }
});

// Database Setup
const db = require('./database');
db.initDb().catch(err => console.error('Database initialization failed:', err));

const ALLOWED_RELATIONS = ['Family', 'Friend', 'Colleague'];
const NAME_PATTERN = /^[\p{L}\p{M}'\s.\-]{2,50}$/u;

function validateMessageFields(name, relation, message) {
    const trimmedName = name?.trim() ?? '';
    const trimmedRelation = relation?.trim() ?? '';
    const trimmedMessage = message?.trim() ?? '';

    if (!trimmedName || !trimmedRelation || !trimmedMessage) {
        return { error: 'Name, relationship, and message are required.' };
    }
    if (trimmedName.length < 2 || trimmedName.length > 50) {
        return { error: 'Name must be between 2 and 50 characters.' };
    }
    if (!NAME_PATTERN.test(trimmedName)) {
        return { error: 'Name contains invalid characters.' };
    }
    if (!ALLOWED_RELATIONS.includes(trimmedRelation)) {
        return { error: 'Please select a valid relationship.' };
    }
    if (trimmedMessage.length < 10) {
        return { error: 'Message must be at least 10 characters.' };
    }
    if (trimmedMessage.length > 500) {
        return { error: 'Message cannot exceed 500 characters.' };
    }
    return {
        trimmedName,
        trimmedRelation,
        trimmedMessage
    };
}

function deletePhotoFile(photoUrl) {
    if (!photoUrl || !photoUrl.startsWith('/uploads/')) return;
    const filePath = path.join(__dirname, photoUrl.replace(/^\//, '').split('/').join(path.sep));
    fs.unlink(filePath, () => {});
}

async function verifyEditToken(req, res, callback) {
    const id = req.params.id;
    const token = req.body.editToken || req.headers['x-edit-token'];
    if (!token) {
        res.status(403).json({ error: 'You can only edit or delete your own posts from this device.' });
        return;
    }
    try {
        const row = await db.getMessageById(id);
        if (!row) {
            res.status(404).json({ error: 'Message not found.' });
            return;
        }
        if (!row.editToken || row.editToken !== token) {
            res.status(403).json({ error: 'Not allowed. Only the person who posted can edit or delete.' });
            return;
        }
        callback(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// API Route: Get all messages (editToken never exposed)
app.get('/api/messages', async (req, res) => {
    try {
        const rows = await db.getMessages();
        res.json({ message: 'success', data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Route: Post a new message
app.post('/api/messages', (req, res) => {
    upload.single('photo')(req, res, async (err) => {
        if (err) {
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Photo is too large. Maximum size is 5MB.'
                : err.message;
            res.status(400).json({ error: msg });
            return;
        }

        const validated = validateMessageFields(req.body.name, req.body.relation, req.body.message);
        if (validated.error) {
            res.status(400).json({ error: validated.error });
            return;
        }

        let photoUrl = null;
        if (req.file) {
            photoUrl = `/uploads/${req.file.filename}`;
        }

        const editToken = crypto.randomUUID();
        try {
            const messageData = await db.createMessage(
                validated.trimmedName,
                validated.trimmedRelation,
                validated.trimmedMessage,
                photoUrl,
                editToken
            );
            res.json({
                message: 'success',
                data: messageData,
                editToken
            });
        } catch (runErr) {
            res.status(500).json({ error: runErr.message });
        }
    });
});

// API Route: Update a message (creator only)
app.put('/api/messages/:id', (req, res) => {
    upload.single('photo')(req, res, async (err) => {
        if (err) {
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'Photo is too large. Maximum size is 5MB.'
                : err.message;
            res.status(400).json({ error: msg });
            return;
        }

        verifyEditToken(req, res, async (existing) => {
            const validated = validateMessageFields(req.body.name, req.body.relation, req.body.message);
            if (validated.error) {
                if (req.file) deletePhotoFile(`/uploads/${req.file.filename}`);
                res.status(400).json({ error: validated.error });
                return;
            }

            let photoUrl = existing.photoUrl;
            const removePhoto = req.body.removePhoto === 'true' || req.body.removePhoto === true;

            if (req.file) {
                if (existing.photoUrl) deletePhotoFile(existing.photoUrl);
                photoUrl = `/uploads/${req.file.filename}`;
            } else if (removePhoto && existing.photoUrl) {
                deletePhotoFile(existing.photoUrl);
                photoUrl = null;
            }

            try {
                await db.updateMessage(
                    existing.id,
                    validated.trimmedName,
                    validated.trimmedRelation,
                    validated.trimmedMessage,
                    photoUrl
                );
                res.json({
                    message: 'success',
                    data: {
                        id: existing.id,
                        name: validated.trimmedName,
                        relation: validated.trimmedRelation,
                        message: validated.trimmedMessage,
                        photoUrl,
                        timestamp: existing.timestamp
                    }
                });
            } catch (runErr) {
                res.status(500).json({ error: runErr.message });
            }
        });
    });
});

// API Route: Delete a message (creator only)
app.delete('/api/messages/:id', (req, res) => {
    verifyEditToken(req, res, async (existing) => {
        try {
            await db.deleteMessage(existing.id);
            if (existing.photoUrl) deletePhotoFile(existing.photoUrl);
            res.json({ message: 'success' });
        } catch (runErr) {
            res.status(500).json({ error: runErr.message });
        }
    });
});

// Serve gallery photos
app.use('/gallery', express.static(path.join(__dirname, 'gallery')));

// API Route: Get all gallery photos
app.get('/api/gallery', (req, res) => {
    const galleryDir = path.join(__dirname, 'gallery');
    if (!fs.existsSync(galleryDir)) {
        res.json({ data: [] });
        return;
    }
    fs.readdir(galleryDir, (err, files) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const images = files.filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i)).map(f => `/gallery/${f}`);
        res.json({ data: images });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`You can view the website at http://localhost:${PORT}/index.html`);
});
