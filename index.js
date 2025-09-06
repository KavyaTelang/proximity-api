// index.js - VERSION 2 (OPTIMIZED)

const express = require('express');
const db = require('./db');
const KDBush = require('kdbush'); // <-- Import the library
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// --- IN-MEMORY CACHE & INDEX ---
let locationsFromDB = [];
let locationIndex;

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
        
        // Important: Convert latitude/longitude from string to number
        locationsFromDB = rows.map(r => ({
            id: r.id,
            name: r.name,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude)
        }));

        console.log(`Building index for ${locationsFromDB.length} locations...`);
        // The index needs to know how to get x (longitude) and y (latitude) from each point
        locationIndex = new KDBush(locationsFromDB, (p) => p.longitude, (p) => p.latitude);
        console.log("Index built successfully.");
    } catch (error) {
        console.error("Failed to build index:", error);
    }
}

// --- API ENDPOINTS ---

// Endpoint to add a new location
app.post('/locations', async (req, res) => {
    const { name, latitude, longitude } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const result = await db.query(
            'INSERT INTO locations(name, latitude, longitude) VALUES($1, $2, $3) RETURNING *',
            [name, latitude, longitude]
        );
        
        // VERY IMPORTANT: Re-build the index after adding a new location!
        buildIndex(); 
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to find nearby locations (the FAST way)
app.get('/nearby', (req, res) => {
    const { lat, lon, limit = 5 } = req.query;
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: 'Invalid lat/lon parameters' });
    }

    // Check if the index is ready
    if (!locationIndex) {
        return res.status(503).json({ error: "Index is not ready. Please try again in a moment." });
    }

    // 1. Use the index to find the N nearest points INSTANTLY
    const nearestPointIndexes = locationIndex.around(userLon, userLat, parseInt(limit));

    // 2. Get the full location data and calculate exact distance
    const results = nearestPointIndexes.map(i => {
        const point = locationsFromDB[i];
        const distance = getDistance(userLat, userLon, point.latitude, point.longitude);
        return {
            ...point,
            distance: `${distance.toFixed(2)} km`
        };
    });

    res.json(results);
});

// Build the index for the first time when the server starts
buildIndex().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});