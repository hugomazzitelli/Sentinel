/**
 * Flow Editor - Vanilla JavaScript visual rule builder
 * Inspired by React Flow but built from scratch for Flask
 */

class FlowEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.draggedNode = null;
        this.connectingFrom = null;
        this.nodeCounter = 0;
        this.scale = 1;
        this.panOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.canvas.innerHTML = `
            <svg id="edges-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
                <defs>
                    <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                        <path d="M 0 0 L 12 6 L 0 12 z" fill="#6366f1" />
                    </marker>
                    <filter id="edge-shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                    </filter>
                </defs>
            </svg>
            <div id="nodes-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2;"></div>
        `;
        
        this.edgesLayer = this.canvas.querySelector('#edges-layer');
        this.nodesLayer = this.canvas.querySelector('#nodes-layer');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Canvas drag & drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('nodeType');
            if (nodeType) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left - this.panOffset.x) / this.scale;
                const y = (e.clientY - rect.top - this.panOffset.y) / this.scale;
                this.addNode(nodeType, x, y);
            }
        });
        
        // Canvas panning
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target === this.canvas || e.target === this.nodesLayer) {
                this.isPanning = true;
                this.panStart = { x: e.clientX - this.panOffset.x, y: e.clientY - this.panOffset.y };
                this.canvas.style.cursor = 'grabbing';
                this.deselectAll();
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panOffset.x = e.clientX - this.panStart.x;
                this.panOffset.y = e.clientY - this.panStart.y;
                this.updateTransform();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = 'grab';
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteNode(this.selectedNode.id);
            }
            if (e.key === 'Escape') {
                this.deselectAll();
                this.cancelConnection();
            }
        });
    }
    
    addNode(type, x, y) {
        const id = `node_${this.nodeCounter++}`;
        const node = {
            id: id,
            type: type,
            position: { x: x, y: y },
            data: this.getDefaultNodeData(type)
        };
        
        this.nodes.push(node);
        this.renderNode(node);
        this.selectNode(id);
        
        // Trigger event for property panel
        this.dispatchEvent('nodeSelected', node);
        
        return node;
    }
    
    getDefaultNodeData(type) {
        const defaults = {
            start: { label: '🟢 Début' },
            end: { label: '🔴 Fin' },
            field: { label: '📊 Champ', fieldName: '', fieldType: 'string' },
            value: { label: '🔢 Valeur', value: '', valueType: 'string' },
            comparison: { label: '⚖️ Comparaison', operator: '==' },
            logical: { label: '🔗 Logique', operator: 'and' },
            function: { label: '⚙️ Fonction', functionName: 'length' },
            condition: { label: '🔀 Condition' },
            check: { label: '✅ Validation', checkType: 'not_null' },
            assert: { label: '⚠️ Assert', errorMessage: '' }
        };
        
        return defaults[type] || { label: type };
    }
    
    renderNode(node) {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'flow-node';
        nodeEl.id = node.id;
        nodeEl.style.left = `${node.position.x}px`;
        nodeEl.style.top = `${node.position.y}px`;
        
        const nodeColors = {
            start: { main: '#22c55e', dark: '#16a34a' },
            end: { main: '#ef4444', dark: '#dc2626' },
            field: { main: '#3b82f6', dark: '#2563eb' },
            value: { main: '#8b5cf6', dark: '#7c3aed' },
            comparison: { main: '#f59e0b', dark: '#d97706' },
            logical: { main: '#ec4899', dark: '#db2777' },
            function: { main: '#06b6d4', dark: '#0891b2' },
            condition: { main: '#10b981', dark: '#059669' },
            check: { main: '#14b8a6', dark: '#0d9488' },
            assert: { main: '#f97316', dark: '#ea580c' }
        };
        
        const colors = nodeColors[node.type] || { main: '#6366f1', dark: '#4f46e5' };
        
        nodeEl.style.setProperty('--node-color', colors.main);
        nodeEl.style.setProperty('--node-color-dark', colors.dark);
        
        // Get icon for node type
        const icons = {
            start: '🟢',
            end: '🔴',
            field: '📊',
            value: '🔢',
            comparison: '⚖️',
            logical: '🔗',
            function: '⚙️',
            condition: '🔀',
            check: '✅',
            assert: '⚠️'
        };
        
        const icon = icons[node.type] || '●';
        
        // Determine number of inputs based on node type
        const multiInputTypes = ['comparison', 'logical', 'condition', 'check'];
        const hasMultipleInputs = multiInputTypes.includes(node.type);
        
        let inputPortsHTML = '';
        if (hasMultipleInputs) {
            // Multiple inputs for comparison/logical operations
            const inputCount = node.type === 'comparison' || node.type === 'logical' ? 2 : 
                              node.type === 'condition' ? 1 : 
                              node.type === 'check' ? 2 : 1;
            
            for (let i = 0; i < inputCount; i++) {
                const topOffset = inputCount === 1 ? 50 : (100 / (inputCount + 1)) * (i + 1);
                inputPortsHTML += `<div class="node-port input" data-node-id="${node.id}" data-port="input_${i}" 
                    style="top: ${topOffset}%; transform: translateY(-50%);" title="Entrée ${i + 1}"></div>`;
            }
        } else {
            inputPortsHTML = `<div class="node-port input" data-node-id="${node.id}" data-port="input" title="Entrée"></div>`;
        }
        
        nodeEl.innerHTML = `
            <div class="flow-node-header">
                <span style="font-size: 1.2rem;">${icon}</span>
                <div>
                    <div style="font-size: 0.85rem; font-weight: 600;">${node.data.label || node.type}</div>
                    <div class="flow-node-type">${node.type}</div>
                </div>
            </div>
            ${inputPortsHTML}
            <div class="node-port output" data-node-id="${node.id}" data-port="output" title="Sortie"></div>
        `;
        
        // Node dragging
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        nodeEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node-port')) return;

            isDragging = true;
            const canvasRect = this.canvas.getBoundingClientRect();

            // Calculate offset in canvas coordinate space (accounting for pan and scale)
            const mouseCanvasX = (e.clientX - canvasRect.left - this.panOffset.x) / this.scale;
            const mouseCanvasY = (e.clientY - canvasRect.top - this.panOffset.y) / this.scale;

            dragOffset = {
                x: mouseCanvasX - node.position.x,
                y: mouseCanvasY - node.position.y
            };

            this.selectNode(node.id);
            e.stopPropagation();
        });
        
        const onMouseMove = (e) => {
            if (isDragging) {
                const canvasRect = this.canvas.getBoundingClientRect();

                // Convert mouse position to canvas coordinate space
                const mouseCanvasX = (e.clientX - canvasRect.left - this.panOffset.x) / this.scale;
                const mouseCanvasY = (e.clientY - canvasRect.top - this.panOffset.y) / this.scale;

                // Apply the offset to maintain grip point
                node.position.x = mouseCanvasX - dragOffset.x;
                node.position.y = mouseCanvasY - dragOffset.y;

                nodeEl.style.left = `${node.position.x}px`;
                nodeEl.style.top = `${node.position.y}px`;
                this.updateEdges();
            }
        };
        
        const onMouseUp = () => {
            isDragging = false;
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Port connection handlers
        const ports = nodeEl.querySelectorAll('.node-port');
        ports.forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (port.classList.contains('output')) {
                    this.startConnection(node.id);
                }
            });
            
            port.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                if (port.classList.contains('input') && this.connectingFrom) {
                    this.completeConnection(node.id, port.dataset.port);
                }
            });
            
            port.addEventListener('mouseenter', () => {
                if (this.connectingFrom && port.dataset.port === 'input') {
                    port.style.background = '#22c55e';
                    port.style.transform = 'translateY(-50%) scale(1.3)';
                }
            });
            
            port.addEventListener('mouseleave', () => {
                port.style.background = '';
                port.style.transform = '';
            });
        });
        
        this.nodesLayer.appendChild(nodeEl);
    }
    
    startConnection(nodeId) {
        this.connectingFrom = nodeId;
        this.canvas.style.cursor = 'crosshair';
        
        // Add visual feedback to source node
        const sourceNode = document.getElementById(nodeId);
        if (sourceNode) {
            sourceNode.classList.add('connecting-mode');
            const outputPort = sourceNode.querySelector('.node-port.output');
            if (outputPort) {
                outputPort.classList.add('connecting');
            }
        }
        
        // Draw temporary edge while connecting
        const mouseMoveHandler = (e) => {
            if (this.connectingFrom) {
                this.drawTemporaryEdge(e);
            }
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        
        const cleanup = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            this.removeTemporaryEdge();
            
            // Remove visual feedback
            if (sourceNode) {
                sourceNode.classList.remove('connecting-mode');
                const outputPort = sourceNode.querySelector('.node-port.output');
                if (outputPort) {
                    outputPort.classList.remove('connecting');
                }
            }
        };
        
        document.addEventListener('mouseup', cleanup, { once: true });
    }
    
    drawTemporaryEdge(e) {
        const fromNode = this.nodes.find(n => n.id === this.connectingFrom);
        if (!fromNode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const nodeEl = document.getElementById(this.connectingFrom);
        const outputPort = nodeEl.querySelector('.node-port.output');
        const portRect = outputPort.getBoundingClientRect();
        
        // Snap to actual port position
        const fromX = portRect.left + portRect.width / 2 - rect.left;
        const fromY = portRect.top + portRect.height / 2 - rect.top;
        const toX = e.clientX - rect.left;
        const toY = e.clientY - rect.top;
        
        // Remove old temporary edge
        const oldTemp = this.edgesLayer.querySelector('.temp-edge');
        if (oldTemp) oldTemp.remove();
        
        // Create new temporary edge
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'temp-edge');
        path.setAttribute('d', this.createEdgePath(fromX, fromY, toX, toY));
        path.setAttribute('stroke', '#6366f1');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-dasharray', '8,4');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        path.style.filter = 'drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))';
        
        this.edgesLayer.appendChild(path);
    }
    
    removeTemporaryEdge() {
        const temp = this.edgesLayer.querySelector('.temp-edge');
        if (temp) temp.remove();
    }
    
    completeConnection(targetNodeId, targetPort) {
        if (this.connectingFrom && this.connectingFrom !== targetNodeId) {
            const edgeId = `edge_${this.connectingFrom}_${targetNodeId}_${targetPort || 'input'}`;

            // Check if edge already exists
            if (!this.edges.find(e => e.id === edgeId)) {
                const edge = {
                    id: edgeId,
                    source: this.connectingFrom,
                    sourcePort: 'output',
                    target: targetNodeId,
                    targetPort: targetPort || 'input',
                    label: ''
                };

                this.edges.push(edge);
                this.updateEdges();

                // Update input display for the target node
                this.updateNodeConnectedInputsDisplay(targetNodeId);

                this.dispatchEvent('edgeCreated', edge);
            }
        }

        this.cancelConnection();
    }
    
    cancelConnection() {
        this.connectingFrom = null;
        this.canvas.style.cursor = 'grab';
        this.removeTemporaryEdge();
    }
    
    updateEdges() {
        // Clear existing edges
        const existingEdges = this.edgesLayer.querySelectorAll('path:not(.temp-edge)');
        existingEdges.forEach(e => e.remove());
        
        // Redraw all edges
        this.edges.forEach(edge => {
            const sourceNode = this.nodes.find(n => n.id === edge.source);
            const targetNode = this.nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
                const canvasRect = this.canvas.getBoundingClientRect();
                const sourceEl = document.getElementById(edge.source);
                const targetEl = document.getElementById(edge.target);
                
                if (!sourceEl || !targetEl) return;
                
                const sourcePort = sourceEl.querySelector(`.node-port[data-port="${edge.sourcePort || 'output'}"]`);
                const targetPort = targetEl.querySelector(`.node-port[data-port="${edge.targetPort || 'input'}"]`);
                
                if (!sourcePort || !targetPort) return;
                
                const sourceRect = sourcePort.getBoundingClientRect();
                const targetRect = targetPort.getBoundingClientRect();
                
                // Get exact port centers
                const fromX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
                const fromY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
                const toX = targetRect.left + targetRect.width / 2 - canvasRect.left;
                const toY = targetRect.top + targetRect.height / 2 - canvasRect.top;
                
                // Background path for better click area
                const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                bgPath.setAttribute('d', this.createEdgePath(fromX, fromY, toX, toY));
                bgPath.setAttribute('stroke', 'transparent');
                bgPath.setAttribute('stroke-width', '20');
                bgPath.setAttribute('fill', 'none');
                bgPath.style.cursor = 'pointer';
                bgPath.setAttribute('data-edge-id', edge.id + '_bg');
                
                // Main path
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', this.createEdgePath(fromX, fromY, toX, toY));
                path.setAttribute('stroke', '#6366f1');
                path.setAttribute('stroke-width', '3');
                path.setAttribute('fill', 'none');
                path.setAttribute('marker-end', 'url(#arrowhead)');
                path.setAttribute('data-edge-id', edge.id);
                path.style.cursor = 'pointer';
                path.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
                
                const clickHandler = () => {
                    this.selectEdge(edge.id);
                };
                
                bgPath.addEventListener('click', clickHandler);
                path.addEventListener('click', clickHandler);
                
                this.edgesLayer.appendChild(bgPath);
                this.edgesLayer.appendChild(path);
            }
        });
    }
    
    createEdgePath(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // Bezier curve for smooth edges
        const cx1 = x1 + dx * 0.5;
        const cy1 = y1;
        const cx2 = x2 - dx * 0.5;
        const cy2 = y2;
        
        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
    
    selectNode(nodeId) {
        this.deselectAll();
        
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            this.selectedNode = node;
            const nodeEl = document.getElementById(nodeId);
            if (nodeEl) {
                nodeEl.classList.add('selected');
            }
            this.dispatchEvent('nodeSelected', node);
        }
    }
    
    selectEdge(edgeId) {
        this.deselectAll();
        
        const edge = this.edges.find(e => e.id === edgeId);
        if (edge) {
            this.selectedEdge = edge;
            const edgeEl = this.edgesLayer.querySelector(`[data-edge-id="${edgeId}"]`);
            if (edgeEl) {
                edgeEl.setAttribute('stroke-width', '4');
                edgeEl.setAttribute('stroke', '#22c55e');
            }
            this.dispatchEvent('edgeSelected', edge);
        }
    }
    
    deselectAll() {
        // Deselect nodes
        if (this.selectedNode) {
            const nodeEl = document.getElementById(this.selectedNode.id);
            if (nodeEl) {
                nodeEl.classList.remove('selected');
            }
            this.selectedNode = null;
        }
        
        // Deselect edges
        if (this.selectedEdge) {
            this.updateEdges(); // Redraw to remove selection
            this.selectedEdge = null;
        }
        
        this.dispatchEvent('selectionCleared');
    }
    
    deleteNode(nodeId) {
        // Find nodes that were connected to this node
        const connectedNodes = new Set();
        this.edges.forEach(e => {
            if (e.source === nodeId) connectedNodes.add(e.target);
            if (e.target === nodeId) connectedNodes.add(e.source);
        });

        // Remove node
        this.nodes = this.nodes.filter(n => n.id !== nodeId);

        // Remove connected edges
        this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

        // Remove DOM element
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) {
            nodeEl.remove();
        }

        this.updateEdges();

        // Update displays of all nodes that were connected
        connectedNodes.forEach(id => {
            this.updateNodeConnectedInputsDisplay(id);
        });

        this.deselectAll();
        this.dispatchEvent('nodeDeleted', nodeId);
    }
    
    deleteEdge(edgeId) {
        // Find the edge before deleting to update its target node
        const edge = this.edges.find(e => e.id === edgeId);
        const targetNodeId = edge ? edge.target : null;

        this.edges = this.edges.filter(e => e.id !== edgeId);
        this.updateEdges();

        // Update input display for the target node
        if (targetNodeId) {
            this.updateNodeConnectedInputsDisplay(targetNodeId);
        }

        this.deselectAll();
        this.dispatchEvent('edgeDeleted', edgeId);
    }
    
    updateNodeData(nodeId, data) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.data = { ...node.data, ...data };

            // Update visual if label changed
            const nodeEl = document.getElementById(nodeId);
            if (nodeEl && data.label) {
                const header = nodeEl.querySelector('.flow-node-header');
                if (header) {
                    header.childNodes[0].textContent = data.label;
                }
            }

            // Refresh connected nodes display
            this.updateNodeConnectedInputsDisplay(nodeId);
        }
    }

    getConnectedInputs(nodeId) {
        // Find all edges that target this node
        const incomingEdges = this.edges.filter(e => e.target === nodeId);

        // Map to source nodes with their port information
        return incomingEdges.map(edge => {
            const sourceNode = this.nodes.find(n => n.id === edge.source);
            return {
                port: edge.targetPort,
                sourceNode: sourceNode,
                edge: edge
            };
        }).filter(item => item.sourceNode !== undefined);
    }

    updateNodeConnectedInputsDisplay(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const nodeEl = document.getElementById(nodeId);
        if (!nodeEl) return;

        // Only update for nodes that should display input values
        const displayInputTypes = ['comparison', 'logical', 'condition', 'check', 'function'];
        if (!displayInputTypes.includes(node.type)) return;

        const connectedInputs = this.getConnectedInputs(nodeId);

        // Remove existing input value displays
        const existingDisplays = nodeEl.querySelectorAll('.node-input-value');
        existingDisplays.forEach(el => el.remove());

        // Add input value displays for each connected input
        connectedInputs.forEach(({ port, sourceNode }) => {
            const targetPort = nodeEl.querySelector(`.node-port.input[data-port="${port}"]`);
            if (!targetPort) return;

            // Create value display element
            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'node-input-value';

            // Get display value from source node
            let displayValue = '';
            if (sourceNode.type === 'field') {
                displayValue = sourceNode.data.fieldName || '(champ)';
            } else if (sourceNode.type === 'value') {
                displayValue = sourceNode.data.value || '(valeur)';
            } else if (sourceNode.type === 'function') {
                displayValue = `${sourceNode.data.functionName}()`;
            } else {
                displayValue = sourceNode.data.label || sourceNode.type;
            }

            valueDisplay.textContent = displayValue;
            valueDisplay.style.cssText = `
                position: absolute;
                left: -8px;
                top: ${targetPort.style.top};
                transform: translateX(-100%) translateY(-50%);
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 6px;
                padding: 4px 8px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #6366f1;
                white-space: nowrap;
                pointer-events: none;
                backdrop-filter: blur(4px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;

            nodeEl.appendChild(valueDisplay);
        });
    }

    updateAllNodeInputDisplays() {
        this.nodes.forEach(node => {
            this.updateNodeConnectedInputsDisplay(node.id);
        });
    }
    
    updateTransform() {
        this.nodesLayer.style.transform = `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.scale})`;
        this.updateEdges();
    }
    
    zoom(delta) {
        const oldScale = this.scale;
        this.scale = Math.max(0.1, Math.min(2, this.scale + delta));
        
        // Adjust pan to zoom towards center
        const centerX = this.canvas.clientWidth / 2;
        const centerY = this.canvas.clientHeight / 2;
        
        this.panOffset.x = centerX - (centerX - this.panOffset.x) * (this.scale / oldScale);
        this.panOffset.y = centerY - (centerY - this.panOffset.y) * (this.scale / oldScale);
        
        this.updateTransform();
    }
    
    fitView() {
        if (this.nodes.length === 0) return;
        
        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + 150);
            maxY = Math.max(maxY, node.position.y + 60);
        });
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        const scaleX = (this.canvas.clientWidth - 100) / width;
        const scaleY = (this.canvas.clientHeight - 100) / height;
        
        this.scale = Math.min(scaleX, scaleY, 1);
        
        this.panOffset.x = (this.canvas.clientWidth - width * this.scale) / 2 - minX * this.scale;
        this.panOffset.y = (this.canvas.clientHeight - height * this.scale) / 2 - minY * this.scale;
        
        this.updateTransform();
    }
    
    clear() {
        this.nodes = [];
        this.edges = [];
        this.nodesLayer.innerHTML = '';
        this.updateEdges();
        this.deselectAll();
        this.nodeCounter = 0;
    }
    
    loadFromConfig(config) {
        this.clear();

        if (config.nodes) {
            config.nodes.forEach(node => {
                const newNode = {
                    id: node.id,
                    type: node.type,
                    position: node.position || { x: 100, y: 100 },
                    data: node.data || this.getDefaultNodeData(node.type)
                };
                this.nodes.push(newNode);
                this.renderNode(newNode);
            });
        }

        if (config.edges) {
            config.edges.forEach(edge => {
                this.edges.push({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    targetPort: edge.targetPort || 'input',
                    sourcePort: edge.sourcePort || 'output',
                    label: edge.label || ''
                });
            });
        }

        this.updateEdges();

        // Update all input displays after loading
        this.updateAllNodeInputDisplays();

        // Auto-fit after loading
        setTimeout(() => this.fitView(), 100);
    }
    
    exportConfig() {
        return {
            nodes: this.nodes.map(n => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data
            })),
            edges: this.edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label
            })),
            version: '1.0'
        };
    }
    
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(`flow:${eventName}`, { detail: data });
        this.canvas.dispatchEvent(event);
    }
}

// Export for global use
window.FlowEditor = FlowEditor;
