"""AI Agent service using Ollama for data quality suggestions"""
import requests
import json


class AIAgent:
    """AI Agent that uses Ollama to suggest and generate data quality rules"""

    def __init__(self, ollama_url='http://localhost:11434', model='llama2'):
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
        """Fallback suggestions based on common patterns"""
        suggestions = []

        for table in schema_info.get('tables', []):
            table_name = table['name']

            for column in table.get('columns', []):
                col_name = column['name']
                col_type = column['type']

                # ID columns should be unique and not null
                if 'id' in col_name.lower():
                    suggestions.append({
                        'rule_name': f"Uniqueness check for {table_name}.{col_name}",
                        'rule_type': 'uniqueness',
                        'table': table_name,
                        'column': col_name,
                        'priority': 'high',
                        'suggested_config': {'column': col_name}
                    })

                # Email columns should match email format
                if 'email' in col_name.lower():
                    suggestions.append({
                        'rule_name': f"Email format validation for {table_name}.{col_name}",
                        'rule_type': 'format',
                        'table': table_name,
                        'column': col_name,
                        'priority': 'high',
                        'suggested_config': {
                            'column': col_name,
                            'regex': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                        }
                    })

                # Age columns should have reasonable ranges
                if 'age' in col_name.lower() and col_type in ['integer', 'int']:
                    suggestions.append({
                        'rule_name': f"Age range validation for {table_name}.{col_name}",
                        'rule_type': 'range',
                        'table': table_name,
                        'column': col_name,
                        'priority': 'medium',
                        'suggested_config': {
                            'column': col_name,
                            'min_value': 0,
                            'max_value': 150
                        }
                    })

        return suggestions[:10]  # Return top 10

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
