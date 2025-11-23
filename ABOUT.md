# About Osdag-FOSSEE Bridge Screening Module

## Overview

The **Osdag-FOSSEE Bridge Screening Module** is a modern web-based application designed for structural engineers and bridge designers. It provides an intuitive interface for capturing bridge design parameters, validating geometric constraints, and visualizing bridge cross-sections in both 2D and 3D.

This project is part of the **Osdag** (Open Source Design Application for steel structures) initiative developed by **FOSSEE** (Free and Open Source Software for Education) at IIT Bombay.

## Purpose

The bridge screening tool helps engineers:
- **Input and validate** bridge design parameters according to Indian Road Congress (IRC) standards
- **Visualize** bridge cross-sections with accurate geometric representations
- **Validate** material selections and structural configurations
- **Generate** professional PDF reports with design summaries
- **Analyze** environmental loading conditions (wind, seismic, temperature)

## Key Features

### 🎯 Comprehensive Input Validation
- **Structure Type Selection**: Highway bridges with guard conditions
- **Project Location Management**: Database-driven location selection with automatic environmental parameter loading
- **Custom Loading Parameters**: Spreadsheet-style interface for manual wind, seismic, and temperature inputs
- **Geometric Validation**: Real-time validation of span, carriageway width, skew angle, and other parameters
- **Material Selection**: Curated catalog of approved steel and concrete grades (E250/E350/E450 and M25-M60)

### 📐 Advanced Geometry Management
- **Interactive Geometry Editor**: Modify girder spacing, count, and overhang widths
- **Constraint Enforcement**: Automatic adjustment to maintain "overall width = girders × spacing + 2 × overhang"
- **Validation Feedback**: Real-time warnings and error messages for out-of-range values

### 🎨 Rich Visualization
- **3D Cross-Section View**: Interactive Three.js-powered 3D visualization with orbit controls
- **2D Schematic View**: Annotated plan view with dimension lines
- **Reference Images**: Static bridge cross-section reference
- **Validation Highlights**: Visual indicators for geometry issues (deck, girders, footpaths, overhangs)

### 📊 Data-Driven Design
- **Database-Backed Catalogs**: Location data and material grades served from PostgreSQL
- **CSV Data Sources**: Authoritative environment and material catalogs maintained as CSV files
- **Management Commands**: Easy data ingestion and updates via Django management commands

### 📄 PDF Report Generation
- **Comprehensive Reports**: Automatically generated PDF reports with all design inputs
- **Visual Snapshots**: Embedded 3D, 2D, and reference images in reports
- **Environment Data**: Complete wind, seismic, and temperature parameters
- **Validation Status**: Include geometry validation results and warnings

## Technology Stack

### Frontend
- **React 19**: Modern UI framework with hooks
- **Vite**: Lightning-fast build tool and dev server
- **TypeScript**: Type-safe JavaScript development
- **Three.js**: 3D graphics rendering
- **@react-three/fiber**: React bindings for Three.js
- **@react-three/drei**: Useful helpers for Three.js
- **Axios**: HTTP client for API communication
- **jsPDF**: Client-side PDF generation

### Backend
- **Django 5**: Robust Python web framework
- **Django REST Framework**: RESTful API development
- **PostgreSQL**: Reliable relational database
- **django-cors-headers**: CORS support for API access

### Data Management
- **CSV Data Sources**: `environment_table.csv`, `materials.csv`
- **Custom Management Commands**: Data ingestion and migration tools

## Project Structure

```
Osdag-FOSSEE/
├── backend/              # Django REST API
│   ├── design/          # Main application (models, views, serializers)
│   ├── osdag_backend/   # Django project settings
│   ├── manage.py        # Django management script
│   └── requirements.txt # Python dependencies
│
├── frontend/            # React application
│   ├── src/            # Source code
│   │   ├── components/ # Reusable UI components
│   │   ├── services/   # API client services
│   │   └── utils/      # Utility functions
│   ├── public/         # Static assets
│   └── package.json    # Node dependencies
│
├── data/                # Authoritative data catalogs
│   ├── environment_table.csv  # Location and climate data
│   └── materials.csv          # Material grade catalog
│
├── README.md            # Setup and quick start guide
├── PROJECT_OVERVIEW.md  # Technical architecture documentation
└── instructions.txt     # Original acceptance criteria
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 12+

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py ingest_environment_table --truncate
python manage.py ingest_materials_catalog --truncate
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### Running Tests
```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm run test
npm run lint
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations/` | Retrieve state/district hierarchy with climate data |
| GET | `/api/locations/lookup/` | Single location lookup by state and district |
| GET | `/api/materials/` | Material grade catalog by category |
| POST | `/api/custom-loading/` | Validate custom loading parameters |
| POST | `/api/geometry/validate/` | Geometry validation and auto-adjustment |

## Design Standards

This tool implements validation rules based on:
- **IRC 24 (2010)**: General features of bridge design
- **IRC 6**: Loads and stresses
- Indian Standards for structural steel and concrete

## Use Cases

### For Structural Engineers
- Quickly screen bridge designs for feasibility
- Validate geometric configurations against code requirements
- Explore different material combinations
- Generate preliminary design reports

### For Educators
- Teach bridge design principles with interactive visualization
- Demonstrate the relationship between geometry and constraints
- Show real-world application of structural codes

### For Students
- Learn bridge design methodology
- Understand validation requirements
- Practice with realistic design scenarios

## Contributing

We welcome contributions from the community! Here's how you can help:

1. **Report Bugs**: Submit issues with detailed reproduction steps
2. **Suggest Features**: Open feature requests with use cases
3. **Improve Documentation**: Help us make docs clearer
4. **Submit Pull Requests**: Fix bugs or add features

### Development Guidelines
- Follow existing code style and patterns
- Write tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## Data Updates

To update location or material data:

1. Edit the CSV files in `data/` directory
2. Run the ingestion commands:
   ```bash
   python manage.py ingest_environment_table --truncate
   python manage.py ingest_materials_catalog --truncate
   ```
3. Restart the Django server to clear caches

## License

This project is part of the FOSSEE initiative and is open source. Please refer to the LICENSE file for specific terms.

## Acknowledgments

- **FOSSEE** (Free and Open Source Software for Education) at IIT Bombay
- **Osdag** development team for the original steel design application
- All contributors and users who provide feedback and improvements

## Links and Resources

- **FOSSEE Website**: [https://fossee.in/](https://fossee.in/)
- **Osdag Project**: [https://osdag.fossee.in/](https://osdag.fossee.in/)
- **Documentation**: See `README.md` for setup instructions and `PROJECT_OVERVIEW.md` for technical details
- **Report Issues**: Use the GitHub Issues tab for bug reports and feature requests

## Contact

For questions, suggestions, or collaboration opportunities:
- Visit the FOSSEE website: [https://fossee.in/](https://fossee.in/)
- Check the Osdag project page: [https://osdag.fossee.in/](https://osdag.fossee.in/)

---

**Built with ❤️ by the FOSSEE community**
