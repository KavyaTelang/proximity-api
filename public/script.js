// public/script.js

// --- Section 1: Add Location Form ---
const addForm = document.getElementById('add-location-form');
const addStatus = document.getElementById('add-status');

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;

    addStatus.textContent = 'Adding...';

    try {
        const response = await fetch('/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, latitude, longitude })
        });
        
        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }

        const data = await response.json();
        addStatus.textContent = `Successfully added: ${data.name} (ID: ${data.id})`;
        addForm.reset(); // Clear the form
    } catch (error) {
        addStatus.textContent = 'Error adding location.';
        console.error(error);
    }
});


// --- Section 2: Find Nearby Form ---
const findForm = document.getElementById('find-nearby-form');
const resultsList = document.getElementById('results-list');

findForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userLat = document.getElementById('user-lat').value;
    const userLon = document.getElementById('user-lon').value;

    resultsList.innerHTML = '<li>Searching...</li>';

    try {
        // Construct the URL with query parameters
        const url = `/nearby?lat=${userLat}&lon=${userLon}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }

        const results = await response.json();

        // Clear the list
        resultsList.innerHTML = '';
        
        if (results.length === 0) {
            resultsList.innerHTML = '<li>No locations found nearby.</li>';
            return;
        }

        // Populate the list with results
        results.forEach(loc => {
            const listItem = document.createElement('li');
            listItem.textContent = `${loc.name} - Distance: ${loc.distance}`;
            resultsList.appendChild(listItem);
        });

    } catch (error) {
        resultsList.innerHTML = '<li>Error finding locations.</li>';
        console.error(error);
    }
});