// Global variables
let map;
let markers = [];
let currentMarker = null;
let isFullscreen = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    loadSavedMarkers();
});

// Initialize the map
function initializeMap() {
    // Create map centered on Indonesia
    map = L.map('map').setView([-2.5489, 118.0149], 5);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add click event to get coordinates
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Update coordinate inputs
        document.getElementById('latInput').value = lat.toFixed(6);
        document.getElementById('lngInput').value = lng.toFixed(6);
        
        // Update current position display
        updateCurrentPosition(lat, lng);
        
        // Add temporary marker
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        currentMarker = L.marker([lat, lng]).addTo(map);
        
        // Remove temporary marker after 3 seconds
        setTimeout(() => {
            if (currentMarker) {
                map.removeLayer(currentMarker);
                currentMarker = null;
            }
        }, 3000);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });
    
    // Coordinate navigation
    document.getElementById('goToCoordBtn').addEventListener('click', goToCoordinates);
    
    // Marker functionality
    document.getElementById('addMarkerBtn').addEventListener('click', addMarker);
    
    // Map controls
    document.getElementById('getLocationBtn').addEventListener('click', getCurrentLocation);
    document.getElementById('clearMarkersBtn').addEventListener('click', clearAllMarkers);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    
    // Enter key for coordinate inputs
    document.getElementById('latInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            goToCoordinates();
        }
    });
    
    document.getElementById('lngInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            goToCoordinates();
        }
    });
}

// Search location using Nominatim API
async function searchLocation() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a location to search', 'warning');
        return;
    }
    
    const searchBtn = document.getElementById('searchBtn');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<div class="loading"></div>';
    searchBtn.disabled = true;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await response.json();
        
        if (data.length > 0) {
            const location = data[0];
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lon);
            
            // Update map view
            map.setView([lat, lng], 13);
            
            // Update coordinate inputs
            document.getElementById('latInput').value = lat.toFixed(6);
            document.getElementById('lngInput').value = lng.toFixed(6);
            
            // Update current position
            updateCurrentPosition(lat, lng);
            
            // Add temporary marker
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            currentMarker = L.marker([lat, lng]).addTo(map);
            
            showNotification(`Found: ${location.display_name}`, 'success');
        } else {
            showNotification('Location not found. Please try a different search term.', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Error searching for location. Please try again.', 'error');
    } finally {
        searchBtn.innerHTML = originalText;
        searchBtn.disabled = false;
    }
}

// Go to specific coordinates
function goToCoordinates() {
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    
    if (isNaN(lat) || isNaN(lng)) {
        showNotification('Please enter valid coordinates', 'warning');
        return;
    }
    
    if (lat < -90 || lat > 90) {
        showNotification('Latitude must be between -90 and 90', 'warning');
        return;
    }
    
    if (lng < -180 || lng > 180) {
        showNotification('Longitude must be between -180 and 180', 'warning');
        return;
    }
    
    // Update map view
    map.setView([lat, lng], 13);
    
    // Update current position
    updateCurrentPosition(lat, lng);
    
    // Add temporary marker
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    currentMarker = L.marker([lat, lng]).addTo(map);
    
    showNotification(`Navigated to coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'success');
}

// Add marker to the map
function addMarker() {
    const title = document.getElementById('markerTitle').value.trim();
    const description = document.getElementById('markerDescription').value.trim();
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    
    if (!title) {
        showNotification('Please enter a marker title', 'warning');
        return;
    }
    
    if (isNaN(lat) || isNaN(lng)) {
        showNotification('Please enter valid coordinates first', 'warning');
        return;
    }
    
    // Create marker
    const marker = L.marker([lat, lng]).addTo(map);
    
    // Create popup content
    const popupContent = `
        <div class="marker-popup">
            <h4>${title}</h4>
            ${description ? `<p>${description}</p>` : ''}
            <p><strong>Coordinates:</strong><br>
            ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            <button onclick="removeMarker(${markers.length})" class="remove-marker-btn">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    // Store marker data
    const markerData = {
        lat: lat,
        lng: lng,
        title: title,
        description: description,
        marker: marker
    };
    
    markers.push(markerData);
    
    // Save to localStorage
    saveMarkers();
    
    // Clear form
    document.getElementById('markerTitle').value = '';
    document.getElementById('markerDescription').value = '';
    
    showNotification(`Marker "${title}" added successfully`, 'success');
}

// Remove specific marker
function removeMarker(index) {
    if (index >= 0 && index < markers.length) {
        const markerData = markers[index];
        map.removeLayer(markerData.marker);
        markers.splice(index, 1);
        saveMarkers();
        showNotification('Marker removed successfully', 'success');
    }
}

// Clear all markers
function clearAllMarkers() {
    if (markers.length === 0) {
        showNotification('No markers to clear', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to remove all markers?')) {
        markers.forEach(markerData => {
            map.removeLayer(markerData.marker);
        });
        markers = [];
        saveMarkers();
        showNotification('All markers cleared', 'success');
    }
}

// Get current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by this browser', 'error');
        return;
    }
    
    const getLocationBtn = document.getElementById('getLocationBtn');
    const originalHTML = getLocationBtn.innerHTML;
    getLocationBtn.innerHTML = '<div class="loading"></div>';
    getLocationBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update map view
            map.setView([lat, lng], 15);
            
            // Update coordinate inputs
            document.getElementById('latInput').value = lat.toFixed(6);
            document.getElementById('lngInput').value = lng.toFixed(6);
            
            // Update current position
            updateCurrentPosition(lat, lng);
            
            // Add temporary marker
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            currentMarker = L.marker([lat, lng]).addTo(map);
            
            showNotification('Location found!', 'success');
        },
        function(error) {
            let errorMessage = 'Unable to retrieve your location';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
                    break;
            }
            showNotification(errorMessage, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    ).finally(() => {
        getLocationBtn.innerHTML = originalHTML;
        getLocationBtn.disabled = false;
    });
}

