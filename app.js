
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NOTES_FILE = path.join(__dirname, 'data', 'notes.json');
const HISTORY_DIR = path.join(__dirname, 'data', 'history');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: true,
}));

const USER = {
    username: process.env.USERNAME || 'admin',
    password: process.env.PASSWORD || '123456'
};

const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'encryption-password', 'salt', 24);
const IV = Buffer.alloc(16, 0);

function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-192-cbc', ENCRYPTION_KEY, IV);
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(text) {
    const decipher = crypto.createDecipheriv('aes-192-cbc', ENCRYPTION_KEY, IV);
    return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
}

function extractTags(content) {
    const matches = content.match(/#(\w+)/g);
    return matches ? matches.map(tag => tag.substring(1)) : [];
}

function requireLogin(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
}

app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === USER.username && password === USER.password) {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.send('登录失败');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.get('/', requireLogin, (req, res) => {
    let notes = [];
    if (fs.existsSync(NOTES_FILE)) {
        const data = JSON.parse(fs.readFileSync(NOTES_FILE));
        notes = data.map(n => ({ ...n, content: decrypt(n.content) }));
    }
    const search = req.query.search || '';
    const tagFilter = req.query.tag || '';
    if (search) {
        notes = notes.filter(n => n.title.includes(search) || n.content.includes(search));
    }
    if (tagFilter) {
        notes = notes.filter(n => n.tags && n.tags.includes(tagFilter));
    }
    res.render('notes', { notes, search, tagFilter });
});

app.post('/save', requireLogin, (req, res) => {
    const { title, content } = req.body;
    let notes = [];
    if (fs.existsSync(NOTES_FILE)) {
        notes = JSON.parse(fs.readFileSync(NOTES_FILE));
    }
    const tags = extractTags(content);
    const encrypted = encrypt(content);
    const note = { title, content: encrypted, tags, time: new Date().toISOString() };
    notes.push(note);
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

    // 保存历史版本
    const filename = path.join(HISTORY_DIR, Date.now() + '.json');
    fs.writeFileSync(filename, JSON.stringify(note, null, 2));

    res.redirect('/');
});

app.get('/history', requireLogin, (req, res) => {
    const history = fs.readdirSync(HISTORY_DIR)
        .filter(f => f.endsWith('.json'))
        .map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file)));
            return {
                title: data.title,
                tags: data.tags || [],
                content: decrypt(data.content),
                time: data.time
            };
        }).sort((a, b) => new Date(b.time) - new Date(a.time));
    res.render('history', { history });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
