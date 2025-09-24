// env variables
let currentPage = 1;
const itemsPerPage = 50;

// Sales Pipeline Tab Functions

function updateSalesPipeline() {    
    const companies = Object.keys(customerTiers);
    
    const tier1Count = companies.filter(c => getCustomerTier(c) === 1).length;
    const overdueCount = companies.filter(c => getFollowupStatus(c) === 'overdue').length;
    const thisWeekCount = companies.filter(c => ['today', 'thisweek'].includes(getFollowupStatus(c))).length;

    const convertedCustomers = Object.keys(customerInteractions).filter(company => {
        const interactions = customerInteractions[company];
        if (!interactions || interactions.length === 0) return false;
        const latestInteraction = interactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const isConverted = latestInteraction && latestInteraction.salesStatus && 
                        latestInteraction.salesStatus.toLowerCase().trim() === 'converted';
        
        if (isConverted) {
            console.log(`Converted customer found: ${company}, status: "${latestInteraction.salesStatus}"`);
        }
        
        return isConverted;
    });
    const conversionRate = companies.length > 0 ? ((convertedCustomers.length / companies.length) * 100).toFixed(2) : "0.00";
        
    document.getElementById('tier1ProspectsCount').textContent = tier1Count;
    document.getElementById('overdueFollowupsCount').textContent = overdueCount;
    document.getElementById('thisWeekFollowupsCount').textContent = thisWeekCount;
    document.getElementById('conversionRate').textContent = conversionRate + '%';
    
    renderPipelineTable();
    renderFollowupQueue();
}

