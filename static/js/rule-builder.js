// Rule Builder - Visual Conditional Logic Editor
// Using React Flow for node-based rule creation

class RuleBuilder {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.nodeCounter = 0;
    }

    // Initialize the builder
    init() {
        this.loadDatasources();
        this.setupDragAndDrop();
        this.loadExamples();
    }

    // Load available datasources
    async loadDatasources() {
        try {
            const response = await fetch('/api/datasources');
            if (response.ok) {
                const datasources = await response.json();
                const select = document.getElementById('rule-datasource');
                
                datasources.forEach(ds => {
                    const option = document.createElement('option');
                    option.value = ds.id;
                    option.textContent = ds.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading datasources:', error);
        }
    }

    // Setup drag and drop from palette
    setupDragAndDrop() {
        const paletteNodes = document.querySelectorAll('.palette-node');
        
        paletteNodes.forEach(node => {
            node.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('application/reactflow', node.dataset.nodeType);
                event.dataTransfer.effectAllowed = 'move';
            });
        });
    }

    // Load example rules
    loadExamples() {
        this.examples = {
            age_check: {
                name: "Vérification d'âge pour commandes",
                description: "Si l'utilisateur a moins de 18 ans, il ne doit avoir aucune commande",
                nodes: [
                    { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: '🟢 Début' } },
                    { id: 'age_field', type: 'field', position: { x: 100, y: 150 }, data: { label: '📊 user.age', fieldName: 'user.age', fieldType: 'number' } },
                    { id: 'value_18', type: 'value', position: { x: 300, y: 150 }, data: { label: '🔢 18', value: 18, valueType: 'number' } },
                    { id: 'compare', type: 'comparison', position: { x: 200, y: 250 }, data: { label: '⚖️ <', operator: '<' } },
                    { id: 'condition', type: 'condition', position: { x: 200, y: 350 }, data: { label: '🔀 Si vrai alors' } },
                    { id: 'orders_field', type: 'field', position: { x: 100, y: 450 }, data: { label: '📊 user.orders', fieldName: 'user.orders', fieldType: 'array' } },
                    { id: 'length_fn', type: 'function', position: { x: 200, y: 550 }, data: { label: '⚙️ length()', function: 'length' } },
                    { id: 'value_0', type: 'value', position: { x: 400, y: 550 }, data: { label: '🔢 0', value: 0, valueType: 'number' } },
                    { id: 'check', type: 'check', position: { x: 300, y: 650 }, data: { label: '✅ Doit être égal', checkType: 'equals', errorMessage: 'Les mineurs ne peuvent pas commander' } },
                    { id: 'end', type: 'end', position: { x: 300, y: 750 }, data: { label: '🔴 Fin' } }
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'age_field' },
                    { id: 'e2', source: 'start', target: 'value_18' },
                    { id: 'e3', source: 'age_field', target: 'compare' },
                    { id: 'e4', source: 'value_18', target: 'compare' },
                    { id: 'e5', source: 'compare', target: 'condition' },
                    { id: 'e6', source: 'condition', target: 'orders_field', label: 'vrai' },
                    { id: 'e7', source: 'orders_field', target: 'length_fn' },
                    { id: 'e8', source: 'length_fn', target: 'check' },
                    { id: 'e9', source: 'value_0', target: 'check' },
                    { id: 'e10', source: 'check', target: 'end' }
                ]
            },
            email_format: {
                name: "Format email professionnel",
                description: "Si le type d'utilisateur est 'pro', l'email doit se terminer par le domaine de l'entreprise",
                nodes: [
                    { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: '🟢 Début' } },
                    { id: 'type_field', type: 'field', position: { x: 100, y: 150 }, data: { label: '📊 user.type', fieldName: 'user.type', fieldType: 'string' } },
                    { id: 'value_pro', type: 'value', position: { x: 300, y: 150 }, data: { label: '🔢 "pro"', value: 'pro', valueType: 'string' } },
                    { id: 'compare', type: 'comparison', position: { x: 200, y: 250 }, data: { label: '⚖️ ==', operator: '==' } },
                    { id: 'condition', type: 'condition', position: { x: 200, y: 350 }, data: { label: '🔀 Si vrai alors' } },
                    { id: 'email_field', type: 'field', position: { x: 100, y: 450 }, data: { label: '📊 user.email', fieldName: 'user.email', fieldType: 'string' } },
                    { id: 'check', type: 'check', position: { x: 200, y: 550 }, data: { label: '✅ Doit finir par', checkType: 'matches_pattern', pattern: '@company\\.com$', errorMessage: 'Email doit être du domaine entreprise' } },
                    { id: 'end', type: 'end', position: { x: 200, y: 650 }, data: { label: '🔴 Fin' } }
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'type_field' },
                    { id: 'e2', source: 'start', target: 'value_pro' },
                    { id: 'e3', source: 'type_field', target: 'compare' },
                    { id: 'e4', source: 'value_pro', target: 'compare' },
                    { id: 'e5', source: 'compare', target: 'condition' },
                    { id: 'e6', source: 'condition', target: 'email_field', label: 'vrai' },
                    { id: 'e7', source: 'email_field', target: 'check' },
                    { id: 'e8', source: 'check', target: 'end' }
                ]
            },
            price_coherence: {
                name: "Cohérence des prix après réduction",
                description: "Si une réduction est appliquée (discount > 0), le prix final doit être inférieur au prix original",
                nodes: [
                    { id: 'start', type: 'start', position: { x: 150, y: 50 }, data: { label: '🟢 Début' } },
                    { id: 'discount_field', type: 'field', position: { x: 100, y: 150 }, data: { label: '📊 order.discount', fieldName: 'order.discount', fieldType: 'number' } },
                    { id: 'value_0', type: 'value', position: { x: 300, y: 150 }, data: { label: '🔢 0', value: 0, valueType: 'number' } },
                    { id: 'compare1', type: 'comparison', position: { x: 200, y: 250 }, data: { label: '⚖️ >', operator: '>' } },
                    { id: 'condition', type: 'condition', position: { x: 200, y: 350 }, data: { label: '🔀 Si vrai alors' } },
                    { id: 'price_final', type: 'field', position: { x: 100, y: 450 }, data: { label: '📊 order.price_final', fieldName: 'order.price_final', fieldType: 'number' } },
                    { id: 'price_original', type: 'field', position: { x: 300, y: 450 }, data: { label: '📊 order.price_original', fieldName: 'order.price_original', fieldType: 'number' } },
                    { id: 'compare2', type: 'comparison', position: { x: 200, y: 550 }, data: { label: '⚖️ <', operator: '<' } },
                    { id: 'assert', type: 'assert', position: { x: 200, y: 650 }, data: { label: '⚠️ Doit être vrai', errorMessage: 'Prix final doit être inférieur au prix original si réduction' } },
                    { id: 'end', type: 'end', position: { x: 200, y: 750 }, data: { label: '🔴 Fin' } }
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'discount_field' },
                    { id: 'e2', source: 'start', target: 'value_0' },
                    { id: 'e3', source: 'discount_field', target: 'compare1' },
                    { id: 'e4', source: 'value_0', target: 'compare1' },
                    { id: 'e5', source: 'compare1', target: 'condition' },
                    { id: 'e6', source: 'condition', target: 'price_final', label: 'vrai' },
                    { id: 'e7', source: 'condition', target: 'price_original', label: 'vrai' },
                    { id: 'e8', source: 'price_final', target: 'compare2' },
                    { id: 'e9', source: 'price_original', target: 'compare2' },
                    { id: 'e10', source: 'compare2', target: 'assert' },
                    { id: 'e11', source: 'assert', target: 'end' }
                ]
            }
        };
    }

    // Load an example into the canvas
    loadExample(exampleId) {
        const example = this.examples[exampleId];
        if (!example) {
            console.error('Example not found:', exampleId);
            return;
        }

        // Update form fields
        document.getElementById('rule-name').value = example.name;
        document.getElementById('rule-description').value = example.description;

        // Send nodes and edges to React Flow
        // This will be handled by the React component
        console.log('Loading example:', example);
        
        // Dispatch custom event for React Flow to catch
        window.dispatchEvent(new CustomEvent('loadExample', { 
            detail: { 
                nodes: example.nodes, 
                edges: example.edges 
            } 
        }));
    }

    // Convert visual graph to executable rule
    generateRuleConfig() {
        const config = {
            version: '1.0',
            type: 'conditional',
            nodes: this.nodes,
            edges: this.edges,
            // Generate pseudo-code representation
            pseudoCode: this.generatePseudoCode(),
            // Generate Python-like execution logic
            executionLogic: this.generateExecutionLogic()
        };
        
        return config;
    }

    // Generate human-readable pseudo-code
    generatePseudoCode() {
        // Parse the graph and generate pseudo-code
        let code = '// Règle générée automatiquement\n\n';
        
        // Find condition nodes
        const conditions = this.nodes.filter(n => n.type === 'condition');
        
        conditions.forEach((cond, idx) => {
            code += `IF (condition_${idx}) THEN\n`;
            code += `  // Vérifications\n`;
            code += `END IF\n\n`;
        });
        
        return code;
    }

    // Generate executable logic
    generateExecutionLogic() {
        // This would be parsed by the backend to create actual validation logic
        const logic = {
            steps: [],
            validations: []
        };
        
        // Parse nodes in execution order
        // Start from 'start' nodes and follow edges
        
        return logic;
    }

    // Save the rule to backend
    async saveRule() {
        const ruleName = document.getElementById('rule-name').value;
        const datasource = document.getElementById('rule-datasource').value;
        const description = document.getElementById('rule-description').value;
        
        if (!ruleName || !datasource) {
            this.showNotification('Veuillez remplir le nom et la source de données', 'error');
            return;
        }
        
        const ruleConfig = this.generateRuleConfig();
        
        const ruleData = {
            name: ruleName,
            datasource_id: parseInt(datasource),
            description: description,
            rule_type: 'conditional',
            rule_config: ruleConfig,
            is_active: true
        };
        
        try {
            const response = await fetch('/api/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ruleData)
            });
            
            if (response.ok) {
                this.showNotification('Règle sauvegardée avec succès !', 'success');
                setTimeout(() => {
                    window.location.href = '/rules';
                }, 1500);
            } else {
                throw new Error('Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    // Show notification toast
    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Update nodes when React Flow changes
    updateNodes(nodes) {
        this.nodes = nodes;
    }

    // Update edges when React Flow changes
    updateEdges(edges) {
        this.edges = edges;
    }
}

// Export for use in HTML
window.RuleBuilder = RuleBuilder;
