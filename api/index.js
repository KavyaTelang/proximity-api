const express = require('express');
const db = require('../db');
const KDBush = require('kdbush');
const geokdbush = require('geokdbush'); // <-- Import geokdbush
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// --- IN-MEMORY CACHE & INDEX ---
let locationsFromDB = [];
let locationIndex; // This will still be a KDBush index

// --- HELPER FUNCTION ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// --- FUNCTION TO BUILD THE INDEX ---
async function buildIndex() {
    try {
        console.log("Fetching locations from DB to build index...");
        const { rows } = await db.query('SELECT id, name, latitude, longitude FROM locations');
        locationsFromDB = rows.map(r => ({
            id: r.id,
            name: r.name,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude)
        }));
        console.log(`Building index for ${locationsFromDB.length} locations...`);
        locationIndex = new KDBush(locationsFromDB, (p) => p.longitude, (p) => p.latitude);
        console.log("Index built successfully.");
    } catch (error) {
        console.error("Failed to build index:", error);
    }
}

// --- API ENDPOINTS ---

app.post('/locations', async (req, res) => {
    // ... (This endpoint remains the same)
    const { name, latitude, longitude } = req.body;
    if (!name || latitude === undefined || longitude === undefined) { return res.status(400).json({ error: 'Missing required fields' }); }
    try {
        const result = await db.query('INSERT INTO locations(name, latitude, longitude) VALUES($1, $2, $3) RETURNING *', [name, latitude, longitude]);
        buildIndex();
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/nearby', (req, res) => {
    const { lat, lon, limit = 5 } = req.query;
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    if (isNaN(userLat) || isNaN(userLon)) { return res.status(400).json({ error: 'Invalid lat/lon parameters' }); }
    if (!locationIndex) { return res.status(503).json({ error: "Index is not ready." }); }

    // THIS IS THE CORRECTED PART
    // Use geokdbush.around to query the index
    const nearestPoints = geokdbush.around(locationIndex, userLon, userLat, parseInt(limit));

    const results = nearestPoints.map(point => {
        const distance = getDistance(userLat, userLon, point.latitude, point.longitude);
        return { ...point, distance: `${distance.toFixed(2)} km` };
    });
    res.json(results);
});

// --- STARTUP LOGIC ---
buildIndex().then(() => {
    module.exports = app;
});