function renderPipelineTable() {
    const searchTerm = document.getElementById('pipelineSearchInput').value.toLowerCase();
    const tierFilter = document.getElementById('pipelineTierFilter').value;
    const statusFilter = document.getElementById('pipelineStatusFilter').value;
    const followupFilter = document.getElementById('pipelineFollowupFilter').value;
    const startDate = document.getElementById('pipelineStartDate').value;
    const endDate = document.getElementById('pipelineEndDate').value;

    let companies = Object.keys(customerTiers).filter(company => {
        const matchesSearch = company.toLowerCase().includes(searchTerm);
        const matchesTier = !tierFilter || getCustomerTier(company).toString() === tierFilter;
        
        const currentStatus = getCurrentSalesStatus(company);
        const matchesStatus = !statusFilter || currentStatus === statusFilter;
        
        let matchesDateRange = true;
        if (startDate || endDate) {
            const companyOrders = customerTiers[company].stats.orders;
            const lastOrderDate = companyOrders.length > 0 ? 
                companyOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null;
            
            if (lastOrderDate) {
                if (startDate && lastOrderDate < startDate) matchesDateRange = false;
                if (endDate && lastOrderDate > endDate) matchesDateRange = false;
            } else if (startDate || endDate) {
                matchesDateRange = false;
            }
        }

        let matchesFollowup = true;
        if (followupFilter) {
            const followupStatus = getFollowupStatus(company);
            if (followupFilter === 'overdue') matchesFollowup = followupStatus === 'overdue';
            else if (followupFilter === 'today') matchesFollowup = followupStatus === 'today';
            else if (followupFilter === 'thisweek') matchesFollowup = ['today', 'thisweek'].includes(followupStatus);
        }
        
        return matchesSearch && matchesTier && matchesStatus && matchesFollowup && matchesDateRange;
    });

    // Sort companies (Tier 1 first)
    companies.sort((a, b) => {
        const tierA = getCustomerTier(a);
        const tierB = getCustomerTier(b);
        
        if (tierA !== tierB) return tierA - tierB;
        
        const lastContactA = getLastContactDate(a);
        const lastContactB = getLastContactDate(b);
        
        if (!lastContactA && !lastContactB) return 0;
        if (!lastContactA) return -1;
        if (!lastContactB) return 1;
        
        return new Date(lastContactA) - new Date(lastContactB);
    });

    // Pagination logic
    const totalCompanies = companies.length;
    const totalPages = Math.ceil(totalCompanies / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCompanies = companies.slice(startIndex, endIndex);

    const tableBody = document.getElementById('pipelineTable');
    
    if (paginatedCompanies.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
                    No companies found matching the current filters
                </td>
            </tr>
        `;
        updatePaginationControls(0, 0);
        return;
    }
    
    tableBody.innerHTML = paginatedCompanies.map(company => {
        const tier = getCustomerTier(company);
        const tierData = customerTiers[company];
        const lastContact = getLastContactDate(company);
        const nextFollowup = getNextFollowupDate(company);
        const salesStatus = getCurrentSalesStatus(company);
        const daysSince = getDaysSinceContact(company);
        
        // Get last order date
        const companyOrders = tierData.stats.orders;
        const lastOrderDate = companyOrders.length > 0 ? 
            companyOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : 'Never';
        
        return `
            <tr>
                <td><button onclick="openInteractionModal('${company}')" style="background: none; border: none; color: #7877c6; cursor: pointer; font-size: 1.1rem; padding: 5px;" title="Add Note">📝</button></td>
                <td style="font-weight: 600;">${company}</td>
                <td><span class="tier-badge tier-${tier}">${tier === 1 ? '🥇' : tier === 2 ? '🥈' : '🥉'}</span></td>
                <td>${tierData.stats.totalOrders}</td>
                <td>${tierData.stats.brands.size} brands</td>
                <td>${Math.round(tierData.stats.avgGuests)}</td>
                <td>${lastOrderDate}</td>
                <td>${lastContact ? (daysSince + ' days ago') : 'Never'}</td>
                <td>${nextFollowup || 'None set'}</td>
                <td><span class="status-badge status-${salesStatus}">${salesStatus.charAt(0).toUpperCase() + salesStatus.slice(1)}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="viewCustomerHistory('${company}')">History</button>
                </td>
            </tr>
        `;
    }).join('');

    updatePaginationControls(totalCompanies, totalPages);
}

function updatePaginationControls(totalCompanies, totalPages) {
    // Find the sales pipeline tab container instead of just the table
    const salesPipelineTab = document.getElementById('salesPipelineTab');
    
    const existingPagination = salesPipelineTab.querySelector('.pagination-controls');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    if (totalPages <= 1) return;
    
    const paginationHtml = `
        <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 20px; background: rgba(255, 255, 255, 0.02); border-radius: 12px;">
            <div style="color: rgba(255, 255, 255, 0.7);">
                Showing ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalCompanies)} of ${totalCompanies} companies
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-small btn-secondary" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
                <span style="color: rgba(255, 255, 255, 0.9);">Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-small btn-secondary" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div>
        </div>
    `;
    
    // Insert after the table container (find the div that wraps the table)
    const tableWrapper = salesPipelineTab.querySelector('div[style*="overflow-x: auto"]');
    tableWrapper.insertAdjacentHTML('afterend', paginationHtml);
}

function changePage(newPage) {
    if (newPage >= 1) {
        currentPage = newPage;
        renderPipelineTable();
    }
}

function filterPipelineCustomers() {
    currentPage = 1; // Reset to first page when filtering
    renderPipelineTable();
}

function renderFollowupQueue() {
    const companies = Object.keys(customerTiers);
    
    const overdueCompanies = companies.filter(c => getFollowupStatus(c) === 'overdue');
    const todayCompanies = companies.filter(c => getFollowupStatus(c) === 'today');
    const thisWeekCompanies = companies.filter(c => getFollowupStatus(c) === 'thisweek');
    
    document.getElementById('todayOverdueList').innerHTML = 
        overdueCompanies.length > 0 ? overdueCompanies.join(', ') : 'None';
    
    document.getElementById('todayDueList').innerHTML = 
        todayCompanies.length > 0 ? todayCompanies.join(', ') : 'None';
    
    document.getElementById('thisWeekList').innerHTML = 
        thisWeekCompanies.length > 0 ? thisWeekCompanies.join(', ') : 'None';
}