const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'lite-notes-secret',
    resave: false,
    saveUninitialized: true
}));

// 确保 data 目录存在
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}
if (!fs.existsSync('./data/notes.json')) {
    fs.writeFileSync('./data/notes.json', '{}');
}
if (!fs.existsSync('./data/history')) {
    fs.mkdirSync('./data/history');
}

// 登录检查中间件
function requireLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// 登录接口
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.send('密码错误');
    }
});

// 获取笔记内容
app.get('/note', requireLogin, (req, res) => {
    const data = JSON.parse(fs.readFileSync('./data/notes.json', 'utf8'));
    res.json(data);
});

// 保存笔记内容并保存历史记录
app.post('/save', requireLogin, (req, res) => {
    const content = req.body.content;
    const timestamp = Date.now();
    const historyPath = `./data/history/${timestamp}.json`;

    try {
        // 保存当前内容
        fs.writeFileSync('./data/notes.json', JSON.stringify({ content }));

        // 保存历史版本
        fs.writeFileSync(historyPath, JSON.stringify({ content, timestamp }));

        res.json({ success: true });
    } catch (error) {
        console.error('保存出错：', error);
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 获取历史记录列表
app.get('/history', requireLogin, (req, res) => {
    try {
        const files = fs.readdirSync('./data/history')
            .filter(name => name.endsWith('.json'))
            .map(name => parseInt(name.replace('.json', '')))
            .sort((a, b) => b - a);

        res.json(files);
    } catch (error) {
        console.error('读取历史出错：', error);
        res.status(500).json({ success: false, message: '读取历史失败' });
    }
});

// 获取某个历史记录的内容
app.get('/history/:timestamp', requireLogin, (req, res) => {
    const { timestamp } = req.params;
    const filepath = `./data/history/${timestamp}.json`;
    if (fs.existsSync(filepath)) {
        const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json(content);
    } else {
        res.status(404).json({ message: '记录不存在' });
    }
});

// 登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

app.listen(PORT, () => {
    console.log(`服务器已启动，端口：${PORT}`);
});
