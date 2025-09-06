// api/index.js - FINAL GUARANTEED VERSION

const express = require('express');
const { Pool } = require('pg'); // <-- DB logic is now inside this file
const KDBush = require('kdbush');
const geokdbush = require('geokdbush');

const app = express();

// --- DATABASE CONNECTION ---
// This connects directly using the environment variable Vercel provides.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- MIDDLEWARE ---
app.use(express.json());

// --- IN-MEMORY CACHE & INDEX ---
let locationsFromDB = [];
let locationIndex;

// --- HELPER & BUILD FUNCTIONS ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 0.5 - Math.cos(dLat) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

async function buildIndex() {
    try {
        console.log("Fetching locations from DB to build index...");
        const { rows } = await pool.query('SELECT id, name, latitude, longitude FROM locations');
        locationsFromDB = rows.map(r => ({
            id: r.id, name: r.name, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude)
        }));
        console.log(`Building index for ${locationsFromDB.length} locations...`);
        locationIndex = new KDBush(locationsFromDB, (p) => p.longitude, (p) => p.latitude);
        console.log("Index built successfully.");
    } catch (error) {
        console.error("Failed to build index:", error);
    }
}

// --- API ROUTES ---
// These are automatically prefixed with /api by Vercel
app.post('/locations', async (req, res) => {
    const { name, latitude, longitude } = req.body;
    if (!name || latitude === undefined || longitude === undefined) { return res.status(400).json({ error: 'Missing required fields' }); }
    try {
        const result = await pool.query('INSERT INTO locations(name, latitude, longitude) VALUES($1, $2, $3) RETURNING *', [name, latitude, longitude]);
        buildIndex(); // Re-build the index after adding a new location
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
    if (!locationIndex) {
        // If index isn't ready, build it, then respond.
        console.log("Index not ready, building now...");
        return buildIndex().then(() => {
            if (!locationIndex) return res.status(500).json({ error: "Failed to build index" });
            const nearestPoints = geokdbush.around(locationIndex, userLon, userLat, parseInt(limit));
            const results = nearestPoints.map(point => ({ ...point, distance: `${getDistance(userLat, userLon, point.latitude, point.longitude).toFixed(2)} km` }));
            res.json(results);
        });
    }
    const nearestPoints = geokdbush.around(locationIndex, userLon, userLat, parseInt(limit));
    const results = nearestPoints.map(point => ({ ...point, distance: `${getDistance(userLat, userLon, point.latitude, point.longitude).toFixed(2)} km` }));
    res.json(results);
});

// --- STARTUP LOGIC & EXPORT ---
// Build the index when the function starts up.
buildIndex();

// Vercel needs you to export the app. It handles the listening.
module.exports = app;