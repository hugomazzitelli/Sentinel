/**
 * Reports Dashboard - Charts and KPIs
 */

let qualityTimelineChartInstance = null;
let ruleTypeChartInstance = null;
let rulePerformanceChartInstance = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    await loadDatasourcesFilter();
    await loadDashboardData();
    initializeCharts();
});

async function loadDatasourcesFilter() {
    try {
        const response = await fetch('/api/datasources');
        if (response.ok) {
            const datasources = await response.json();
            const select = document.getElementById('datasourceFilter');
            if (select) {
                datasources.forEach(ds => {
                    const option = document.createElement('option');
                    option.value = ds.id;
                    option.textContent = ds.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading datasources:', error);
    }
}

async function loadDashboardData() {
    try {
        const mockData = generateMockData();
        updateKPIs(mockData.kpis);
        updateRecentExecutions(mockData.executions);
        updateQualityScore(mockData.qualityScore);
        updateCharts(mockData.charts);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function generateMockData() {
    return {
        kpis: {
            totalRules: 24,
            successRate: 87.5,
            issues: 8,
            executions: 156
        },
        qualityScore: {
            value: 87.5,
            validated: 42,
            failed: 6,
            analyzedRows: 15234
        },
        executions: [
            { id: 1, rule: 'Email Format Validation', datasource: 'Users DB', date: '2025-10-31 14:30', status: 'success', successRate: 98.5 },
            { id: 2, rule: 'Null Check - Order Amount', datasource: 'Orders DB', date: '2025-10-31 14:15', status: 'warning', successRate: 85.2 },
            { id: 3, rule: 'Uniqueness - User IDs', datasource: 'Users DB', date: '2025-10-31 13:45', status: 'success', successRate: 100.0 },
            { id: 4, rule: 'Range Check - Age Field', datasource: 'Users DB', date: '2025-10-31 13:20', status: 'error', successRate: 72.3 },
            { id: 5, rule: 'Format - Phone Numbers', datasource: 'Contacts DB', date: '2025-10-31 12:55', status: 'success', successRate: 95.8 }
        ],
        charts: {
            timeline: generateTimelineData(30),
            ruleTypes: {
                labels: ['Null Check', 'Unicité', 'Format', 'Range', 'Custom'],
                data: [8, 6, 5, 3, 2]
            },
            rulePerformance: {
                labels: ['Email Validation', 'Null Checks', 'ID Uniqueness', 'Age Range', 'Phone Format', 'Address Format'],
                data: [98.5, 92.3, 100, 87.2, 95.8, 89.4]
            }
        }
    };
}

function generateTimelineData(days) {
    const data = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
            success: 70 + Math.random() * 25,
            failed: 10 + Math.random() * 15
        });
    }
    return data;
}

function updateKPIs(kpis) {
    document.getElementById('kpi-total-rules').textContent = kpis.totalRules;
    document.getElementById('kpi-success-rate').textContent = kpis.successRate.toFixed(1) + '%';
    document.getElementById('kpi-issues').textContent = kpis.issues;
    document.getElementById('kpi-executions').textContent = kpis.executions;
}

function updateQualityScore(score) {
    const scoreValue = document.getElementById('qualityScoreValue');
    const circle = document.getElementById('qualityScoreCircle');
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - score.value / 100);

    scoreValue.textContent = score.value.toFixed(1) + '%';
    circle.style.strokeDashoffset = offset;

    document.getElementById('validatedRules').textContent = score.validated;
    document.getElementById('failedRules').textContent = score.failed;
    document.getElementById('analyzedRows').textContent = score.analyzedRows.toLocaleString('fr-FR');
}

function updateRecentExecutions(executions) {
    const tbody = document.getElementById('executionsTableBody');
    tbody.innerHTML = '';

    executions.forEach(exec => {
        const statusClass = exec.status === 'success' ? 'success' : exec.status === 'warning' ? 'warning' : 'error';
        const statusIcon = exec.status === 'success' ? 'check-circle-fill' : exec.status === 'warning' ? 'exclamation-triangle-fill' : 'x-circle-fill';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${exec.rule}</strong></td>
            <td>${exec.datasource}</td>
            <td>${exec.date}</td>
            <td><span class="status-badge status-${statusClass}"><i class="bi bi-${statusIcon}"></i> ${exec.status}</span></td>
            <td><strong>${exec.successRate.toFixed(1)}%</strong></td>
            <td>
                <button class="btn-icon" onclick="viewExecutionDetails(${exec.id})" title="Voir détails"><i class="bi bi-eye"></i></button>
                <button class="btn-icon" onclick="downloadExecution(${exec.id})" title="Télécharger"><i class="bi bi-download"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function initializeCharts() {
    const mockData = generateMockData();
    createQualityTimelineChart(mockData.charts.timeline);
    createRuleTypeChart(mockData.charts.ruleTypes);
    createRulePerformanceChart(mockData.charts.rulePerformance);
}

function createQualityTimelineChart(data) {
    const ctx = document.getElementById('qualityTimelineChart');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    qualityTimelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {
                    label: 'Succès (%)',
                    data: data.map(d => d.success),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Échecs (%)',
                    data: data.map(d => d.failed),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor, font: { family: 'Inter' } } },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1
                }
            },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: textColor, callback: value => value + '%' } },
                x: { grid: { color: gridColor }, ticks: { color: textColor } }
            }
        }
    });
}

function createRuleTypeChart(data) {
    const ctx = document.getElementById('ruleTypeChart');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';

    ruleTypeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: ['rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(6, 182, 212, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(99, 102, 241, 0.8)'],
                borderWidth: 2,
                borderColor: isDark ? '#1f2937' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, padding: 15, font: { family: 'Inter' } } }
            }
        }
    });
}

function createRulePerformanceChart(data) {
    const ctx = document.getElementById('rulePerformanceChart');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    rulePerformanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Taux de succès (%)',
                data: data.data,
                backgroundColor: data.data.map(val => val >= 95 ? 'rgba(34, 197, 94, 0.8)' : val >= 85 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: isDark ? '#1f2937' : '#ffffff', titleColor: textColor, bodyColor: textColor, borderColor: gridColor, borderWidth: 1 }
            },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: textColor, callback: value => value + '%' } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            }
        }
    });
}

function filterReports() {
    loadDashboardData();
}

function refreshDashboard() {
    loadDashboardData();
    showSuccessToast('Données actualisées');
}

function exportReports() {
    showSuccessToast('Fonctionnalité à venir : export des rapports');
}

function viewExecutionDetails(execId) {
    alert('Voir détails de l\'exécution ' + execId);
}

function downloadExecution(execId) {
    showSuccessToast('Téléchargement de l\'exécution ' + execId + '...');
}

function updateTimelineChart(days) {
    if (qualityTimelineChartInstance) {
        const newData = generateTimelineData(parseInt(days));
        qualityTimelineChartInstance.data.labels = newData.map(d => d.date);
        qualityTimelineChartInstance.data.datasets[0].data = newData.map(d => d.success);
        qualityTimelineChartInstance.data.datasets[1].data = newData.map(d => d.failed);
        qualityTimelineChartInstance.update();
    }
}

function updateCharts(charts) {
    // Charts initialized with mock data
}

function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = '<i class="bi bi-check-circle-fill"></i><span>' + message + '</span>';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px; z-index: 10000; animation: slideIn 0.3s ease;';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}
