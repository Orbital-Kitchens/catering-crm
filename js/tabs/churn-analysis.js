// Churn Analysis Tab Functions

let churnCurrentPage = 1;
const churnItemsPerPage = 50;

function updateChurnAnalysis() {
    const metrics = calculateChurnMetrics();

    // Update stat cards
    document.getElementById('atRiskCount').textContent = metrics.atRiskCount;
    document.getElementById('platformSwitchersCount').textContent = metrics.platformSwitchersCount;
    document.getElementById('churnRate').textContent = metrics.churnRate;
    document.getElementById('silent30Count').textContent = metrics.silent30Count;

    // Render churn segments
    renderChurnSegments(metrics);

    // Render platform switchers table
    renderPlatformSwitchers(metrics.platformSwitchers);

    // Render main churn table
    renderChurnTable(metrics.churningCompanies);
}

function toggleChurnSegment(segment) {
    const listElement = document.getElementById(`${segment}ChurnList`);
    const toggleElement = document.getElementById(`${segment}Toggle`);

    if (listElement.style.display === 'none') {
        listElement.style.display = 'block';
        toggleElement.textContent = '▲';
    } else {
        listElement.style.display = 'none';
        toggleElement.textContent = '▼';
    }
}

function renderChurnSegments(metrics) {
    const critical = metrics.churningCompanies.filter(c => c.status === 'critical');
    const atRisk = metrics.churningCompanies.filter(c => c.status === 'at-risk');
    const watching = metrics.churningCompanies.filter(c => c.status === 'watching');

    // Update counts
    document.getElementById('criticalCount').textContent = `${critical.length} companies`;
    document.getElementById('atRiskSegmentCount').textContent = `${atRisk.length} companies`;
    document.getElementById('watchingSegmentCount').textContent = `${watching.length} companies`;

    // Render lists
    document.getElementById('criticalChurnList').innerHTML =
        critical.length > 0
            ? critical.map(c => `<div style="margin-bottom: 8px;">${c.company} <span style="color: rgba(255, 255, 255, 0.5);">(${c.daysSince} days)</span></div>`).join('')
            : '<div style="color: rgba(255, 255, 255, 0.5);">None</div>';

    document.getElementById('atRiskChurnList').innerHTML =
        atRisk.length > 0
            ? atRisk.map(c => `<div style="margin-bottom: 8px;">${c.company} <span style="color: rgba(255, 255, 255, 0.5);">(${c.daysSince} days)</span></div>`).join('')
            : '<div style="color: rgba(255, 255, 255, 0.5);">None</div>';

    document.getElementById('watchingChurnList').innerHTML =
        watching.length > 0
            ? watching.map(c => `<div style="margin-bottom: 8px;">${c.company} <span style="color: rgba(255, 255, 255, 0.5);">(${c.daysSince} days)</span></div>`).join('')
            : '<div style="color: rgba(255, 255, 255, 0.5);">None</div>';
}

