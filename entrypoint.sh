#!/bin/bash
set -e

echo "Waiting for PostgreSQL databases to be ready..."

# Wait for main database
until PGPASSWORD=postgres psql -h db -U postgres -d dataquality -c '\q' 2>/dev/null; do
  >&2 echo "Main database is unavailable - sleeping"
  sleep 2
done
>&2 echo "✅ Main database is up"

# Wait for test database
until PGPASSWORD=testpass psql -h testdb -U testuser -d testdb -c '\q' 2>/dev/null; do
  >&2 echo "Test database is unavailable - sleeping"
  sleep 2
done
>&2 echo "✅ Test database is up"

# Wait for Ollama
echo "Waiting for Ollama to be ready..."
until curl -f http://ollama:11434/api/tags 2>/dev/null; do
  >&2 echo "Ollama is unavailable - sleeping"
  sleep 5
done
>&2 echo "✅ Ollama is up"

echo "🚀 All services ready! Starting Flask application..."

# Initialize test datasource
python init_testdb.py

# Start Flask
exec flask run --host=0.0.0.0
