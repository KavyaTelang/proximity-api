// index.js - THE "ALL-IN-ONE" SERVER (CORRECTED)

const express = require('express');
const db = require('./db');
const KDBush = require('kdbush');
const geokdbush = require('geokdbush');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve UI files

// --- IN-MEMORY CACHE & INDEX ---
let locationsFromDB = [];
let locationIndex;

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

async function buildIndex() {
    try {
        const { rows } = await db.query('SELECT id, name, latitude, longitude FROM locations');
        locationsFromDB = rows.map(r => ({ id: r.id, name: r.name, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude) }));
        locationIndex = new KDBush(locationsFromDB, (p) => p.longitude, (p) => p.latitude);
        console.log(`Index built for ${locationsFromDB.length} locations.`);
    } catch (error) {
        console.error("Failed to build index:", error);
    }
}

// --- API ENDPOINTS ---
app.post('/locations', async (req, res) => {
    // ... your logic
});

app.get('/nearby', (req, res) => {
    // ... your logic
});
    
// --- STARTUP LOGIC ---
buildIndex().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});