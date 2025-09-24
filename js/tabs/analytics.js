// Analytics Tab Functions

function updateAnalytics() {
    const startDate = document.getElementById('analyticsStartDate').value;
    const endDate = document.getElementById('analyticsEndDate').value;
    
    let analyticsOrders = allOrders.filter(order => {
        if (!order.company || order.company.toLowerCase() === 'unknown' || order.company.toLowerCase() === 'na') {
            return false;
        }
        
        let matchesStartDate = true;
        let matchesEndDate = true;
        
        if (startDate && order.date) {
            matchesStartDate = order.date >= startDate;
        }
        if (endDate && order.date) {
            matchesEndDate = order.date <= endDate;
        }
        
        return matchesStartDate && matchesEndDate;
    });
    
    const platformData = {};
    analyticsOrders.forEach(order => {
        const platform = order.platform || 'Direct';
        if (platform.toLowerCase() !== 'na') {
            platformData[platform] = (platformData[platform] || 0) + 1;
        }
    });

    const customerData = {};
    analyticsOrders.forEach(order => {
        customerData[order.company] = (customerData[order.company] || 0) + 1;
    });
    
    const topCustomers = Object.entries(customerData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    const platformEntries = Object.entries(platformData);
    const topPlatform = platformEntries.length > 0 ? 
        platformEntries.reduce(([platA, countA], [platB, countB]) => 
            countA > countB ? [platA, countA] : [platB, countB]
        )[0] : '-';
        
    const avgGuests = analyticsOrders.length > 0 ? 
        analyticsOrders.reduce((sum, o) => sum + o.guests, 0) / analyticsOrders.length : 0;
    
    const totalOrders = analyticsOrders.length;
    const repeatCustomers = Object.values(customerData).filter(count => count > 1).length;

    document.getElementById('analyticsTopPlatform').textContent = topPlatform;
    document.getElementById('analyticsAvgHeadcount').textContent = Math.round(avgGuests);
    document.getElementById('analyticsMonthlyOrders').textContent = totalOrders;
    document.getElementById('analyticsRepeatCustomers').textContent = repeatCustomers;

    renderTopCustomers(topCustomers, analyticsOrders);
    createCharts(platformData, analyticsOrders);
}

function renderTopCustomers(topCustomers, analyticsOrders) {
    const topCustomersList = document.getElementById('topCustomersList');
    if (topCustomers.length > 0) {
        topCustomersList.innerHTML = topCustomers.map(([company, count], index) => {
            const customerOrders = analyticsOrders
                .filter(order => order.company === company)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const tier = getCustomerTier(company);
            const lastContact = getDaysSinceContact(company);
            const contactInfo = lastContact ? `${lastContact} days ago` : 'No contact';
            
            const ordersDetailHtml = customerOrders.map(order => `
                <div class="order-item">
                    <div class="order-detail">
                        <div class="order-detail-label">Date</div>
                        <div class="order-detail-value">${order.date}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">Brand</div>
                        <div class="order-detail-value">${order.brand || 'N/A'}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">Platform</div>
                        <div class="order-detail-value">
                            <span class="platform-badge platform-${order.platform.toLowerCase().replace(/\s+/g, '')}" style="font-size: 0.7rem; padding: 3px 8px;">
                                ${order.platform}
                            </span>
                        </div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">Headcount</div>
                        <div class="order-detail-value">${order.guestsRaw} guests</div>
                    </div>
                </div>
            `).join('');

            return `
                <div>
                    <div class="customer-item" onclick="window.toggleCustomerOrders(${index})">
                        <div class="customer-header">
                            <div style="display: flex; align-items: center;">
                                <span class="customer-name">${company}</span>
                                <span class="tier-badge tier-${tier}">${tier === 1 ? '🥇' : tier === 2 ? '🥈' : '🥉'}</span>
                            </div>
                            <div style="display: flex; align-items: center;">
                                <span class="customer-orders">${count} orders</span>
                                <span style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-left: 10px;">${contactInfo}</span>
                                <button class="btn btn-small" onclick="event.stopPropagation(); openInteractionModal('${company}')" style="margin-left: 10px;">Add Note</button>
                                <span class="customer-toggle" id="toggle-${index}">▼</span>
                            </div>
                        </div>
                    </div>
                    <div class="customer-orders-detail" id="orders-${index}">
                        ${ordersDetailHtml}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        topCustomersList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5);">No customer data available</div>';
    }
}

function createCharts(platformData, ordersData) {
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });

    Chart.defaults.color = 'rgba(255, 255, 255, 0.8)';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    const platformCtx = document.getElementById('platformChart').getContext('2d');
    const platforms = Object.keys(platformData);
    const counts = Object.values(platformData);
    const colors = [
        '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#6b7280',
        '#ff6b35', '#00a86b', '#ff3008', '#009639', '#000000', '#7b68ee',
        '#ff1493', '#20b2aa', '#ff4500', '#4169e1'
    ];

    if (platforms.length > 0 && counts.some(count => count > 0)) {
        charts.platform = new Chart(platformCtx, {
            type: 'doughnut',
            data: {
                labels: platforms,
                datasets: [{
                    data: counts,
                    backgroundColor: colors.slice(0, platforms.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: { family: 'Montserrat', size: 12 }
                        }
                    }
                }
            }
        });
    }

    const timelineData = {};
    ordersData.forEach(order => {
        if (order.date) {
            timelineData[order.date] = (timelineData[order.date] || 0) + 1;
        }
    });

    const timelineCtx = document.getElementById('timelineChart').getContext('2d');
    
    if (Object.keys(timelineData).length > 0) {
        charts.timeline = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: Object.keys(timelineData).sort(),
                datasets: [{
                    label: 'Orders',
                    data: Object.keys(timelineData).sort().map(date => timelineData[date]),
                    borderColor: '#7877c6',
                    backgroundColor: 'rgba(120, 119, 198, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#7877c6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { font: { family: 'Montserrat' } }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { font: { family: 'Montserrat' } }
                    }
                },
                plugins: {
                    legend: { labels: { font: { family: 'Montserrat' } } }
                }
            }
        });
    }
}

function setDateRange(range) {
    const endDate = new Date();
    const startDate = new Date();
    
    if (range === '30days') {
        startDate.setDate(endDate.getDate() - 30);
    } else if (range === '90days') {
        startDate.setDate(endDate.getDate() - 90);
    }
    
    document.getElementById('analyticsStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('analyticsEndDate').value = endDate.toISOString().split('T')[0];
    
    updateAnalytics();
}