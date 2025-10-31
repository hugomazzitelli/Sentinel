from datetime import datetime
from app import db
import json

class DataSource(db.Model):
    """Represents a data source to be monitored for quality"""
    __tablename__ = 'datasources'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    connection_string = db.Column(db.String(500), nullable=False)
    source_type = db.Column(db.String(50), default='postgresql')  # postgresql, mysql, csv, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rules = db.relationship('QualityRule', backref='datasource', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('QualityReport', backref='datasource', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<DataSource {self.name}>'


class QualityRule(db.Model):
    """Represents a data quality rule"""
    __tablename__ = 'quality_rules'

    id = db.Column(db.Integer, primary_key=True)
    datasource_id = db.Column(db.Integer, db.ForeignKey('datasources.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    rule_type = db.Column(db.String(50), nullable=False)  # null_check, uniqueness, range, format, custom, ai_generated
    rule_config = db.Column(db.JSON)  # Stores Great Expectations configuration
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), default='ai_agent')  # 'ai_agent' or 'user'

    # Relationships
    executions = db.relationship('RuleExecution', backref='rule', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<QualityRule {self.name}>'


class RuleExecution(db.Model):
    """Stores the results of rule executions"""
    __tablename__ = 'rule_executions'

    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey('quality_rules.id'), nullable=False)
    executed_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20))  # success, failed, error
    results = db.Column(db.JSON)  # Detailed results from Great Expectations

    def __repr__(self):
        return f'<RuleExecution {self.id} - {self.status}>'


class QualityReport(db.Model):
    """Aggregated quality reports"""
    __tablename__ = 'quality_reports'

    id = db.Column(db.Integer, primary_key=True)
    datasource_id = db.Column(db.Integer, db.ForeignKey('datasources.id'), nullable=False)
    report_name = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    results = db.Column(db.JSON)  # Summary of all rule executions

    def __repr__(self):
        return f'<QualityReport {self.report_name}>'
