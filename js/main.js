// Main application controller

async function autoConnect() {
    showLoading(true);
    
    try {
        await loadDataFromGoogleSheets();
        showStatus('✅ Connected to Orbital Systems!', 'success');
        launchCRM();
    } catch (error) {
        showStatus('Connection failed: ' + error.message, 'error');
        showLoading(false);
    }
}

function launchCRM() {
    document.getElementById('setupSection').classList.add('hidden');
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById('todaysOrdersTab').classList.add('active');
    document.querySelector('button[onclick="showTab(\'todaysOrders\')"]').classList.add('active');
    
    updateAllData();
}

async function refreshData() {
    if (!connectionConfig.apiKey) return;
    
    showLoading(true);
    try {
        await loadDataFromGoogleSheets();
        updateAllData();
        showStatus('✅ Data refreshed successfully!', 'success');
        setTimeout(() => {
            document.getElementById('connectionStatus').classList.add('hidden');
        }, 3000);
    } catch (error) {
        showStatus('Refresh failed: ' + error.message, 'error');
    }
    showLoading(false);
}

function updateAllData() {
    updateTodaysOrders();
    updateOrderHistory();
    updateAnalytics();
    updateSalesPipeline();
    updateChurnAnalysis();

    if (document.getElementById('mapStartDate').value === '') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);

        document.getElementById('mapStartDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('mapEndDate').value = endDate.toISOString().split('T')[0];
    }

    const platforms = [...new Set(allOrders.map(o => o.platform).filter(p => p))];

    const todayPlatformFilter = document.getElementById('todayPlatformFilter');
    const historyPlatformFilter = document.getElementById('historyPlatformFilter');

    [todayPlatformFilter, historyPlatformFilter].forEach(select => {
        select.innerHTML = '<option value="">All Platforms</option>';
        platforms.sort().forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = platform;
            select.appendChild(option);
        });
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    document.getElementById('analyticsStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('analyticsEndDate').value = endDate.toISOString().split('T')[0];
    
    autoConnect();
});