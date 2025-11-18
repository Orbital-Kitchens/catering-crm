// Order History Tab Functions

let historyCurrentPage = 1;
const historyItemsPerPage = 50;

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

    // Pagination logic
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / historyItemsPerPage);
    const startIndex = (historyCurrentPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    const tableBody = document.getElementById('historyOrdersTable');

    if (paginatedOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
                    No orders found matching the current filters
                </td>
            </tr>
        `;
        updateHistoryPaginationControls(0, 0);
        return;
    }
    
    tableBody.innerHTML = paginatedOrders.map(order => {
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

    updateHistoryPaginationControls(totalOrders, totalPages);
}

function updateHistoryPaginationControls(totalOrders, totalPages) {
    const orderHistoryTab = document.getElementById('orderHistoryTab');

    const existingPagination = orderHistoryTab.querySelector('.history-pagination-controls');
    if (existingPagination) {
        existingPagination.remove();
    }

    if (totalPages <= 1) return;

    const paginationHtml = `
        <div class="history-pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 20px; background: rgba(255, 255, 255, 0.02); border-radius: 12px;">
            <div style="color: rgba(255, 255, 255, 0.7);">
                Showing ${((historyCurrentPage - 1) * historyItemsPerPage) + 1}-${Math.min(historyCurrentPage * historyItemsPerPage, totalOrders)} of ${totalOrders} orders
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-small btn-secondary" onclick="changeHistoryPage(${historyCurrentPage - 1})" ${historyCurrentPage === 1 ? 'disabled' : ''}>← Previous</button>
                <span style="color: rgba(255, 255, 255, 0.9);">Page ${historyCurrentPage} of ${totalPages}</span>
                <button class="btn btn-small btn-secondary" onclick="changeHistoryPage(${historyCurrentPage + 1})" ${historyCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div>
        </div>
    `;

    const tableWrapper = orderHistoryTab.querySelector('div[style*="overflow-x: auto"]');
    if (tableWrapper) {
        tableWrapper.insertAdjacentHTML('afterend', paginationHtml);
    }
}

function changeHistoryPage(newPage) {
    if (newPage >= 1) {
        historyCurrentPage = newPage;
        filterHistoryOrders();
    }
}

function filterHistoryOrders() {
    renderHistoryOrders();
}