// Toggle fullscreen mode
function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!isFullscreen) {
        if (mapContainer.requestFullscreen) {
            mapContainer.requestFullscreen();
        } else if (mapContainer.webkitRequestFullscreen) {
            mapContainer.webkitRequestFullscreen();
        } else if (mapContainer.msRequestFullscreen) {
            mapContainer.msRequestFullscreen();
        }
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
    
    isFullscreen = !isFullscreen;
    
    // Trigger map resize after fullscreen change
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// Update current position display
function updateCurrentPosition(lat, lng) {
    const currentPosition = document.getElementById('currentPosition');
    currentPosition.innerHTML = `
        <p><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
        <p><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
        <p><strong>Decimal Degrees:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
        <p><strong>DMS:</strong> ${decimalToDMS(lat, 'lat')}, ${decimalToDMS(lng, 'lng')}</p>
    `;
}

// Convert decimal degrees to DMS format
function decimalToDMS(decimal, type) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
    
    let direction = '';
    if (type === 'lat') {
        direction = decimal >= 0 ? 'N' : 'S';
    } else {
        direction = decimal >= 0 ? 'E' : 'W';
    }
    
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

// Save markers to localStorage
function saveMarkers() {
    const markersData = markers.map(markerData => ({
        lat: markerData.lat,
        lng: markerData.lng,
        title: markerData.title,
        description: markerData.description
    }));
    localStorage.setItem('savedMarkers', JSON.stringify(markersData));
}

// Load saved markers from localStorage
function loadSavedMarkers() {
    const savedMarkers = localStorage.getItem('savedMarkers');
    if (savedMarkers) {
        try {
            const markersData = JSON.parse(savedMarkers);
            markersData.forEach(data => {
                const marker = L.marker([data.lat, data.lng]).addTo(map);
                
                const popupContent = `
                    <div class="marker-popup">
                        <h4>${data.title}</h4>
                        ${data.description ? `<p>${data.description}</p>` : ''}
                        <p><strong>Coordinates:</strong><br>
                        ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</p>
                        <button onclick="removeMarker(${markers.length})" class="remove-marker-btn">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                `;
                
                marker.bindPopup(popupContent);
                
                markers.push({
                    lat: data.lat,
                    lng: data.lng,
                    title: data.title,
                    description: data.description,
                    marker: marker
                });
            });
            
            if (markersData.length > 0) {
                showNotification(`${markersData.length} saved markers loaded`, 'info');
            }
        } catch (error) {
            console.error('Error loading saved markers:', error);
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    .marker-popup {
        text-align: center;
    }
    
    .marker-popup h4 {
        margin: 0 0 10px 0;
        color: #333;
    }
    
    .marker-popup p {
        margin: 5px 0;
        font-size: 14px;
        color: #666;
    }
    
    .remove-marker-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 10px;
        transition: background 0.3s ease;
    }
    
    .remove-marker-btn:hover {
        background: #c82333;
    }
`;
document.head.appendChild(notificationStyles);

// Handle fullscreen change events
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (document.fullscreenElement || document.webkitFullscreenElement || 
        document.mozFullScreenElement || document.msFullscreenElement) {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        isFullscreen = true;
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        isFullscreen = false;
    }
    
    // Trigger map resize
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
} 