function renderPlatformSwitchers(switchers) {
    const tableBody = document.getElementById('platformSwitchersTable');

    if (switchers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
                    No platform switchers detected
                </td>
            </tr>
        `;
        return;
    }

    // Sort by next order date descending (most recent first)
    const sortedSwitchers = [...switchers].sort((a, b) => {
        return new Date(b.switchedToOrder.date) - new Date(a.switchedToOrder.date);
    });

    tableBody.innerHTML = sortedSwitchers.map(switcher => {
        return `
            <tr>
                <td style="font-weight: 600;">${switcher.company}</td>
                <td>${switcher.flexOrder.date}</td>
                <td><span class="platform-badge platform-${switcher.switchedToOrder.platform.toLowerCase().replace(/\s+/g, '')}">${switcher.switchedToOrder.platform}</span></td>
                <td>${switcher.switchedToOrder.date}</td>
                <td>${switcher.daysBetween} days</td>
                <td>${switcher.flexOrderCount}</td>
                <td>${switcher.otherOrderCount}</td>
                <td><span class="tier-badge tier-${switcher.tier}">${switcher.tier === 1 ? '🥇' : switcher.tier === 2 ? '🥈' : '🥉'}</span></td>
                <td><button onclick="openInteractionModal('${switcher.company}')" style="background: none; border: none; color: #7877c6; cursor: pointer; font-size: 1.1rem; padding: 5px;" title="Add Note">📝</button></td>
            </tr>
        `;
    }).join('');
}

function renderChurnTable(churningCompanies) {
    const searchTerm = document.getElementById('churnSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('churnStatusFilter').value;
    const tierFilter = document.getElementById('churnTierFilter').value;
    const contactFilter = document.getElementById('lastContactFilter').value;

    let filteredCompanies = churningCompanies.filter(company => {
        const matchesSearch = company.company.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || company.status === statusFilter;
        const matchesTier = !tierFilter || company.tier.toString() === tierFilter;

        let matchesContact = true;
        if (contactFilter) {
            const daysSinceContact = getDaysSinceContact(company.company);
            if (contactFilter === 'never') {
                matchesContact = !daysSinceContact;
            } else if (contactFilter === '30') {
                matchesContact = daysSinceContact && daysSinceContact >= 30;
            } else if (contactFilter === '60') {
                matchesContact = daysSinceContact && daysSinceContact >= 60;
            }
        }

        return matchesSearch && matchesStatus && matchesTier && matchesContact;
    });

    // Sort by watching, then at-risk, then critical (reverse order)
    filteredCompanies.sort((a, b) => {
        const statusOrder = { watching: 1, 'at-risk': 2, critical: 3 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return b.daysSince - a.daysSince;
    });

    // Pagination logic
    const totalCompanies = filteredCompanies.length;
    const totalPages = Math.ceil(totalCompanies / churnItemsPerPage);
    const startIndex = (churnCurrentPage - 1) * churnItemsPerPage;
    const endIndex = startIndex + churnItemsPerPage;
    const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

    const tableBody = document.getElementById('churnTable');

    if (paginatedCompanies.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
                    No churning customers found matching the current filters
                </td>
            </tr>
        `;
        updateChurnPaginationControls(0, 0);
        return;
    }

    tableBody.innerHTML = paginatedCompanies.map(company => {
        const lastContact = getLastContactDate(company.company);
        const daysSinceContact = getDaysSinceContact(company.company);
        const contactDisplay = lastContact ? (daysSinceContact + ' days ago') : 'Never';

        const avgFreqDisplay = company.avgFrequency
            ? `${Math.round(company.avgFrequency)} days`
            : 'N/A';

        const statusBadgeClass = `churn-${company.status}`;
        const statusText = company.status.charAt(0).toUpperCase() + company.status.slice(1);

        return `
            <tr>
                <td style="font-weight: 600;">${company.company}</td>
                <td><span class="tier-badge tier-${company.tier}">${company.tier === 1 ? '🥇' : company.tier === 2 ? '🥈' : '🥉'}</span></td>
                <td>${company.totalOrders}</td>
                <td>${company.lastOrderDate}</td>
                <td style="font-weight: 600; color: ${company.status === 'critical' ? '#f87171' : company.status === 'at-risk' ? '#fbbf24' : '#34d399'};">
                    ${company.daysSince} days
                </td>
                <td>${avgFreqDisplay}</td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td>${contactDisplay}</td>
                <td><button onclick="openInteractionModal('${company.company}')" style="background: none; border: none; color: #7877c6; cursor: pointer; font-size: 1.1rem; padding: 5px;" title="Add Note">📝</button></td>
            </tr>
        `;
    }).join('');

    updateChurnPaginationControls(totalCompanies, totalPages);
}

function updateChurnPaginationControls(totalCompanies, totalPages) {
    const churnAnalysisTab = document.getElementById('churnAnalysisTab');

    const existingPagination = churnAnalysisTab.querySelector('.churn-pagination-controls');
    if (existingPagination) {
        existingPagination.remove();
    }

    if (totalPages <= 1) return;

    const paginationHtml = `
        <div class="churn-pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 20px; background: rgba(255, 255, 255, 0.02); border-radius: 12px;">
            <div style="color: rgba(255, 255, 255, 0.7);">
                Showing ${((churnCurrentPage - 1) * churnItemsPerPage) + 1}-${Math.min(churnCurrentPage * churnItemsPerPage, totalCompanies)} of ${totalCompanies} companies
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-small btn-secondary" onclick="changeChurnPage(${churnCurrentPage - 1})" ${churnCurrentPage === 1 ? 'disabled' : ''}>← Previous</button>
                <span style="color: rgba(255, 255, 255, 0.9);">Page ${churnCurrentPage} of ${totalPages}</span>
                <button class="btn btn-small btn-secondary" onclick="changeChurnPage(${churnCurrentPage + 1})" ${churnCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div>
        </div>
    `;

    const tableWrapper = churnAnalysisTab.querySelectorAll('div[style*="overflow-x: auto"]')[1]; // Second one is the main table
    if (tableWrapper) {
        tableWrapper.insertAdjacentHTML('afterend', paginationHtml);
    }
}

function changeChurnPage(newPage) {
    if (newPage >= 1) {
        churnCurrentPage = newPage;
        filterChurnCustomers();
    }
}

function filterChurnCustomers() {
    const metrics = calculateChurnMetrics();
    renderChurnTable(metrics.churningCompanies);
}
