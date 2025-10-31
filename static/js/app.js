// Main JavaScript for AI Data Quality App

// Utility function for API calls
async function apiCall(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Simple alert for now - can be enhanced with a toast library
    alert(message);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load statistics on homepage
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/') {
        loadHomeStats();
    }
});

async function loadHomeStats() {
    try {
        const datasources = await apiCall('/api/datasources');
        const rules = await apiCall('/api/rules');
        const reports = await apiCall('/api/reports');

        document.querySelector('.stats-banner .stat:nth-child(1) .stat-number').textContent = datasources.length;
        document.querySelector('.stats-banner .stat:nth-child(2) .stat-number').textContent = rules.length;
        document.querySelector('.stats-banner .stat:nth-child(3) .stat-number').textContent = reports.length;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Escape key closes modals
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

console.log('AI Data Quality App initialized');
