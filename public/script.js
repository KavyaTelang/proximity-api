// public/script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT SELECTION ---
    const addForm = document.getElementById('add-location-form');
    const addStatus = document.getElementById('add-status');
    const findForm = document.getElementById('find-nearby-form');
    const resultsList = document.getElementById('results-list');
    const userLatInput = document.getElementById('user-lat');
    const userLonInput = document.getElementById('user-lon');
    const getLocationBtn = document.getElementById('get-location-btn');
    const loadingMessage = document.getElementById('loading-message');

    // --- "USE MY LOCATION" FEATURE ---
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        userLatInput.value = position.coords.latitude.toFixed(6);
                        userLonInput.value = position.coords.longitude.toFixed(6);
                    },
                    (error) => {
                        alert(`Error getting location: ${error.message}`);
                    }
                );
            } else {
                alert("Geolocation is not supported by this browser.");
            }
        });
    }

    // --- FIND NEARBY LOGIC ---
    if (findForm) {
        findForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userLat = userLatInput.value;
            const userLon = userLonInput.value;

            if (!userLat || !userLon) {
                alert('Please provide your latitude and longitude.');
                return;
            }

            resultsList.innerHTML = '';
            loadingMessage.classList.remove('hidden');

            try {
                const url = `/nearby?lat=${userLat}&lon=${userLon}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Server responded with an error.');
                const results = await response.json();

                loadingMessage.classList.add('hidden');
                
                if (results.length === 0) {
                    resultsList.innerHTML = '<p>No locations found nearby. Try adding some first!</p>';
                    return;
                }

                results.forEach(loc => {
                    const card = document.createElement('div');
                    card.className = 'result-card';
                    card.innerHTML = `
                        <div class="icon"><i class="fa-solid fa-location-dot"></i></div>
                        <div class="info">
                            <h3>${loc.name}</h3>
                            <p>Distance: ${loc.distance}</p>
                        </div>
                    `;
                    resultsList.appendChild(card);
                });

            } catch (error) {
                loadingMessage.classList.add('hidden');
                resultsList.innerHTML = '<p>Error finding locations. Please try again.</p>';
                console.error(error);
            }
        });
    }

    // --- ADMIN: ADD LOCATION LOGIC ---
    if (addForm) {
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
                if (!response.ok) throw new Error('Server responded with an error.');
                const data = await response.json();
                addStatus.textContent = `Success: Added ${data.name}! The index is rebuilding.`;
                addForm.reset();
            } catch (error) {
                addStatus.textContent = 'Error adding location.';
                console.error(error);
            }
        });
    }
});