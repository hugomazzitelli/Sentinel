"""Great Expectations Service for data quality validation"""
import great_expectations as gx
from great_expectations.core import ExpectationSuite, ExpectationConfiguration
from great_expectations.dataset import PandasDataset
import pandas as pd
import json


class GreatExpectationsService:
    """Service to interact with Great Expectations"""

    def __init__(self):
        self.context = None
        self._initialize_context()

    def _initialize_context(self):
        """Initialize Great Expectations Data Context"""
        try:
            self.context = gx.get_context()
        except Exception as e:
            print(f"Error initializing GX context: {e}")
            # Create a minimal context if needed
            self.context = None

    def get_schema_info(self, datasource):
        """
        Extract schema information from a datasource
        This is a simplified version - in production, you'd connect to the actual DB
        """
        # For now, return mock schema info
        # In production, you'd query the database for table structures
        schema_info = {
            'datasource_name': datasource.name,
            'datasource_type': datasource.source_type,
            'tables': [
                {
                    'name': 'users',
                    'columns': [
                        {'name': 'id', 'type': 'integer'},
                        {'name': 'email', 'type': 'string'},
                        {'name': 'created_at', 'type': 'timestamp'},
                        {'name': 'age', 'type': 'integer'}
                    ]
                },
                {
                    'name': 'orders',
                    'columns': [
                        {'name': 'order_id', 'type': 'integer'},
                        {'name': 'user_id', 'type': 'integer'},
                        {'name': 'amount', 'type': 'decimal'},
                        {'name': 'status', 'type': 'string'}
                    ]
                }
            ]
        }
        return schema_info

    def create_expectation_suite(self, rule):
        """Create a Great Expectations suite from a rule configuration"""
        suite = ExpectationSuite(expectation_suite_name=f"rule_{rule.id}_{rule.name}")

        # Parse rule_config and add expectations
        config = rule.rule_config or {}
        rule_type = rule.rule_type

        if rule_type == 'null_check':
            suite.add_expectation(
                ExpectationConfiguration(
                    expectation_type="expect_column_values_to_not_be_null",
                    kwargs={"column": config.get('column')}
                )
            )

        elif rule_type == 'uniqueness':
            suite.add_expectation(
                ExpectationConfiguration(
                    expectation_type="expect_column_values_to_be_unique",
                    kwargs={"column": config.get('column')}
                )
            )

        elif rule_type == 'range':
            suite.add_expectation(
                ExpectationConfiguration(
                    expectation_type="expect_column_values_to_be_between",
                    kwargs={
                        "column": config.get('column'),
                        "min_value": config.get('min_value'),
                        "max_value": config.get('max_value')
                    }
                )
            )

        elif rule_type == 'format':
            if config.get('regex'):
                suite.add_expectation(
                    ExpectationConfiguration(
                        expectation_type="expect_column_values_to_match_regex",
                        kwargs={
                            "column": config.get('column'),
                            "regex": config.get('regex')
                        }
                    )
                )

        return suite

    def execute_rule(self, rule):
        """
        Execute a quality rule using Great Expectations
        Returns validation results
        """
        try:
            # In a real implementation, you would:
            # 1. Connect to the datasource
            # 2. Load the data
            # 3. Create expectation suite
            # 4. Validate the data

            # For now, return a mock result
            suite = self.create_expectation_suite(rule)

            # Simulate validation result
            result = {
                'status': 'success',
                'details': {
                    'expectations_met': 8,
                    'expectations_total': 10,
                    'success_percentage': 80.0,
                    'failed_expectations': [
                        {
                            'expectation': 'expect_column_values_to_not_be_null',
                            'column': rule.rule_config.get('column', 'unknown'),
                            'failed_count': 5
                        }
                    ]
                }
            }

            return result

        except Exception as e:
            return {
                'status': 'error',
                'details': {
                    'error_message': str(e)
                }
            }

    def validate_dataframe(self, df, expectations):
        """
        Validate a pandas DataFrame against a set of expectations
        """
        dataset = PandasDataset(df)
        results = []

        for expectation in expectations:
            result = dataset.expect(**expectation)
            results.append(result)

        return results
