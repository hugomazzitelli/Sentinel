/**
 * Execution Results Modal
 * Professional display of rule execution results with charts and KPIs
 */

function showExecutionResults(result, ruleName = 'Règle') {
    // Create modal if it doesn't exist
    let modal = document.getElementById('executionResultsModal');
    if (!modal) {
        modal = createExecutionModal();
        document.body.appendChild(modal);
    }

    const details = result.details;
    const status = result.status;
    const isSuccess = status === 'success' && details.success_percentage >= 95;
    const isWarning = status === 'success' && details.success_percentage < 95;
    const isError = status === 'error';

    // Determine icon and colors
    let icon, iconClass, statusText, statusClass;
    if (isSuccess) {
        icon = 'bi-check-circle-fill';
        iconClass = 'success';
        statusText = 'Succès';
        statusClass = 'badge-success';
    } else if (isWarning) {
        icon = 'bi-exclamation-triangle-fill';
        iconClass = 'warning';
        statusText = 'Attention';
        statusClass = 'badge-warning';
    } else {
        icon = 'bi-x-circle-fill';
        iconClass = 'error';
        statusText = 'Erreur';
        statusClass = 'badge-danger';
    }

    // Build modal content
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="execution-result-header">
            <div class="execution-result-icon ${iconClass}">
                <i class="bi ${icon}"></i>
            </div>
            <div class="execution-result-title">
                <h3>${ruleName}</h3>
                <span class="badge ${statusClass}">${statusText}</span>
            </div>
        </div>

        <div class="execution-kpis">
            <div class="execution-kpi-card">
                <div class="execution-kpi-value success">${details.expectations_met || 0}</div>
                <div class="execution-kpi-label">
                    <i class="bi bi-check-circle"></i> Validées
                </div>
            </div>
            <div class="execution-kpi-card">
                <div class="execution-kpi-value error">${(details.expectations_total - details.expectations_met) || 0}</div>
                <div class="execution-kpi-label">
                    <i class="bi bi-x-circle"></i> Échouées
                </div>
            </div>
            <div class="execution-kpi-card">
                <div class="execution-kpi-value">${details.expectations_total || 0}</div>
                <div class="execution-kpi-label">
                    <i class="bi bi-list-check"></i> Total
                </div>
            </div>
            <div class="execution-kpi-card">
                <div class="execution-kpi-value">${details.rows_checked || 0}</div>
                <div class="execution-kpi-label">
                    <i class="bi bi-database"></i> Lignes
                </div>
            </div>
        </div>

        <!-- Progress Ring -->
        <div class="progress-ring-container">
            <div class="progress-ring">
                <svg width="160" height="160">
                    <circle class="progress-ring-circle-bg" cx="80" cy="80" r="70"></circle>
                    <circle
                        class="progress-ring-circle"
                        cx="80"
                        cy="80"
                        r="70"
                        style="stroke-dasharray: 439.8; stroke-dashoffset: ${439.8 * (1 - details.success_percentage / 100)};"
                    ></circle>
                </svg>
                <div class="progress-ring-text">
                    <div class="progress-ring-percentage">${details.success_percentage.toFixed(1)}%</div>
                    <div class="progress-ring-label">Taux de succès</div>
                </div>
            </div>
        </div>

        ${isSuccess ? `
            <div class="execution-success-message">
                <i class="bi bi-check-circle-fill"></i>
                <p>Toutes les validations sont passées avec succès ! Vos données respectent les règles de qualité.</p>
            </div>
        ` : ''}

        ${details.failed_expectations && details.failed_expectations.length > 0 ? `
            <div class="failed-expectations">
                <h4>
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    Problèmes détectés (${details.failed_expectations.length})
                </h4>
                ${details.failed_expectations.map((failure, index) => `
                    <div class="failed-expectation-item">
                        <div class="failed-expectation-header">
                            <div class="failed-expectation-icon">
                                <i class="bi bi-x"></i>
                            </div>
                            <div class="failed-expectation-content">
                                <strong>${failure.expectation || 'Validation échouée'}</strong>
                                <span>Colonne: <code>${failure.column || 'N/A'}</code> · ${failure.failed_count || 0} erreur(s)</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <!-- Chart -->
        <div class="execution-chart" id="execution-chart-container">
            <h4><i class="bi bi-bar-chart-line"></i> Répartition des résultats</h4>
            <canvas id="executionChart" height="200"></canvas>
        </div>

        <div class="execution-modal-actions">
            <button class="btn btn-outline" onclick="closeModal('executionResultsModal')">
                <i class="bi bi-x-lg"></i> Fermer
            </button>
            <button class="btn btn-primary" onclick="downloadExecutionReport()">
                <i class="bi bi-download"></i> Télécharger le rapport
            </button>
        </div>
    `;

    // Show modal
    modal.style.display = 'flex';

    // Render chart
    setTimeout(() => renderExecutionChart(details), 100);
}

function createExecutionModal() {
    const modal = document.createElement('div');
    modal.id = 'executionResultsModal';
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Résultat d'exécution</h2>
                <button class="close-btn" onclick="closeModal('executionResultsModal')">&times;</button>
            </div>
            <div class="modal-body"></div>
        </div>
    `;

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal('executionResultsModal');
        }
    });

    return modal;
}

function renderExecutionChart(details) {
    const ctx = document.getElementById('executionChart');
    if (!ctx) return;

    const passed = details.expectations_met || 0;
    const failed = (details.expectations_total - details.expectations_met) || 0;

    // Destroy existing chart if it exists
    if (window.executionChartInstance) {
        window.executionChartInstance.destroy();
    }

    // Get theme colors
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    window.executionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Validées', 'Échouées'],
            datasets: [{
                data: [passed, failed],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 20,
                        font: {
                            size: 13,
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function downloadExecutionReport() {
    // TODO: Implement report download (PDF or CSV)
    showSuccessToast('Fonctionnalité à venir : téléchargement de rapport');
}

// Helper function for closing modals
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';

        // Destroy chart if exists
        if (modalId === 'executionResultsModal' && window.executionChartInstance) {
            window.executionChartInstance.destroy();
            window.executionChartInstance = null;
        }
    }
}

// Helper function for success toasts (if not already defined)
if (typeof showSuccessToast === 'undefined') {
    function showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>${message}</span>`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Export for global use
window.showExecutionResults = showExecutionResults;
window.closeModal = closeModal;
