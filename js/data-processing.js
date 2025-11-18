// Data loading and processing functions

async function loadDataFromGoogleSheets() {
    const orbitalRange = `${connectionConfig.orbitalTab}!A:AC`;
    const orbitalUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${orbitalRange}?key=${connectionConfig.apiKey}`;
    
    const orbitalResponse = await fetch(orbitalUrl);
    const orbitalData = await orbitalResponse.json();
    
    if (orbitalData.error) {
        throw new Error(`Orbital data: ${orbitalData.error.message}`);
    }

    allOrders = processOrbitalData(orbitalData.values);
    calculateCustomerTiers();
    await initializeInteractions();
}

function processOrbitalData(rawData) {
    if (!rawData || rawData.length < 2) {
        return [];
    }

    const rows = rawData.slice(1);

    const processedOrders = rows.filter(row => {
        const dateStr = row[2];
        const canceled = row[6];
        
        if (canceled && canceled.toString().trim().toLowerCase() === 'y') {
            return false;
        }
        
        return dateStr && typeof dateStr === 'string' && 
               (dateStr.includes('2024') || dateStr.includes('2025') || 
                dateStr.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i));
    }).map((row, index) => {
        const parsedDate = parseDate(row[2]);
        
        return {
            id: index + 1,
            date: parsedDate,
            originalDate: row[2],
            time: standardizeTime(row[4] || ''),
            platform: standardizePlatform(row[3] || ''),
            company: (row[8] || 'Unknown').trim(),
            brand: (row[7] || '').trim(),
            address: (row[9] || '').trim(),
            guests: parseGuestCount(row[10]),
            guestsRaw: (row[10] || '').toString().trim(),
            contactPerson: (row[11] || '').trim(),
            phoneNumber: (row[13] || '').trim(),
            customerRequests: (row[18] || '').trim(),
            driver: (row[22] || '').trim(),
            productionStatus: (row[14] || '').trim()
        };
    }).filter(order => order.date && order.date !== '');

    return processedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function parseDate(dateStr) {
    if (!dateStr) return '';
    
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Date parsing error for:', dateStr, error);
    }
    
    return '';
}

function parseGuestCount(guestStr) {
    if (!guestStr) return 0;
    
    const str = String(guestStr).trim();
    if (!str) return 0;
    
    // Handle ranges like "20-50" or "10 - 20"
    if (str.includes('-')) {
        const parts = str.split('-').map(p => p.trim());
        if (parts.length === 2) {
            const start = parseFloat(parts[0]);
            const end = parseFloat(parts[1]);
            if (!isNaN(start) && !isNaN(end)) {
                return Math.round((start + end) / 2);
            }
        }
    }
    
    // Handle "100+" format
    if (str.includes('+')) {
        const number = parseFloat(str.replace('+', ''));
        if (!isNaN(number) && number <= 1000) {
            return Math.round(number);
        }
    }
    
    // Handle regular numbers
    const match = str.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
        const number = parseFloat(match[1]);
        if (number > 1000) {
            return 0;
        }
        return Math.round(number);
    }
    
    return 0;
}

function standardizeTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.replace(/\s+/g, ' ')
                 .replace(/- /g, ' - ')
                 .replace(/AM/gi, 'AM')
                 .replace(/PM/gi, 'PM')
                 .trim();
}

function standardizePlatform(platform) {
    if (!platform) return 'Direct';
    
    const cleaned = platform.replace(/[\b]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();
    
    if (cleaned.includes('catercow') || cleaned.includes('caterocow') || cleaned.includes('catecow') || cleaned.includes('cartercow')) return 'CaterCow';
    if (cleaned.includes('clubfeast')) return 'ClubFeast';
    if (cleaned.includes('doordash') || cleaned.includes('door dash')) return 'DoorDash';
    if (cleaned.includes('ezcater') || cleaned.includes('ez cater')) return 'ezCater';
    if (cleaned.includes('fooda')) return 'Fooda';
    if (cleaned.includes('fokable') || cleaned.includes('forkale')) return 'Forkable';
    if (cleaned.includes('sharebite') || cleaned.includes('share bite')) return 'ShareBite';
    if (cleaned.includes('zercocater')) return 'Zerocater';
    if (cleaned.includes('grubhub')) return 'Grubhub';
    if (cleaned.includes('clubfeast')) return 'Club Feast';
    if (cleaned.includes('relish')) return 'Relish';
    if (cleaned.includes('forkable ewb')) return 'Forkable EWB';
    if (cleaned.includes('foodie for all')) return 'Foodie for All';
    if (cleaned.includes('flex catering')) return 'Flex Catering';
    if (cleaned === 'na') return 'N/A';
    
    return platform.replace(/[\b]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
}

function calculateCustomerTiers() {
    const companyStats = {};
    const thirdPartyPlatforms = ['ezCater', 'CaterCow', 'ShareBite', 'DoorDash', 'Grubhub', 'Flex Catering'];

    // Calculate stats for each company (only third-party platform orders)
    allOrders.forEach(order => {
        if (!order.company || order.company.toLowerCase() === 'unknown') return;

        // Only include orders from third-party platforms
        if (!thirdPartyPlatforms.includes(order.platform)) return;

        if (!companyStats[order.company]) {
            companyStats[order.company] = {
                orders: [],
                totalOrders: 0,
                brands: new Set(),
                platforms: new Set(),
                totalGuests: 0,
                avgGuests: 0
            };
        }

        const stats = companyStats[order.company];
        stats.orders.push(order);
        stats.totalOrders++;
        if (order.brand) stats.brands.add(order.brand);
        if (order.platform) stats.platforms.add(order.platform);
        stats.totalGuests += order.guests;
        stats.avgGuests = stats.totalGuests / stats.totalOrders;
    });
    
    // Calculate tiers based on scoring
    Object.keys(companyStats).forEach(company => {
        const stats = companyStats[company];
        let score = 0;
        
        // Order frequency scoring (0-40 points)
        if (stats.totalOrders >= 5) score += 40;
        else if (stats.totalOrders >= 3) score += 25;
        else if (stats.totalOrders >= 2) score += 15;
        else score += 5;
        
        // Average headcount scoring (0-30 points)
        if (stats.avgGuests >= 50) score += 30;
        else if (stats.avgGuests >= 30) score += 20;
        else if (stats.avgGuests >= 20) score += 15;
        else if (stats.avgGuests >= 10) score += 10;
        else score += 5;
        
        // Brand diversity scoring (0-30 points)
        const brandCount = stats.brands.size;
        if (brandCount >= 3) score += 30;
        else if (brandCount >= 2) score += 20;
        else score += 10;
        
        // Platform usage indicates they're not direct yet (bonus for conversion potential)
        const nonDirectPlatforms = Array.from(stats.platforms).filter(p => p !== 'Direct').length;
        if (nonDirectPlatforms >= 2) score += 10;
        else if (nonDirectPlatforms >= 1) score += 5;
        
        // Assign tier based on total score
        let tier;
        if (score >= 70) tier = 1;  // High potential
        else if (score >= 45) tier = 2;  // Medium potential
        else tier = 3;  // Low potential
        
        customerTiers[company] = {
            tier: tier,
            score: score,
            stats: stats
        };
    });
}

async function initializeInteractions() {
    try {
        customerInteractions = await loadInteractionsFromSheets();
    } catch (error) {
        console.warn('Could not load interactions from sheets, using localStorage fallback');
        const stored = localStorage.getItem('customerInteractions');
        if (stored) {
            try {
                customerInteractions = JSON.parse(stored);
            } catch (e) {
                customerInteractions = {};
            }
        } else {
            customerInteractions = {};
        }
    }
}

async function appendToSheet(sheetName, values) {
    const range = `${sheetName}!A:H`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${INTERACTIONS_SHEET_ID}/values/${range}:append?valueInputOption=RAW&key=${connectionConfig.apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            values: [values]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to write to sheet: ${response.statusText}`);
    }
    
    return response.json();
}

async function loadInteractionsFromSheets() {
    const range = 'CustomerInteractions!A:H';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${INTERACTIONS_SHEET_ID}/values/${range}?key=${connectionConfig.apiKey}`;    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        console.warn('Could not load interactions:', data.error.message);
        return {};
    }
    
    if (!data.values || data.values.length < 2) {
        return {};
    }
    
    const interactions = {};
    const rows = data.values.slice(1);
    
    rows.forEach(row => {
        const [id, company, type, date, notes, nextFollowup, status, createdAt] = row;

        if (!interactions[company]) {
            interactions[company] = [];
        }

        interactions[company].push({
            id: id,
            type: type,
            date: date,
            notes: notes,
            nextFollowupDate: nextFollowup || null,
            salesStatus: status,
            timestamp: createdAt
        });
    });

    return interactions;
}