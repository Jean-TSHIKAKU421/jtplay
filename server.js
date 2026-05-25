const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// API Users
app.get('/api/users', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'users.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(JSON.parse(data));
    });
});

app.put('/api/users', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'users.json');
    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf8', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API Films
app.get('/api/films', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'films.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(JSON.parse(data));
    });
});

app.put('/api/films', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'films.json');
    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf8', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Route pour la page d'accueil et fichiers statiques (en dernier)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});