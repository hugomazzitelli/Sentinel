"""
Conditional Rules Engine
Parses and executes visual conditional rules created with the rule builder.
"""

import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class RuleNode:
    """Represents a node in the rule graph"""
    id: str
    type: str
    data: Dict[str, Any]
    position: Dict[str, float]


@dataclass
class RuleEdge:
    """Represents an edge (connection) between nodes"""
    id: str
    source: str
    target: str
    label: Optional[str] = None


class ConditionalRuleEngine:
    """
    Engine to parse and execute conditional rules from the visual editor.
    """
    
    def __init__(self):
        self.nodes = []
        self.edges = []
        self.execution_order = []
        self.variables = {}
        self.skip_nodes = set()
        
    def load_rule(self, rule_config: Dict[str, Any]):
        """Load a rule configuration from the visual editor"""
        self.nodes = [RuleNode(**node) for node in rule_config.get('nodes', [])]
        self.edges = [RuleEdge(**edge) for edge in rule_config.get('edges', [])]
        self._build_execution_order()
        
    def _build_execution_order(self):
        """Build the execution order by traversing the graph from start nodes"""
        # Find start nodes
        start_nodes = [n for n in self.nodes if n.type == 'start']
        
        if not start_nodes:
            raise ValueError("No start node found in rule")
        
        # Traverse graph using BFS
        visited = set()
        queue = start_nodes.copy()
        execution_order = []
        
        while queue:
            current = queue.pop(0)
            if current.id in visited:
                continue
                
            visited.add(current.id)
            execution_order.append(current)
            
            # Find connected nodes
            outgoing_edges = [e for e in self.edges if e.source == current.id]
            for edge in outgoing_edges:
                target_node = next((n for n in self.nodes if n.id == edge.target), None)
                if target_node and target_node.id not in visited:
                    queue.append(target_node)
        
        self.execution_order = execution_order
    
    def _get_or_execute_node(self, node_id: str, data_row: Dict[str, Any]) -> Any:
        """Get the value of a node, executing it if necessary"""
        if node_id in self.variables:
            return self.variables[node_id]
        
        # Find the node
        node = next((n for n in self.nodes if n.id == node_id), None)
        if not node:
            raise ValueError(f"Node {node_id} not found")
        
        # Execute and store
        result = self._execute_node(node, data_row)
        self.variables[node_id] = result
        return result
        
    def execute(self, data_row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the rule on a single data row.
        
        Args:
            data_row: Dictionary with the data to validate (e.g., {'user': {'age': 17, 'orders': []}})
            
        Returns:
            Dictionary with validation results
        """
        self.variables = {'__data__': data_row}
        self.skip_nodes = set()  # Nodes to skip based on conditional logic
        results = {
            'success': True,
            'errors': [],
            'warnings': [],
            'executed_nodes': []
        }
        
        try:
            for node in self.execution_order:
                # Skip nodes that are in non-executed branches
                if node.id in self.skip_nodes:
                    continue
                    
                node_result = self._execute_node(node, data_row)
                results['executed_nodes'].append({
                    'node_id': node.id,
                    'type': node.type,
                    'result': node_result
                })
                
                # Store result in variables
                self.variables[node.id] = node_result
                
                # Handle conditional branching
                if node.type == 'condition':
                    self._handle_conditional_branches(node, node_result)
                
                # Check if it's a validation node
                if node.type in ['check', 'assert']:
                    if not node_result.get('valid', True):
                        results['success'] = False
                        results['errors'].append({
                            'node_id': node.id,
                            'message': node.data.get('errorMessage', 'Validation failed'),
                            'details': node_result
                        })
                        
        except Exception as e:
            results['success'] = False
            results['errors'].append({
                'type': 'execution_error',
                'message': str(e)
            })
            
        return results
        
    def _execute_node(self, node: RuleNode, data_row: Dict[str, Any]) -> Any:
        """Execute a single node and return its result"""
        
        # Check if already executed
        if node.id in self.variables:
            return self.variables[node.id]
        
        if node.type == 'start':
            return {'started': True}
            
        elif node.type == 'end':
            return {'ended': True}
            
        elif node.type == 'field':
            return self._get_field_value(node.data.get('fieldName', ''), data_row)
            
        elif node.type == 'value':
            return self._parse_value(node.data.get('value'), node.data.get('valueType', 'string'))
            
        elif node.type == 'comparison':
            return self._execute_comparison(node, data_row)
            
        elif node.type == 'logical':
            return self._execute_logical(node, data_row)
            
        elif node.type == 'function':
            return self._execute_function(node, data_row)
            
        elif node.type == 'condition':
            return self._execute_condition(node, data_row)
            
        elif node.type == 'check':
            return self._execute_check(node, data_row)
            
        elif node.type == 'assert':
            return self._execute_assert(node, data_row)
            
        else:
            return {'type': node.type, 'executed': True}
            
    def _get_field_value(self, field_name: str, data_row: Dict[str, Any]) -> Any:
        """
        Get a field value from the data row using dot notation.
        Example: 'user.age' -> data_row['user']['age']
        """
        parts = field_name.split('.')
        value = data_row
        
        for part in parts:
            # Handle array indexing like 'items[0]'
            array_match = re.match(r'(\w+)\[(\d+)\]', part)
            if array_match:
                key, index = array_match.groups()
                value = value.get(key, [])[int(index)]
            else:
                value = value.get(part)
                
            if value is None:
                return None
                
        return value
        
    def _parse_value(self, value: Any, value_type: str) -> Any:
        """Parse a value according to its type"""
        if value_type == 'number':
            return float(value) if '.' in str(value) else int(value)
        elif value_type == 'boolean':
            return str(value).lower() in ['true', '1', 'yes']
        else:
            return str(value)
            
    def _execute_comparison(self, node: RuleNode, data_row: Dict[str, Any]) -> bool:
        """Execute a comparison node"""
        operator = node.data.get('operator', '==')
        
        # Get input values from connected nodes
        incoming_edges = [e for e in self.edges if e.target == node.id]
        if len(incoming_edges) < 2:
            raise ValueError(f"Comparison node {node.id} needs 2 inputs")
        
        # Execute dependencies if needed
        left_value = self._get_or_execute_node(incoming_edges[0].source, data_row)
        right_value = self._get_or_execute_node(incoming_edges[1].source, data_row)
        
        # Execute comparison
        if operator == '==':
            return left_value == right_value
        elif operator == '!=':
            return left_value != right_value
        elif operator == '>':
            return left_value > right_value
        elif operator == '<':
            return left_value < right_value
        elif operator == '>=':
            return left_value >= right_value
        elif operator == '<=':
            return left_value <= right_value
        elif operator == 'in':
            return left_value in right_value
        elif operator == 'not in':
            return left_value not in right_value
        else:
            raise ValueError(f"Unknown operator: {operator}")
            
    def _execute_logical(self, node: RuleNode, data_row: Dict[str, Any]) -> bool:
        """Execute a logical node (AND/OR/NOT)"""
        operator = node.data.get('operator', 'and')
        
        # Get input values
        incoming_edges = [e for e in self.edges if e.target == node.id]
        input_values = [self._get_or_execute_node(e.source, data_row) for e in incoming_edges]
        
        if operator == 'and':
            return all(input_values)
        elif operator == 'or':
            return any(input_values)
        elif operator == 'not':
            return not input_values[0] if input_values else True
        else:
            raise ValueError(f"Unknown logical operator: {operator}")
            
    def _execute_function(self, node: RuleNode, data_row: Dict[str, Any]) -> Any:
        """Execute a function node"""
        function_name = node.data.get('function', 'length')
        
        # Get input value
        incoming_edges = [e for e in self.edges if e.target == node.id]
        if not incoming_edges:
            raise ValueError(f"Function node {node.id} needs an input")
            
        input_value = self._get_or_execute_node(incoming_edges[0].source, data_row)
        
        # Execute function
        if function_name == 'length':
            return len(input_value) if input_value is not None else 0
        elif function_name == 'count':
            return len(input_value) if isinstance(input_value, (list, tuple)) else 0
        elif function_name == 'sum':
            return sum(input_value) if isinstance(input_value, (list, tuple)) else 0
        elif function_name == 'avg':
            return sum(input_value) / len(input_value) if input_value else 0
        elif function_name == 'min':
            return min(input_value) if input_value else None
        elif function_name == 'max':
            return max(input_value) if input_value else None
        elif function_name == 'upper':
            return str(input_value).upper() if input_value else ''
        elif function_name == 'lower':
            return str(input_value).lower() if input_value else ''
        elif function_name == 'trim':
            return str(input_value).strip() if input_value else ''
        else:
            raise ValueError(f"Unknown function: {function_name}")
            
    def _execute_condition(self, node: RuleNode, data_row: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a conditional node (if-then-else)"""
        # Get condition result
        incoming_edges = [e for e in self.edges if e.target == node.id]
        if not incoming_edges:
            raise ValueError(f"Condition node {node.id} needs a condition input")
            
        condition_result = self._get_or_execute_node(incoming_edges[0].source, data_row)
        
        # Determine which branch to follow
        outgoing_edges = [e for e in self.edges if e.source == node.id]
        
        branch_to_execute = None
        for edge in outgoing_edges:
            if condition_result and edge.label == 'vrai':
                branch_to_execute = edge.target
                break
            elif not condition_result and edge.label == 'faux':
                branch_to_execute = edge.target
                break
                
        return {
            'condition': condition_result,
            'branch': branch_to_execute
        }
    
    def _handle_conditional_branches(self, condition_node: RuleNode, condition_result: Dict[str, Any]):
        """Mark nodes to skip based on conditional logic"""
        condition_value = condition_result['condition']
        outgoing_edges = [e for e in self.edges if e.source == condition_node.id]
        
        # Mark all branches that should NOT be executed
        for edge in outgoing_edges:
            should_skip = False
            
            if edge.label == 'vrai' and not condition_value:
                should_skip = True
            elif edge.label == 'faux' and condition_value:
                should_skip = True
                
            if should_skip:
                # Mark this node and all its descendants to skip
                self._mark_descendants_to_skip(edge.target)
    
    def _mark_descendants_to_skip(self, node_id: str):
        """Recursively mark a node and its descendants to skip"""
        if node_id in self.skip_nodes:
            return
            
        self.skip_nodes.add(node_id)
        
        # Find all nodes connected from this one
        outgoing_edges = [e for e in self.edges if e.source == node_id]
        for edge in outgoing_edges:
            self._mark_descendants_to_skip(edge.target)
        
    def _execute_check(self, node: RuleNode, data_row: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a check/validation node"""
        check_type = node.data.get('checkType', 'not_null')
        error_message = node.data.get('errorMessage', 'Validation failed')
        
        # Get input value
        incoming_edges = [e for e in self.edges if e.target == node.id]
        if not incoming_edges:
            return {'valid': False, 'error': 'No input for check'}
            
        input_value = self._get_or_execute_node(incoming_edges[0].source, data_row)
        
        # Execute check
        valid = False
        
        if check_type == 'not_null':
            valid = input_value is not None
        elif check_type == 'unique':
            # This would require access to the full dataset
            valid = True  # Placeholder
        elif check_type == 'in_range':
            min_val = node.data.get('min', float('-inf'))
            max_val = node.data.get('max', float('inf'))
            valid = min_val <= input_value <= max_val
        elif check_type == 'matches_pattern':
            pattern = node.data.get('pattern', '.*')
            valid = bool(re.match(pattern, str(input_value)))
        elif check_type == 'equals':
            # Compare with expected value from second input
            if len(incoming_edges) >= 2:
                expected = self._get_or_execute_node(incoming_edges[1].source, data_row)
                valid = input_value == expected
            else:
                valid = False
        else:
            valid = True  # Unknown check type passes by default
            
        return {
            'valid': valid,
            'check_type': check_type,
            'value': input_value,
            'error': error_message if not valid else None
        }
        
    def _execute_assert(self, node: RuleNode, data_row: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an assertion node"""
        error_message = node.data.get('errorMessage', 'Assertion failed')
        
        # Get input value (should be boolean)
        incoming_edges = [e for e in self.edges if e.target == node.id]
        if not incoming_edges:
            return {'valid': False, 'error': 'No input for assert'}
            
        condition = self._get_or_execute_node(incoming_edges[0].source, data_row)
        
        return {
            'valid': bool(condition),
            'error': error_message if not condition else None
        }
        
    def generate_pseudo_code(self) -> str:
        """Generate human-readable pseudo-code from the rule"""
        lines = ["// Règle conditionnelle générée automatiquement", ""]
        
        for node in self.execution_order:
            if node.type == 'condition':
                lines.append(f"SI (condition_{node.id}) ALORS")
            elif node.type == 'check':
                check_type = node.data.get('checkType', 'unknown')
                lines.append(f"  VÉRIFIER: {check_type}")
            elif node.type == 'assert':
                msg = node.data.get('errorMessage', 'assertion')
                lines.append(f"  ASSERT: {msg}")
                
        lines.append("")
        lines.append("FIN")
        
        return "\n".join(lines)
