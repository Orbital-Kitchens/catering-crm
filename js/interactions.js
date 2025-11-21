// Customer Interactions and Modal Functions

function openInteractionModal(company) {
    document.getElementById('modalCompany').value = company;
    document.getElementById('modalTitle').textContent = `Add Interaction - ${company}`;
    document.getElementById('interactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('salesStatus').value = getCurrentSalesStatus(company);
    document.getElementById('interactionModal').style.display = 'block';
}

function closeInteractionModal() {
    document.getElementById('interactionModal').style.display = 'none';
    document.getElementById('interactionForm').reset();
    
    // Reset submit button state
    const submitBtn = document.querySelector('#interactionForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Interaction';
    }
}

function viewCustomerHistory(company) {
    const interactions = customerInteractions[company] || [];
    const tierData = customerTiers[company];

    // Get contact info from most recent order
    const companyOrders = allOrders.filter(order => order.company === company);
    const mostRecentOrder = companyOrders.length > 0 ?
        companyOrders.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;

    const contactPerson = mostRecentOrder?.contactPerson || 'N/A';
    const phoneNumber = mostRecentOrder?.phoneNumber || 'N/A';

    let historyHtml = `
        <div style="max-height: 400px; overflow-y: auto;">
            <h3 style="color: #7877c6; margin-bottom: 20px;">${company} - Customer Profile</h3>

            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 15px;">Account Summary</h4>
                <p><strong>Tier:</strong> ${tierData.tier}</p>
                <p><strong>Total Orders:</strong> ${tierData.stats.totalOrders}</p>
                <p><strong>Brands Used:</strong> ${Array.from(tierData.stats.brands).join(', ')}</p>
                <p><strong>Average Headcount:</strong> ${Math.round(tierData.stats.avgGuests)}</p>
                <p><strong>Platforms:</strong> ${Array.from(tierData.stats.platforms).join(', ')}</p>
                <p><strong>Contact:</strong> ${contactPerson}</p>
                <p><strong>Phone:</strong> ${phoneNumber}</p>
            </div>

            <h4>Interaction History</h4>
    `;

    if (interactions.length === 0) {
        historyHtml += '<p style="color: rgba(255,255,255,0.5);">No interactions recorded yet.</p>';
    } else {
        const sortedInteractions = interactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        historyHtml += sortedInteractions.map(interaction => `
            <div style="border-left: 3px solid #7877c6; padding: 15px; margin-bottom: 15px; background: rgba(255,255,255,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: 600; color: #7877c6;">${interaction.type}</span>
                    <span style="color: rgba(255,255,255,0.7);">${interaction.date}</span>
                </div>
                <p style="margin-bottom: 10px;">${interaction.notes}</p>
                ${interaction.nextFollowupDate ? `<p style="color: #fbbf24; font-size: 0.9rem;"><strong>Next Follow-up:</strong> ${interaction.nextFollowupDate}</p>` : ''}
                <p style="color: rgba(255,255,255,0.6); font-size: 0.8rem;"><strong>Status:</strong> ${interaction.salesStatus}</p>
            </div>
        `).join('');
    }

    historyHtml += '</div>';

    const modal = document.getElementById('interactionModal');
    const modalContent = modal.querySelector('.modal-content');

    // Store the original content so we can restore it later
    if (!modal.dataset.originalContent) {
        modal.dataset.originalContent = modalContent.innerHTML;
    }

    modalContent.innerHTML = `
        <span class="close" onclick="closeHistoryModal()">&times;</span>
        ${historyHtml}
        <div style="margin-top: 30px;">
            <button class="btn" onclick="openInteractionModalFromHistory('${company}')">Add New Note</button>
            <button class="btn btn-secondary" onclick="closeHistoryModal()">Close</button>
        </div>
    `;
    modal.style.display = 'block';
}

function openInteractionModalFromHistory(company) {
    const modal = document.getElementById('interactionModal');
    const modalContent = modal.querySelector('.modal-content');

    // Restore original form content
    if (modal.dataset.originalContent) {
        modalContent.innerHTML = modal.dataset.originalContent;
    }

    // Now open the interaction modal with the company pre-filled
    openInteractionModal(company);
}

function closeHistoryModal() {
    const modal = document.getElementById('interactionModal');
    const modalContent = modal.querySelector('.modal-content');

    // Restore original form content
    if (modal.dataset.originalContent) {
        modalContent.innerHTML = modal.dataset.originalContent;
    }

    modal.style.display = 'none';
}

async function saveInteractionToSheets(company, interaction) {
    const interactionId = Date.now().toString();
    const params = new URLSearchParams({
        id: interactionId,
        company: company,
        type: interaction.type,
        date: interaction.date,
        notes: interaction.notes,
        nextFollowup: interaction.nextFollowupDate || '',
        status: interaction.salesStatus,
        timestamp: new Date().toISOString()
    });
    
    const url = `https://script.google.com/macros/s/AKfycbxR06hjlCFRr_98JQnDwdp5Kuks08SmQjJTU2HkgLq5AEnVLhqrw4pAoltSk2EtdsjYBQ/exec?${params}`;
    
    const response = await fetch(url, {
        method: 'GET'
    });
    
    if (!response.ok) {
        throw new Error(`Failed to save interaction: ${response.statusText}`);
    }
    
    const result = await response.text();
    if (result !== 'SUCCESS') {
        throw new Error('Unexpected response from server');
    }
    
    return {success: true};
}

// Update the form submission handler - use event delegation on the modal container
document.addEventListener('submit', async function(e) {
    // Check if the submitted form is the interaction form
    if (e.target && e.target.id === 'interactionForm') {
        e.preventDefault();

        const company = document.getElementById('modalCompany').value;
        const interaction = {
            type: document.getElementById('interactionType').value,
            date: document.getElementById('interactionDate').value,
            notes: document.getElementById('interactionNotes').value,
            nextFollowupDate: document.getElementById('nextFollowupDate').value || null,
            salesStatus: document.getElementById('salesStatus').value
        };

        // Get the submit button and show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
                <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>
                Saving...
            </div>
        `;

        try {
            await saveInteractionToSheets(company, interaction);

            // Reload interactions from Google Sheets to ensure we have the latest data
            customerInteractions = await loadInteractionsFromSheets();

            console.log('Interaction saved and reloaded for company:', company);
            console.log('Current interactions for this company:', customerInteractions[company]);

            // Show success state
            submitBtn.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center;">
                    <span style="color: #10b981; margin-right: 8px;">✓</span>
                    Saved!
                </div>
            `;

            // Close modal after a brief delay
            setTimeout(() => {
                closeInteractionModal();
                showStatus('Interaction saved successfully!', 'success');

                // Refresh current tab
                const activeTab = document.querySelector('.tab-content.active').id;
                if (activeTab === 'todaysOrdersTab') updateTodaysOrders();
                else if (activeTab === 'orderHistoryTab') updateOrderHistory();
                else if (activeTab === 'salesPipelineTab') updateSalesPipeline();
            }, 1000);

        } catch (error) {
            console.error('Error saving interaction:', error);
            showStatus('Failed to save interaction', 'error');

            // Reset button on error
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
});