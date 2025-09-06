// index.js - VERSION 1 (NAIVE)

const express = require('express');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- HELPER FUNCTION ---
// Haversine formula to calculate distance between two lat/lon points
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
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
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to find nearby locations (the slow way)
app.get('/nearby', async (req, res) => {
    const { lat, lon, limit = 5 } = req.query;
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: 'Invalid lat/lon parameters' });
    }

    try {
        // 1. Fetch ALL locations from the database
        const allLocationsResult = await db.query('SELECT * FROM locations');
        const allLocations = allLocationsResult.rows;

        // 2. Calculate distance for each location
        const locationsWithDistance = allLocations.map(loc => {
            const distance = getDistance(userLat, userLon, parseFloat(loc.latitude), parseFloat(loc.longitude));
            return { ...loc, distance };
        });

        // 3. Sort the entire array by distance
        locationsWithDistance.sort((a, b) => a.distance - b.distance);

        // 4. Return the top N results
        const nearbyLocations = locationsWithDistance.slice(0, parseInt(limit));
        
        res.json(nearbyLocations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});