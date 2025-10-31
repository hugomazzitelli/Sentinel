from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///dataquality.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Import models and services after db initialization
from models import DataSource, QualityRule, QualityReport, RuleExecution
from services.ai_agent import AIAgent
from services.ge_service import GreatExpectationsService

# Initialize services
ai_agent = AIAgent(ollama_url=os.getenv('OLLAMA_URL', 'http://localhost:11434'))
ge_service = GreatExpectationsService()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/datasources')
def datasources():
    sources = DataSource.query.all()
    return render_template('datasources.html', datasources=sources)

@app.route('/rules')
def rules():
    all_rules = QualityRule.query.all()
    return render_template('rules.html', rules=all_rules)

@app.route('/reports')
def reports():
    all_reports = QualityReport.query.order_by(QualityReport.created_at.desc()).all()
    return render_template('reports.html', reports=all_reports)

@app.route('/rules/builder')
def rule_builder():
    """Visual rule builder with conditional logic"""
    return render_template('rule_builder_visual.html')

# API Endpoints
@app.route('/api/datasources', methods=['GET', 'POST'])
def api_datasources():
    if request.method == 'POST':
        data = request.json
        datasource = DataSource(
            name=data['name'],
            connection_string=data['connection_string'],
            source_type=data.get('source_type', 'postgresql')
        )
        db.session.add(datasource)
        db.session.commit()
        return jsonify({'id': datasource.id, 'message': 'DataSource created'}), 201

    sources = DataSource.query.all()
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'source_type': s.source_type,
        'created_at': s.created_at.isoformat()
    } for s in sources])

@app.route('/api/datasources/<int:datasource_id>/analyze', methods=['POST'])
def analyze_datasource(datasource_id):
    """Use AI to analyze datasource and suggest quality rules"""
    datasource = DataSource.query.get_or_404(datasource_id)

    # Get schema information (simplified for now)
    schema_info = ge_service.get_schema_info(datasource)

    # Ask AI to suggest rules
    suggestions = ai_agent.suggest_quality_rules(schema_info)

    return jsonify({
        'datasource_id': datasource_id,
        'suggestions': suggestions
    })

@app.route('/api/rules', methods=['GET', 'POST'])
def api_rules():
    if request.method == 'POST':
        data = request.json
        rule = QualityRule(
            datasource_id=data['datasource_id'],
            name=data['name'],
            description=data.get('description', ''),
            rule_type=data.get('rule_type', 'custom'),
            rule_config=data.get('rule_config', {}),
            is_active=data.get('is_active', True)
        )
        db.session.add(rule)
        db.session.commit()
        return jsonify({'id': rule.id, 'message': 'Rule created'}), 201

    rules = QualityRule.query.all()
    return jsonify([{
        'id': r.id,
        'name': r.name,
        'rule_type': r.rule_type,
        'is_active': r.is_active
    } for r in rules])

@app.route('/api/rules/generate', methods=['POST'])
def generate_rule_from_nl():
    """Generate a quality rule from natural language using AI"""
    data = request.json
    natural_language = data.get('description', '')
    datasource_id = data.get('datasource_id')

    # Use AI to convert natural language to Great Expectations rule
    rule_config = ai_agent.nl_to_rule(natural_language)

    return jsonify({
        'rule_config': rule_config,
        'message': 'Rule generated successfully'
    })

@app.route('/api/rules/<int:rule_id>/execute', methods=['POST'])
def execute_rule(rule_id):
    """Execute a quality rule and generate report"""
    rule = QualityRule.query.get_or_404(rule_id)

    # Execute using Great Expectations
    result = ge_service.execute_rule(rule)

    # Save execution result
    execution = RuleExecution(
        rule_id=rule.id,
        status=result['status'],
        results=result['details']
    )
    db.session.add(execution)
    db.session.commit()

    return jsonify({
        'execution_id': execution.id,
        'status': result['status'],
        'details': result['details']
    })

@app.route('/api/rules/<int:rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    """Delete a quality rule"""
    rule = QualityRule.query.get_or_404(rule_id)
    
    rule_name = rule.name
    
    # Delete the rule (cascade will delete related executions)
    db.session.delete(rule)
    db.session.commit()
    
    return jsonify({
        'message': f'Rule "{rule_name}" deleted successfully',
        'id': rule_id
    })

@app.route('/api/reports', methods=['GET', 'POST'])
def api_reports():
    if request.method == 'POST':
        data = request.json
        report = QualityReport(
            datasource_id=data['datasource_id'],
            report_name=data['report_name'],
            results=data.get('results', {})
        )
        db.session.add(report)
        db.session.commit()
        return jsonify({'id': report.id, 'message': 'Report created'}), 201

    reports = QualityReport.query.order_by(QualityReport.created_at.desc()).all()
    return jsonify([{
        'id': r.id,
        'report_name': r.report_name,
        'created_at': r.created_at.isoformat()
    } for r in reports])

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
