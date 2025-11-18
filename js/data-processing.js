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

// Churn Analysis Functions

function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getCompanyOrders(company) {
    return allOrders
        .filter(order => order.company === company)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function calculateAvgOrderFrequency(orders) {
    if (orders.length < 2) return null;

    const sortedOrders = [...orders].sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];

    for (let i = 1; i < sortedOrders.length; i++) {
        const gap = daysBetween(sortedOrders[i-1].date, sortedOrders[i].date);
        gaps.push(gap);
    }

    return gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : null;
}

function getChurnStatus(company) {
    const orders = getCompanyOrders(company);

    // Need at least 2 orders to be considered for churn
    if (orders.length < 2) return null;

    const lastOrderDate = orders[0].date;
    const today = new Date().toISOString().split('T')[0];
    const daysSince = daysBetween(lastOrderDate, today);
    const avgFrequency = calculateAvgOrderFrequency(orders);

    // Companies with no orders in 180+ days are considered lost, not critical
    if (daysSince >= 180) return 'lost';
    if (daysSince >= 60) return 'critical';
    if (daysSince >= 30) return 'at-risk';
    if (daysSince >= 15 && avgFrequency && avgFrequency <= 21) return 'watching';

    return 'active';
}

function detectPlatformSwitchers() {
    const switchersByCompany = {};
    const companies = Object.keys(customerTiers);

    companies.forEach(company => {
        if (company.toLowerCase() === 'n/a') return;

        const orders = getCompanyOrders(company).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Count Flex vs other platform orders
        let flexOrderCount = 0;
        let otherOrderCount = 0;

        orders.forEach(order => {
            if (order.platform === 'Flex Catering') {
                flexOrderCount++;
            } else if (order.platform !== 'Direct') {
                otherOrderCount++;
            }
        });

        for (let i = 0; i < orders.length - 1; i++) {
            if (orders[i].platform === 'Flex Catering' &&
                orders[i+1].platform !== 'Flex Catering' &&
                orders[i+1].platform !== 'Direct') {

                const daysBetweenOrders = daysBetween(orders[i].date, orders[i+1].date);

                // Only consider it a switch if they ordered within 60 days
                if (daysBetweenOrders <= 60) {
                    // Keep only the most recent switch per company
                    if (!switchersByCompany[company] ||
                        new Date(orders[i+1].date) > new Date(switchersByCompany[company].switchedToOrder.date)) {
                        switchersByCompany[company] = {
                            company,
                            flexOrder: orders[i],
                            switchedToOrder: orders[i+1],
                            daysBetween: daysBetweenOrders,
                            tier: getCustomerTier(company),
                            flexOrderCount,
                            otherOrderCount
                        };
                    }
                }
            }
        }
    });

    return Object.values(switchersByCompany);
}

function calculateChurnMetrics() {
    const companies = Object.keys(customerTiers);
    const today = new Date().toISOString().split('T')[0];

    let atRiskCount = 0;
    let criticalCount = 0;
    let watchingCount = 0;
    let silent30Count = 0;

    const churningCompanies = [];

    companies.forEach(company => {
        if (company.toLowerCase() === 'n/a') return;

        const status = getChurnStatus(company);
        const tier = getCustomerTier(company);
        const orders = getCompanyOrders(company);

        // Exclude 'lost' companies (180+ days) and 'active' companies
        if (status && status !== 'active' && status !== 'lost') {
            const lastOrderDate = orders[0].date;
            const daysSince = daysBetween(lastOrderDate, today);

            churningCompanies.push({
                company,
                status,
                tier,
                daysSince,
                lastOrderDate,
                totalOrders: orders.length,
                avgFrequency: calculateAvgOrderFrequency(orders)
            });

            if (status === 'critical') criticalCount++;
            if (status === 'at-risk') atRiskCount++;
            if (status === 'watching') watchingCount++;

            // Count Tier 1/2 customers silent 30+ days
            if ((tier === 1 || tier === 2) && daysSince >= 30) {
                silent30Count++;
            }
        }
    });

    // Calculate churn rate: % of previously active customers (2+ orders in prior 90 days) who haven't ordered in 60+ days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    const activeIn90Days = companies.filter(company => {
        const orders = getCompanyOrders(company);
        const ordersIn90Days = orders.filter(o => o.date >= ninetyDaysAgoStr);
        return ordersIn90Days.length >= 2;
    });

    const churnedCustomers = activeIn90Days.filter(company => {
        const orders = getCompanyOrders(company);
        const lastOrder = orders[0];
        return lastOrder.date < sixtyDaysAgoStr;
    });

    const churnRate = activeIn90Days.length > 0
        ? ((churnedCustomers.length / activeIn90Days.length) * 100).toFixed(1)
        : "0.0";

    const platformSwitchers = detectPlatformSwitchers();

    return {
        atRiskCount: atRiskCount + criticalCount, // Total at-risk includes critical
        platformSwitchersCount: platformSwitchers.length,
        churnRate: churnRate + '%',
        silent30Count,
        churningCompanies,
        platformSwitchers,
        criticalCount,
        watchingCount
    };
}