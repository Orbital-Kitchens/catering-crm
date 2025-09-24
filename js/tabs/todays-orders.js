// Today's Orders Tab Functions

function updateTodaysOrders() {
    const today = getTodaysDate();
    const todaysOrders = allOrders.filter(order => order.date === today);
    
    const totalGuests = todaysOrders.reduce((sum, o) => sum + o.guests, 0);
    const uniqueCompanies = new Set(todaysOrders.map(o => o.company)).size;
    const tier1Today = new Set(todaysOrders.filter(o => getCustomerTier(o.company) === 1).map(o => o.company)).size;
    
    document.getElementById('todayOrdersCount').textContent = todaysOrders.length;
    document.getElementById('todayCustomersCount').textContent = uniqueCompanies;
    document.getElementById('todayGuestsCount').textContent = totalGuests;
    document.getElementById('todayTier1Count').textContent = tier1Today;
    
    renderTodayOrders();
}

function renderTodayOrders() {
    const today = getTodaysDate();
    const todaysOrders = allOrders.filter(order => order.date === today);
    
    const searchTerm = document.getElementById('todaySearchInput').value.toLowerCase();
    const platformFilter = document.getElementById('todayPlatformFilter').value;

    const filteredOrders = todaysOrders.filter(order => {
        const matchesSearch = order.company.toLowerCase().includes(searchTerm) || 
                            order.contactPerson.toLowerCase().includes(searchTerm);
        const matchesPlatform = !platformFilter || order.platform === platformFilter;
        return matchesSearch && matchesPlatform;
    });

    const tableBody = document.getElementById('todayOrdersTable');
    
    if (filteredOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
                    No orders found for today (${today})
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filteredOrders.map(order => {
        const tier = getCustomerTier(order.company);
        const followupIndicator = formatFollowupIndicator(order.company);
        
        return `
            <tr>
                <td><button onclick="openInteractionModal('${order.company}')" style="background: none; border: none; color: #7877c6; cursor: pointer; font-size: 1.1rem; padding: 5px;" title="Add Note">📝</button></td>
                <td>${order.time}</td>
                <td>${order.brand}</td>
                <td>${order.company}</td>
                <td>${order.address}</td>
                <td><span class="platform-badge platform-${order.platform.toLowerCase().replace(/\s+/g, '')}">${order.platform}</span></td>
                <td>${order.guestsRaw}</td>
                <td>${order.contactPerson}</td>
                <td>${order.phoneNumber}</td>
                <td><span class="status-badge status-${getStatusClass(order.productionStatus)}">${order.productionStatus}</span></td>
                <td><span class="tier-badge tier-${tier}">${tier === 1 ? '🥇' : tier === 2 ? '🥈' : '🥉'}</span></td>
                <td>${followupIndicator}</td>
            </tr>
        `;
    }).join('');
}

function filterTodayOrders() {
    renderTodayOrders();
}