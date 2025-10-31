# 🤖 AI Data Quality App

Une application Flask de data quality propulsée par des agents IA qui suggère, applique et exécute automatiquement des règles métier de qualité de données.

## 🎯 Concept

Cette application permet aux data analysts de se concentrer sur l'analyse plutôt que sur la configuration manuelle de règles de qualité. L'agent IA analyse automatiquement vos sources de données et suggère des règles pertinentes basées sur votre schéma.

### Fonctionnalités principales

- **Analyse automatique** : L'IA analyse votre schéma de base de données et suggère des règles de qualité
- **Langage naturel** : Créez des règles en français ("Vérifier que les emails sont valides")
- **Great Expectations** : Utilise le framework Great Expectations pour la validation
- **Modèles locaux** : Ollama pour l'exécution locale des modèles IA
- **Interface simple** : Frontend HTML/CSS minimaliste et intuitif

## 🚀 Démarrage rapide

### Prérequis

- Docker et Docker Compose
- Git

### Installation

1. **Cloner le projet**
```bash
git clone <repo-url>
cd Sentinel
```

2. **Lancer l'application**
```bash
docker-compose up --build
```

3. **Accéder à l'application**
- Frontend : http://localhost:5001
- API : http://localhost:5001/api
- Ollama : http://localhost:11434
- PostgreSQL : localhost:5432

### Première utilisation

1. **Télécharger un modèle Ollama** (depuis un autre terminal)
```bash
docker-compose exec ollama ollama pull llama2
# ou
docker-compose exec ollama ollama pull mistral
```

2. **Créer une source de données**
   - Aller sur "Sources de données"
   - Ajouter votre base PostgreSQL/MySQL ou CSV
   - Cliquer sur "Analyser avec l'IA"

3. **Créer des règles**
   - Utiliser le langage naturel : "Je veux vérifier que les emails sont valides"
   - Ou configurer manuellement des règles
   - L'IA convertit automatiquement en règles Great Expectations

4. **Exécuter et consulter les rapports**
   - Exécuter les règles
   - Consulter les résultats et recommandations

## 📁 Structure du projet

```
Sentinel/
├── app.py                  # Application Flask principale
├── models.py               # Modèles SQLAlchemy
├── requirements.txt        # Dépendances Python
├── Dockerfile              # Configuration Docker
├── docker-compose.yml      # Orchestration des services
│
├── services/
│   ├── ai_agent.py        # Agent IA avec Ollama
│   └── ge_service.py      # Service Great Expectations
│
├── templates/             # Templates HTML
│   ├── base.html
│   ├── index.html
│   ├── datasources.html
│   ├── rules.html
│   └── reports.html
│
├── static/
│   ├── css/
│   │   └── style.css      # Styles CSS
│   └── js/
│       └── app.js         # JavaScript frontend
│
└── data/                  # Données et configurations
```

## 🏗️ Architecture

### Stack technique

- **Backend** : Flask 3.0 + SQLAlchemy
- **Base de données** : PostgreSQL 15
- **Data Quality** : Great Expectations
- **IA** : Ollama (modèles locaux Llama2/Mistral)
- **Frontend** : HTML/CSS/JavaScript vanilla
- **Conteneurisation** : Docker

### Services Docker

1. **web** : Application Flask (port 5000)
2. **db** : PostgreSQL (port 5432)
3. **ollama** : Serveur Ollama pour l'IA (port 11434)

## 🧩 Types de règles supportées

- **null_check** : Vérification des valeurs nulles
- **uniqueness** : Vérification d'unicité
- **range** : Validation de plages de valeurs
- **format** : Validation de formats (email, téléphone, etc.)
- **custom** : Règles personnalisées
- **ai_generated** : Règles générées automatiquement par l'IA

## 🔌 API Endpoints

### DataSources
- `GET /api/datasources` - Liste des sources
- `POST /api/datasources` - Créer une source
- `POST /api/datasources/<id>/analyze` - Analyser avec l'IA

### Rules
- `GET /api/rules` - Liste des règles
- `POST /api/rules` - Créer une règle
- `POST /api/rules/generate` - Générer depuis langage naturel
- `POST /api/rules/<id>/execute` - Exécuter une règle

### Reports
- `GET /api/reports` - Liste des rapports
- `POST /api/reports` - Créer un rapport

## 🤖 Agent IA

L'agent IA utilise Ollama pour :

1. **Suggérer des règles** : Analyse le schéma et propose des règles pertinentes
2. **Convertir du langage naturel** : Transforme des descriptions en configurations Great Expectations
3. **Expliquer les résultats** : Génère des explications business des résultats de validation

### Exemple de prompt IA

```
Input: "Je veux vérifier que tous les emails de la table users sont valides"

Output: {
  "rule_type": "format",
  "table": "users",
  "column": "email",
  "config": {
    "regex": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  },
  "expectation_type": "expect_column_values_to_match_regex"
}
```

## 📊 Great Expectations

L'application utilise Great Expectations pour :
- Créer des expectation suites
- Valider les données
- Générer des rapports de qualité

Les expectations sont stockées en JSON dans la base de données.

## 🔧 Configuration

### Variables d'environnement

```bash
# Flask
FLASK_APP=app.py
FLASK_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/dataquality

# Ollama
OLLAMA_URL=http://ollama:11434
```

### Modèles Ollama recommandés

- **llama2** : Bon équilibre performance/qualité (par défaut)
- **mistral** : Plus rapide, bonne qualité
- **codellama** : Meilleur pour générer du code SQL

## 🛣️ Roadmap

### Phase 1 - MVP (Actuel)
- [x] Architecture de base Flask + Docker
- [x] Modèles SQLAlchemy
- [x] Intégration Great Expectations
- [x] Agent IA avec Ollama
- [x] Frontend HTML/CSS basique
- [x] API REST

### Phase 2 - Amélioration
- [ ] Connexion réelle aux bases de données
- [ ] Exécution des expectations sur vraies données
- [ ] Dashboard avec graphiques de qualité
- [ ] Historique et tendances
- [ ] Notifications (email, Slack)

### Phase 3 - Avancé
- [ ] Authentification utilisateurs
- [ ] Planification de jobs (scheduling)
- [ ] Export de rapports (PDF, Excel)
- [ ] Intégration CI/CD
- [ ] API GraphQL
- [ ] Support multi-tenants

## 🤝 Contribution

Les suggestions et contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.

## 🙏 Remerciements

- [Great Expectations](https://greatexpectations.io/)
- [Ollama](https://ollama.ai/)
- [Flask](https://flask.palletsprojects.com/)

## 📞 Support

Pour toute question ou problème, ouvrir une issue sur GitHub.

---

**Note** : Ceci est une version minimale de démarrage. De nombreuses fonctionnalités sont encore en développement.
