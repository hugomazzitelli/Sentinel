"""AI Agent service using Ollama for data quality suggestions"""
import requests
import json


class AIAgent:
    """AI Agent that uses Ollama to suggest and generate data quality rules"""

    def __init__(self, ollama_url='http://localhost:11434', model='tinyllama'):
        self.ollama_url = ollama_url
        self.model = model

    def _call_ollama(self, prompt, system_prompt=None):
        """Make a request to Ollama API"""
        try:
            url = f"{self.ollama_url}/api/generate"

            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            }

            if system_prompt:
                payload["system"] = system_prompt

            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()

            result = response.json()
            return result.get('response', '')

        except requests.exceptions.RequestException as e:
            print(f"Error calling Ollama: {e}")
            return None

    def suggest_quality_rules(self, schema_info):
        """
        Analyze a data schema and suggest quality rules
        """
        system_prompt = """You are a data quality expert. Your role is to analyze database schemas
        and suggest relevant data quality rules. Focus on common issues like:
        - Null values in important columns
        - Uniqueness constraints
        - Data type validations
        - Range checks for numeric values
        - Format validations (emails, dates, etc.)
        - Referential integrity

        Respond with a JSON array of suggested rules."""

        prompt = f"""
        Analyze this database schema and suggest data quality rules:

        {json.dumps(schema_info, indent=2)}

        For each table and column, suggest specific quality rules.
        Return your response as a JSON array with this structure:
        [
            {{
                "rule_name": "Check email format in users table",
                "rule_type": "format",
                "table": "users",
                "column": "email",
                "description": "Validate email addresses match standard format",
                "priority": "high",
                "suggested_config": {{
                    "regex": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{{2,}}$"
                }}
            }}
        ]

        Provide 5-10 most important rules.
        """

        response = self._call_ollama(prompt, system_prompt)

        if response:
            try:
                # Try to extract JSON from response
                # Ollama might wrap it in markdown or text
                start = response.find('[')
                end = response.rfind(']') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    suggestions = json.loads(json_str)
                    return suggestions
            except json.JSONDecodeError:
                print("Could not parse AI response as JSON")

        # Return default suggestions if AI fails
        return self._get_default_suggestions(schema_info)

    def _get_default_suggestions(self, schema_info):
        """Fallback suggestions based on common patterns and data types"""
        suggestions = []
        seen_rules = set()  # Track unique rules to avoid duplicates

        for table in schema_info.get('tables', []):
            table_name = table['name']

            for column in table.get('columns', []):
                col_name = column['name']
                col_type = str(column.get('type', '')).lower()
                is_nullable = column.get('nullable', True)
                
                # Create unique key for this column
                rule_key = f"{table_name}.{col_name}"
                
                # Primary key columns (id) - should be unique and not null
                if col_name.lower() in ['id', f'{table_name}_id'] or col_name.lower().endswith('_id') and col_name == 'id':
                    if f"unique_{rule_key}" not in seen_rules:
                        suggestions.append({
                            'rule_name': f"Vérifier l'unicité de {col_name} dans {table_name}",
                            'rule_type': 'uniqueness',
                            'table': table_name,
                            'column': col_name,
                            'description': f"S'assurer que chaque {col_name} est unique",
                            'priority': 'high',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name
                            }
                        })
                        seen_rules.add(f"unique_{rule_key}")

                # Email columns - format validation
                elif 'email' in col_name.lower():
                    if f"format_{rule_key}" not in seen_rules:
                        suggestions.append({
                            'rule_name': f"Valider le format des emails dans {table_name}",
                            'rule_type': 'format',
                            'table': table_name,
                            'column': col_name,
                            'description': f"Vérifier que tous les emails respectent le format standard",
                            'priority': 'high',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name,
                                'regex': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                            }
                        })
                        seen_rules.add(f"format_{rule_key}")
                    
                    # Also check for nulls in email columns
                    if f"null_{rule_key}" not in seen_rules and is_nullable:
                        suggestions.append({
                            'rule_name': f"Vérifier que les emails ne sont pas vides",
                            'rule_type': 'null_check',
                            'table': table_name,
                            'column': col_name,
                            'description': f"S'assurer qu'aucun email n'est NULL",
                            'priority': 'high',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name
                            }
                        })
                        seen_rules.add(f"null_{rule_key}")

                # Age columns - range validation
                elif 'age' in col_name.lower() and ('int' in col_type or 'number' in col_type):
                    if f"range_{rule_key}" not in seen_rules:
                        suggestions.append({
                            'rule_name': f"Valider la plage d'âge dans {table_name}",
                            'rule_type': 'range',
                            'table': table_name,
                            'column': col_name,
                            'description': f"Vérifier que les âges sont réalistes (0-120 ans)",
                            'priority': 'medium',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name,
                                'min_value': 0,
                                'max_value': 120
                            }
                        })
                        seen_rules.add(f"range_{rule_key}")

                # Amount/price columns - should be positive
                elif any(keyword in col_name.lower() for keyword in ['amount', 'price', 'cost', 'total']) and \
                     ('numeric' in col_type or 'decimal' in col_type or 'float' in col_type or 'int' in col_type):
                    if f"range_{rule_key}" not in seen_rules:
                        suggestions.append({
                            'rule_name': f"Vérifier que {col_name} est positif",
                            'rule_type': 'range',
                            'table': table_name,
                            'column': col_name,
                            'description': f"S'assurer que {col_name} est supérieur ou égal à 0",
                            'priority': 'high',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name,
                                'min_value': 0
                            }
                        })
                        seen_rules.add(f"range_{rule_key}")

                # Username/name columns - should not be null
                elif any(keyword in col_name.lower() for keyword in ['name', 'username', 'title']) and \
                     not col_name.lower().endswith('_id'):
                    if f"null_{rule_key}" not in seen_rules and is_nullable:
                        suggestions.append({
                            'rule_name': f"Vérifier que {col_name} n'est pas vide",
                            'rule_type': 'null_check',
                            'table': table_name,
                            'column': col_name,
                            'description': f"S'assurer que {col_name} est toujours renseigné",
                            'priority': 'medium',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name
                            }
                        })
                        seen_rules.add(f"null_{rule_key}")

                # Date columns - should not be in the future (for created_at, etc.)
                elif 'created' in col_name.lower() or 'date' in col_name.lower():
                    if f"null_{rule_key}" not in seen_rules and is_nullable:
                        suggestions.append({
                            'rule_name': f"Vérifier que {col_name} est renseigné",
                            'rule_type': 'null_check',
                            'table': table_name,
                            'column': col_name,
                            'description': f"S'assurer que toutes les dates sont renseignées",
                            'priority': 'medium',
                            'suggested_config': {
                                'table': table_name,
                                'column': col_name
                            }
                        })
                        seen_rules.add(f"null_{rule_key}")

        # Limit to most relevant suggestions
        return suggestions[:8]

    def nl_to_rule(self, natural_language_description):
        """
        Convert a natural language description to a structured rule configuration
        """
        system_prompt = """You are a data quality rule translator. Convert natural language
        descriptions into structured data quality rule configurations compatible with Great Expectations.

        Respond with a JSON object containing the rule configuration."""

        prompt = f"""
        Convert this natural language description into a structured data quality rule:

        "{natural_language_description}"

        Return a JSON object with this structure:
        {{
            "rule_type": "null_check|uniqueness|range|format|custom",
            "table": "table_name",
            "column": "column_name",
            "config": {{
                // Rule-specific configuration
                // For range: "min_value", "max_value"
                // For format: "regex"
                // etc.
            }},
            "expectation_type": "expect_column_values_to_not_be_null",
            "description": "Human-readable description"
        }}
        """

        response = self._call_ollama(prompt, system_prompt)

        if response:
            try:
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    rule_config = json.loads(json_str)
                    return rule_config
            except json.JSONDecodeError:
                pass

        # Fallback: basic rule configuration
        return {
            'rule_type': 'custom',
            'description': natural_language_description,
            'config': {}
        }

    def explain_rule_results(self, rule, execution_results):
        """
        Generate a human-readable explanation of rule execution results
        """
        system_prompt = """You are a data quality analyst. Explain data quality rule results
        in clear, non-technical language that business users can understand."""

        prompt = f"""
        Explain these data quality rule results:

        Rule: {rule.name}
        Description: {rule.description}

        Results: {json.dumps(execution_results, indent=2)}

        Provide:
        1. A brief summary of what was checked
        2. Whether the data passed or failed
        3. What the issues mean for the business
        4. Recommended actions if there are failures

        Keep it concise and business-focused.
        """

        explanation = self._call_ollama(prompt, system_prompt)
        return explanation or "No explanation available"
