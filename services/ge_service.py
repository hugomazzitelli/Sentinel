"""Great Expectations Service for data quality validation"""
import great_expectations as gx
from great_expectations.core import ExpectationSuite, ExpectationConfiguration
from great_expectations.dataset import PandasDataset
import pandas as pd
import json
from sqlalchemy import create_engine, inspect, MetaData, Table
from sqlalchemy.exc import SQLAlchemyError


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
        Extract schema information from a datasource by connecting to the database
        """
        try:
            # Connect to the actual database
            engine = create_engine(datasource.connection_string)
            inspector = inspect(engine)
            
            # Get all table names
            table_names = inspector.get_table_names()
            
            tables = []
            for table_name in table_names:
                columns = []
                for column in inspector.get_columns(table_name):
                    columns.append({
                        'name': column['name'],
                        'type': str(column['type']),
                        'nullable': column.get('nullable', True)
                    })
                
                tables.append({
                    'name': table_name,
                    'columns': columns
                })
            
            schema_info = {
                'datasource_name': datasource.name,
                'datasource_type': datasource.source_type,
                'tables': tables
            }
            
            engine.dispose()
            return schema_info
            
        except SQLAlchemyError as e:
            print(f"Error connecting to database: {e}")
            # Return fallback mock data if connection fails
            return {
                'datasource_name': datasource.name,
                'datasource_type': datasource.source_type,
                'error': str(e),
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
        Execute a quality rule using Great Expectations on real data
        Returns validation results
        """
        try:
            # Get datasource from rule
            from models import DataSource
            datasource = DataSource.query.get(rule.datasource_id)
            
            if not datasource:
                return {
                    'status': 'error',
                    'details': {'error_message': 'Datasource not found'}
                }
            
            # Connect to the database and load data
            engine = create_engine(datasource.connection_string)
            
            # Get table and column from rule config
            config = rule.rule_config or {}
            table_name = config.get('table', 'users')  # Default to users table
            
            # Load the table data
            query = f"SELECT * FROM {table_name} LIMIT 1000"
            df = pd.read_sql(query, engine)
            
            # Create expectation suite
            suite = self.create_expectation_suite(rule)
            
            # Validate the data
            dataset = PandasDataset(df)
            
            # Apply expectations and collect results
            validation_results = []
            for expectation in suite.expectations:
                exp_type = expectation.expectation_type
                kwargs = expectation.kwargs
                
                # Execute the expectation
                if hasattr(dataset, exp_type):
                    method = getattr(dataset, exp_type)
                    result = method(**kwargs)
                    validation_results.append(result)
            
            # Calculate summary statistics
            total_expectations = len(validation_results)
            met_expectations = sum(1 for r in validation_results if r.success)
            success_percentage = (met_expectations / total_expectations * 100) if total_expectations > 0 else 0
            
            # Build result
            result = {
                'status': 'success' if success_percentage >= 80 else 'warning',
                'details': {
                    'expectations_met': met_expectations,
                    'expectations_total': total_expectations,
                    'success_percentage': round(success_percentage, 2),
                    'rows_checked': len(df),
                    'failed_expectations': [
                        {
                            'expectation': r.expectation_config.expectation_type,
                            'column': r.expectation_config.kwargs.get('column', 'N/A'),
                            'success': r.success,
                            'result': str(r.result)
                        }
                        for r in validation_results if not r.success
                    ]
                }
            }
            
            engine.dispose()
            return result

        except Exception as e:
            print(f"Error executing rule: {e}")
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
