// Map Tab Functions

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: { lat: 40.7128, lng: -74.0060 },
        styles: [
            {
                elementType: "geometry",
                stylers: [{ color: "#1a1a1a" }]
            },
            {
                elementType: "labels.text.stroke",
                stylers: [{ color: "#1a1a1a" }]
            },
            {
                elementType: "labels.text.fill",
                stylers: [{ color: "#ffffff" }]
            },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#7877c6" }]
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#7877c6" }]
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ color: "#263c3f" }]
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [{ color: "#6b9a76" }]
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }]
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }]
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9ca5b3" }]
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#746855" }]
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1f2835" }]
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [{ color: "#f3d19c" }]
            },
            {
                featureType: "transit",
                elementType: "geometry",
                stylers: [{ color: "#2f3948" }]
            },
            {
                featureType: "transit.station",
                elementType: "labels.text.fill",
                stylers: [{ color: "#7877c6" }]
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }]
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#515c6d" }]
            },
            {
                featureType: "water",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#17263c" }]
            }
        ]
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    document.getElementById('mapStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('mapEndDate').value = endDate.toISOString().split('T')[0];
}

function cleanAddress(address) {
    if (!address) return '';
    
    if (address.toLowerCase().includes('pick up') || address.toLowerCase().trim() === 'pickup') {
        return '74 5th Ave, New York, NY, 10011';
    }
    
    let cleaned = address.trim();
    
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');
    cleaned = cleaned.replace(/\s*,\s*(room|floor|ste|suite|#)\s*[^,]*/gi, '');
    cleaned = cleaned.replace(/\s+(room|floor|ste|suite|#)\s+[^,\s]*/gi, '');
    cleaned = cleaned.replace(/\s*Cross Street:.*$/i, '');
    
    if (!cleaned.match(/New York,?\s*NY/i) && !cleaned.match(/NYC/i)) {
        if (!cleaned.match(/,\s*\d{5}$/)) {
            cleaned += ', New York, NY';
        } else {
            cleaned = cleaned.replace(/,\s*(\d{5})$/, ', New York, NY, $1');
        }
    }
    
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/,\s*,/g, ',');
    cleaned = cleaned.replace(/^\s*,\s*|\s*,\s*$/g, '');
    
    return cleaned;
}

async function geocodeAddress(address) {
    if (geocodeCache[address]) {
        return geocodeCache[address];
    }
    
    const cleanedAddress = cleanAddress(address);
    if (!cleanedAddress) return null;
    
    if (geocodeCache[cleanedAddress]) {
        return geocodeCache[cleanedAddress];
    }
    
    try {
        const geocoder = new google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: cleanedAddress }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0]);
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
        
        const location = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            formattedAddress: result.formatted_address
        };
        
        geocodeCache[address] = location;
        geocodeCache[cleanedAddress] = location;
        return location;
    } catch (error) {
        console.warn('Failed to geocode address:', cleanedAddress, error);
        return null;
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

async function updateMap() {
    if (!map) {
        console.warn('Map not initialized yet');
        return;
    }
    
    const startDate = document.getElementById('mapStartDate').value;
    const endDate = document.getElementById('mapEndDate').value;
    
    let mapOrders = allOrders.filter(order => {
        let matchesStartDate = true;
        let matchesEndDate = true;
        
        if (startDate && order.date) {
            matchesStartDate = order.date >= startDate;
        }
        if (endDate && order.date) {
            matchesEndDate = order.date <= endDate;
        }
        
        return matchesStartDate && matchesEndDate && order.address && order.address.trim();
    });
    
    clearMarkers();
    
    const addressGroups = {};
    let pickupCount = 0;
    
    mapOrders.forEach(order => {
        const cleanedAddr = cleanAddress(order.address);
        if (cleanedAddr.includes('74 5th Ave')) {
            pickupCount++;
        }
        
        if (!addressGroups[cleanedAddr]) {
            addressGroups[cleanedAddr] = [];
        }
        addressGroups[cleanedAddr].push(order);
    });
    
    document.getElementById('mapOrdersCount').textContent = mapOrders.length;
    document.getElementById('mapUniqueAddresses').textContent = Object.keys(addressGroups).length;
    document.getElementById('mapPickupsCount').textContent = pickupCount;
    
    for (const [address, orders] of Object.entries(addressGroups)) {
        try {
            const location = await geocodeAddress(address);
            if (location) {
                const isPickup = address.includes('74 5th Ave');
                const hasTier1 = orders.some(o => getCustomerTier(o.company) === 1);

                let markerColor = '#7877c6';
                if (isPickup) markerColor = '#10b981';
                else if (hasTier1) markerColor = '#ffd700';
                
                const marker = new google.maps.Marker({
                    position: { lat: location.lat, lng: location.lng },
                    map: map,
                    title: `${orders.length} order(s) at ${location.formattedAddress}`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: Math.max(6, Math.min(20, 6 + orders.length * 2)),
                        fillColor: markerColor,
                        fillOpacity: 0.8,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    }
                });
                
                const infoContent = `
                    <div style="color: #333; font-family: 'Montserrat', sans-serif; max-width: 300px;">
                        <h3 style="margin: 0 0 10px 0; color: #7877c6; font-size: 16px;">
                            ${isPickup ? '📦 Pickup Location' : '📍 Delivery Location'}
                        </h3>
                        <p style="margin: 0 0 10px 0; font-weight: 500;">${location.formattedAddress}</p>
                        <p style="margin: 0 0 15px 0; color: #666;"><strong>${orders.length}</strong> order(s)</p>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${orders.slice(0, 10).map(order => `
                                <div style="border-bottom: 1px solid #eee; padding: 8px 0; font-size: 14px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-weight: 500; color: #333;">${order.company}</span>
                                        <span class="tier-badge tier-${getCustomerTier(order.company)}" style="font-size: 10px; padding: 2px 6px;">T${getCustomerTier(order.company)}</span>
                                    </div>
                                    <div style="color: #666; font-size: 12px;">
                                        ${order.date} | ${order.time} | ${order.guestsRaw} guests
                                    </div>
                                    <div style="color: #7877c6; font-size: 12px;">${order.platform}</div>
                                    ${order.driver ? `<div style="color: #555; font-size: 12px; font-weight: 500;">Driver: ${order.driver}</div>` : ''}
                                </div>
                            `).join('')}
                            ${orders.length > 10 ? `<div style="text-align: center; color: #666; font-size: 12px; padding: 5px;">... and ${orders.length - 10} more</div>` : ''}
                        </div>
                    </div>
                `;
                
                const infoWindow = new google.maps.InfoWindow({
                    content: infoContent
                });
                
                marker.addListener('click', () => {
                    markers.forEach(m => {
                        if (m.infoWindow) m.infoWindow.close();
                    });
                    infoWindow.open(map, marker);
                });
                
                marker.infoWindow = infoWindow;
                markers.push(marker);
            }
        } catch (error) {
            console.warn('Failed to create marker for address:', address, error);
        }
    }
}

function showTodaysOrdersOnMap() {
    const today = getTodaysDate();
    document.getElementById('mapStartDate').value = today;
    document.getElementById('mapEndDate').value = today;
    updateMap();
}

function setMapDateRange(range) {
    const endDate = new Date();
    const startDate = new Date();
    
    if (range === '7days') {
        startDate.setDate(endDate.getDate() - 7);
    } else if (range === '30days') {
        startDate.setDate(endDate.getDate() - 30);
    }
    
    document.getElementById('mapStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('mapEndDate').value = endDate.toISOString().split('T')[0];
    
    updateMap();
}