// UI Helper Functions

function getTodaysDate() {
    return new Date().toISOString().split('T')[0];
}

function getCustomerTier(company) {
    return customerTiers[company]?.tier || 3;
}

function getLastContactDate(company) {
    const interactions = customerInteractions[company];
    if (!interactions || interactions.length === 0) return null;
    
    const lastInteraction = interactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return lastInteraction.date;
}

function getNextFollowupDate(company) {
    const interactions = customerInteractions[company];
    if (!interactions || interactions.length === 0) return null;
    
    const withFollowup = interactions
        .filter(i => i.nextFollowupDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return withFollowup.length > 0 ? withFollowup[0].nextFollowupDate : null;
}

function getDaysSinceContact(company) {
    const lastContact = getLastContactDate(company);
    if (!lastContact) return null;
    
    const today = new Date();
    const contactDate = new Date(lastContact);
    const diffTime = Math.abs(today - contactDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getFollowupStatus(company) {
    const nextFollowup = getNextFollowupDate(company);
    if (!nextFollowup) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const followupDate = nextFollowup;
    
    if (followupDate < today) return 'overdue';
    else if (followupDate === today) return 'today';
    else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        if (followupDate <= nextWeekStr) return 'thisweek';
    }
    return 'future';
}

function formatFollowupIndicator(company) {
    const status = getFollowupStatus(company);
    const daysSince = getDaysSinceContact(company);
    
    if (status === 'overdue') {
        return '<span class="follow-up-indicator overdue">OVERDUE</span>';
    } else if (status === 'today') {
        return '<span class="follow-up-indicator upcoming">DUE TODAY</span>';
    } else if (daysSince && daysSince > 30) {
        return '<span class="follow-up-indicator overdue">' + daysSince + ' days ago</span>';
    } else if (daysSince) {
        return '<span class="follow-up-indicator contacted">' + daysSince + ' days ago</span>';
    } else {
        return '<span class="follow-up-indicator" style="background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);">No contact</span>';
    }
}

function getCurrentSalesStatus(company) {
    const interactions = customerInteractions[company];
    if (!interactions || interactions.length === 0) return 'prospect';
    
    const latestInteraction = interactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return latestInteraction.salesStatus || 'prospect';
}

function getStatusClass(status) {
    if (!status) return 'pending';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('completed') || statusLower.includes('done') || statusLower === 'complete') {
        return 'completed';
    } else if (statusLower.includes('need') || statusLower.includes('update') || statusLower.includes('issue') || statusLower.includes('problem')) {
        return 'needupdate';
    } else {
        return 'pending';
    }
}

function showLoading(show) {
    document.getElementById('loadingDiv').classList.toggle('hidden', !show);
    document.getElementById('setupSection').classList.toggle('hidden', !show);
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.className = type === 'error' ? 'error-status' : 'connection-status';
    statusDiv.innerHTML = `<h4>${type === 'error' ? '❌' : '✅'} ${type === 'error' ? 'Connection Error' : 'Connection Success'}</h4><p>${message}</p>`;
    statusDiv.classList.remove('hidden');
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}

function saveInteractions() {
    localStorage.setItem('customerInteractions', JSON.stringify(customerInteractions));
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'todaysOrders') {
        updateTodaysOrders();
    } else if (tabName === 'orderHistory') {
        updateOrderHistory();
    } else if (tabName === 'analytics') {
        updateAnalytics();
    } else if (tabName === 'map') {
        updateMap();
    }
}

// Toggle function for customer order details (needed globally)
window.toggleCustomerOrders = function(index) {
    const ordersDetail = document.getElementById(`orders-${index}`);
    const toggle = document.getElementById(`toggle-${index}`);

    if (ordersDetail.classList.contains('expanded')) {
        ordersDetail.classList.remove('expanded');
        toggle.classList.remove('expanded');
    } else {
        document.querySelectorAll('.customer-orders-detail.expanded').forEach(detail => {
            detail.classList.remove('expanded');
        });
        document.querySelectorAll('.customer-toggle.expanded').forEach(t => {
            t.classList.remove('expanded');
        });
        ordersDetail.classList.add('expanded');
        toggle.classList.add('expanded');
    }
};