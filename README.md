# Osdag Group Design – Bridge Screening UI

This repository contains a complete implementation of the Osdag bridge module screening UI using a React + Vite frontend and a Django REST API. Every item from the PDF specification is implemented:

- **Two-panel layout** with Basic/Additional tabs on the left and a permanent bridge cross-section image on the right.
- **Type of structure** dropdown with the “Other structures not included” guard that disables all remaining inputs.
- **Project location** workflow with mutually exclusive modes: Enter Location Name (state → district) backed by CSV tables, and Tabulate Custom Loading Parameters via the spreadsheet popup. All environment values are rendered in green.
- **Geometric details** block with span/carriageway/skew validations, the Modify Additional Geometry popup, interdependent field logic, and inline status messaging.
- **Material inputs** restricted to the approved grades (E250/E350/E450 and M25–M60).
- **Popup experiences** for both the spreadsheet and the geometry adjustments, complete with validation errors/warnings.

Refer to `instructions.txt` for the original acceptance criteria.

## Project structure

```
backend/   # Django + DRF project (manage.py, design app, REST endpoints)
frontend/  # React (Vite + TypeScript) UI with reusable components
data/      # wind_table.csv, seismic_table.csv, temperature_table.csv
```

## Backend setup (Django + DRF)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Key endpoints:

- `GET /api/locations/` - state/district hierarchy plus climate values (CSV driven)
- `GET /api/materials/` - allowable girder, bracing, and concrete grades
- `POST /api/custom-loading/` - validates spreadsheet input (wind/seismic/temp)
- `POST /api/geometry/validate/` - range checks + auto-adjust logic for the geometry popup

> **Note:** The backend reads `wind_table.csv`, `seismic_table.csv`, and `temperature_table.csv` from `../data` automatically. Update those files to extend the catalogue.

## Frontend setup (React + Vite)

```bash
cd frontend
npm install
npm run dev  # Vite dev server on http://localhost:5173/
# Optional production build
npm run build
```

Set the API base URL if needed (defaults to `http://localhost:8000/api`):

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

Feature highlights in the UI:

- Basic Inputs tab with structure-type gating, location workflow, geometric inputs, material dropdowns, and status feedback.
- Additional Inputs tab placeholder that keeps the layout identical to the PDF mock.
- Spreadsheet-style popup for custom wind/seismic/temperature overrides (values immediately reflected in the Project Location summary cards).
- Modify Additional Geometry popup that enforces `overall width = girders × spacing + 2 × overhang`, surfaces warnings, and keeps carriageway width fixed.
- Static bridge cross-section reference image on the right panel at all times.

## Demo video checklist

Record a short screencast (any screen recorder works) following these beats:

1. Start both servers (`python manage.py runserver` and `npm run dev`).
2. Navigate through **Basic Inputs** and show the Additional tab placeholder.
3. Toggle the structure type to “Other” to demonstrate the global disable message.
4. In Project Location, select a state/district, highlight the green wind/seismic/temperature values, then switch to the spreadsheet mode, enter custom values, and save to show the summary updates.
5. Validate geometric inputs (e.g., try an out-of-range span to show the error, tweak the skew angle to show the warning).
6. Open the **Modify Additional Geometry** dialog, tweak spacing/count/overhang to show interdependent behavior and constraint warnings.

The resulting video satisfies the “short demo video” deliverable from the screening spec.

## Tests

Run Django API tests (sample coverage for geometry endpoint):

```bash
cd backend
python manage.py test
```

Vite already ships with ESLint + TypeScript; you can run `npm run lint` or `npm run build` inside `frontend/` for additional verification.

## Data sources

The CSV files inside `data/` (`wind_table.csv`, `seismic_table.csv`, `temperature_table.csv`) contain seed references for wind, seismic, and temperature. They can be replaced with richer tables or swapped for a SQLite source without changing the REST payloads.
