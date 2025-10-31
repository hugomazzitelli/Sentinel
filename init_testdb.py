"""Initialize the database with a test datasource"""
from app import app, db
from models import DataSource
import time


def init_test_datasource():
    """Add the test database as a datasource if it doesn't exist"""
    with app.app_context():
        # Wait a bit for databases to be ready
        time.sleep(5)
        
        # Check if test datasource already exists
        existing = DataSource.query.filter_by(name='Test Database').first()
        
        if not existing:
            # Create the test datasource
            test_ds = DataSource(
                name='Test Database',
                connection_string='postgresql://testuser:testpass@testdb:5432/testdb',
                source_type='postgresql'
            )
            db.session.add(test_ds)
            db.session.commit()
            print("✅ Test datasource created successfully!")
            print(f"   ID: {test_ds.id}")
            print(f"   Name: {test_ds.name}")
            print(f"   Connection: {test_ds.connection_string}")
        else:
            print("ℹ️  Test datasource already exists")
            print(f"   ID: {existing.id}")
            print(f"   Name: {existing.name}")


if __name__ == '__main__':
    init_test_datasource()
