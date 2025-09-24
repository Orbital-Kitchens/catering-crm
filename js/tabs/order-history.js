// Order History Tab Functions

function updateOrderHistory() {
    const uniqueCompanies = new Set(allOrders.map(o => o.company)).size;
    const avgGuests = allOrders.length > 0 ? 
        allOrders.reduce((sum, o) => sum + o.guests, 0) / allOrders.length : 0;
    const tier1Count = Object.values(customerTiers).filter(t => t.tier === 1).length;
    
    document.getElementById('totalOrdersCount').textContent = allOrders.length.toLocaleString();
    document.getElementById('uniqueCompaniesCount').textContent = uniqueCompanies;
    document.getElementById('avgOrderSize').textContent = Math.round(avgGuests);
    document.getElementById('tier1CustomersCount').textContent = tier1Count;
    
    renderHistoryOrders();
}

function renderHistoryOrders() {
    const searchTerm = document.getElementById('historySearchInput').value.toLowerCase();
    const platformFilter = document.getElementById('historyPlatformFilter').value;
    const tierFilter = document.getElementById('historyTierFilter').value;
    const startDate = document.getElementById('startDateFilter').value;
    const endDate = document.getElementById('endDateFilter').value;

    let filteredOrders = allOrders.filter(order => {
        const matchesSearch = order.company.toLowerCase().includes(searchTerm) ||
                            order.contactPerson.toLowerCase().includes(searchTerm) ||
                            order.brand.toLowerCase().includes(searchTerm);
        const matchesPlatform = !platformFilter || order.platform === platformFilter;
        const matchesTier = !tierFilter || getCustomerTier(order.company).toString() === tierFilter;
        
        let matchesStartDate = true;
        let matchesEndDate = true;
        
        if (startDate && order.date) {
            matchesStartDate = order.date >= startDate;
        }
        if (endDate && order.date) {
            matchesEndDate = order.date <= endDate;
        }
        
        return matchesSearch && matchesPlatform && matchesTier && matchesStartDate && matchesEndDate;
    });

    filteredOrders = filteredOrders.slice(0, 500);

    const tableBody = document.getElementById('historyOrdersTable');
    
    if (filteredOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
                    No orders found matching the current filters
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filteredOrders.map(order => {
        const tier = getCustomerTier(order.company);
        
        return `
            <tr>
                <td><button onclick="openInteractionModal('${order.company}')" style="background: none; border: none; color: #7877c6; cursor: pointer; font-size: 1.1rem; padding: 5px;" title="Add Note">📝</button></td>
                <td>${order.date}</td>
                <td>${order.time}</td>
                <td>${order.brand}</td>
                <td>${order.company}</td>
                <td>${order.address}</td>
                <td>${order.contactPerson}</td>
                <td>${order.phoneNumber}</td>
                <td><span class="platform-badge platform-${order.platform.toLowerCase().replace(/\s+/g, '')}">${order.platform}</span></td>
                <td>${order.guestsRaw}</td>
                <td>${order.customerRequests}</td>
                <td>${order.driver}</td>
                <td><span class="tier-badge tier-${tier}">${tier === 1 ? '🥇' : tier === 2 ? '🥈' : '🥉'}</span></td>
            </tr>
        `;
    }).join('');
}

function filterHistoryOrders() {
    renderHistoryOrders();
}