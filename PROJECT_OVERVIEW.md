# Osdag Bridge Screening Module – System Overview

This document summarizes how the Osdag-FOSSEE bridge screening tool is wired end-to-end, covering directory layout, backend and frontend responsibilities, data sources, and the typical workflow for users and developers.

## At a Glance

- **Purpose:** Capture bridge screening inputs exactly as per the PDF spec, validate geometry/material constraints, and visualize the bridge cross-section in real time.
- **Backend:** Django 5 + Django REST Framework + SQLite (`backend/`). Hosts reference catalogs, validation services, and ingestion commands.
- **Frontend:** React 19 + Vite + TypeScript (`frontend/`). Provides the two-panel UI, spreadsheet/geometry popups, Three.js visuals, and PDF export.
- **Data:** CSV source-of-truth tables in `data/` (environment catalog + material catalog) loaded into SQLite via custom Django management commands.

## Repository Layout

```
backend/           Django project (manage.py, REST API, ingest commands)
frontend/          React + Vite application (components, services, utils)
data/              Authoritative CSV catalogs (environment, materials, etc.)
instructions.txt   Acceptance criteria reference
README.md          Setup quick start for both tiers
```

## Backend Architecture (`backend/`)

### Key Modules

- `design/models.py`
  - `LocationRecord`: unique `(state, district)` pairs plus wind, seismic, and temperature fields.
  - `MaterialCatalog`: normalized table for girder steel, cross bracing steel, and deck concrete grades.
- `design/services/data_loader.py`
  - Normalizes CSV headers, loads rows, and caches serialized location payloads for `/api/locations/`.
  - Helper functions `_safe_float`, `_first_present`, `_load_csv`, `load_location_payload`, `clear_cached_payload`.
- `design/services/geometry.py`
  - Centralizes validation limits (span, carriageway width, skew angle, overhangs, spacing).
  - Functions `validate_basic_range`, `detect_geometry_issues`, `auto_adjust_geometry` keep the "overall width = girders × spacing + 2 × overhang" constraint consistent.
- `design/serializers.py`
  - `CustomLoadingSerializer` ensures spreadsheet values are consistent (e.g., max temp > min temp).
  - `GeometryValidationSerializer` sanitizes AJAX payloads from the Modify Geometry popup.
- `design/views.py`
  - `LocationDataView`: returns `{states: [], districts: {}}` for dropdowns (cached).
  - `LocationLookupView`: single district lookup used when switching state/district.
  - `CustomLoadingView`: validates spreadsheet overrides so the UI can persist them.
  - `MaterialsView`: returns catalog lists keyed by category.
  - `GeometryValidationView`: orchestrates range checks, constraint warnings, and auto-adjusted geometry payloads used by the UI.
- `design/management/commands/...`
  - `ingest_environment_table`: loads `data/environment_table.csv` into `LocationRecord` (with `--truncate` and optional `--csv-path`).
  - `ingest_materials_catalog`: loads `data/materials.csv` into `MaterialCatalog`.

### API Surface (`osdag_backend/urls.py` → `design/urls.py`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/locations/` | States list + per-state district arrays with cached climate values. |
| `GET` | `/api/locations/lookup/?state=..&district=..` | Single location payload; used when refreshing the summary cards. |
| `GET` | `/api/materials/` | Material grade catalog grouped by category. |
| `POST` | `/api/custom-loading/` | Validates spreadsheet wind/seismic/temp overrides before storing on the client. |
| `POST` | `/api/geometry/validate/` | Full geometry validation + auto-adjust service backing the Modify Additional Geometry popup. |

### Configuration Highlights

- `osdag_backend/settings.py`
  - `DATA_DIR = BASE_DIR.parent / 'data'` so management commands can locate CSVs without extra env vars.
  - REST framework renders/consumes JSON only; CORS is fully open for local dev.
  - SQLite file lives at `backend/db.sqlite3` out-of-the-box.

### Tests & Tooling

- `design/tests.py` covers geometry endpoint behavior plus reference-data and material catalog endpoints.
- Dependencies pinned via `requirements.txt` (Django, DRF, django-cors-headers).

### Common Backend Commands

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py ingest_environment_table --truncate
python manage.py ingest_materials_catalog --truncate
python manage.py runserver 0.0.0.0:8000
python manage.py test
```

## Frontend Architecture (`frontend/`)

### Application Shell

- `src/main.tsx` bootstraps React StrictMode and `App`.
- `src/App.tsx` (single-file feature shell) handles:
  - Catalog/bootstrap fetch (`fetchLocations`, `fetchMaterials`) on mount and sets defaults.
  - Location mode toggling (`database` vs `custom`), state/district dropdown logic, and spreadsheet popup open/close.
  - Derived estimates (girder height/deck depth/footpath thickness) used for visuals.
  - Geometry management pipeline: local optimistic updates via `resolveGeometryChange`, visual highlights via `deriveValidationHighlights`, debounced server validation via `validateGeometry`.
  - View state for tabs, 3D/2D/reference display, info panel, PDF export, and error indicators.
  - PDF generation using `jsPDF`, embedding PNG snapshots of the 3D canvas, 2D schematic SVG, and reference art.

### Reusable Components (`src/components/`)

- `Dropdown`, `InputField`, `FormSection`: styled form primitives matching the PDF spec layout.
- `SpreadsheetPopup`: spreadsheet-like modal for custom wind/seismic/temperature overrides (persists via `submitCustomLoading`).
- `GeometryPopup`: modifier for girder spacing/count/overhang with live constraint summaries.
- `BridgeCrossSection`: Three.js + @react-three/fiber visualization with orbit controls, brace toggles, and validation highlights (also reused in the hidden PDF capture shelf).
- `BridgeSchematic`: SVG schematic mirroring the cross-section with dimension lines and highlight overlays.
- `PopupModal`: base modal supporting edge-docked variants (geometry popup) and classic centered overlays (spreadsheet popup).

### Services & Utilities

- `src/services/api.ts`: Axios client targeting `VITE_API_BASE_URL` (default `http://localhost:8000/api`). Provides thin wrappers for all REST endpoints.
- `src/utils/geometry.ts`: Mirrors backend rules to keep the UI responsive; computes overall width, clamps ranges, auto adjusts spacing/count/overhang before sending to the server.
- `src/utils/validation.ts`: Converts validation flags into highlight states that colorize visuals. Covered by `src/utils/validation.test.ts` (`npm run test`).

### Frontend Commands

```bash
cd frontend
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # Type-check + production bundle
npm run lint       # ESLint (JS + TS config)
npm run test       # Runs src/utils/validation.test.ts via tsx
```

## Data Sources (`data/`)

- `environment_table.csv`: `(State, City/District)` + wind speed, seismic zone/factor, max/min temperature.
- `materials.csv`: `(category, grade)` tuples for approved steel and concrete grades.
- Additional CSVs (`wind*.csv`, `temperature*.csv`, etc.) can be ingested later if more commands are added; current implementation consumes `environment_table.csv` and `materials.csv` directly.

## End-to-End Workflow

1. **Backend prep**
   1. Install deps, run migrations.
   2. Ingest environment and materials CSVs (use `--truncate` when refreshing data).
   3. Start `python manage.py runserver 0.0.0.0:8000`.
2. **Frontend prep**
   1. `npm install` inside `frontend/`.
   2. `npm run dev` (optionally set `VITE_API_BASE_URL` in `frontend/.env`).
3. **Runtime flow**
   1. App loads location/material catalogs. First state/district auto-select; `/api/locations/lookup/` hydrates the green summary cards.
   2. User selects structure type. Choosing "Other" disables every downstream input per the spec guardrail.
   3. Project location segment lets users stay in database mode (state/district dropdown) or open the spreadsheet popup. Enabling spreadsheet mode flips `locationMode` to `custom`, persists the override via `POST /custom-loading/`, and uses those values in the summary cards.
   4. Geometry section captures span, carriageway, skew, footpath details. Clicking "Modify additional geometry" opens the popup where girder spacing/count/overhang stay locked to the width equation. Every edit runs through `resolveGeometryChange` (instant feedback) then debounced `/geometry/validate/` (authoritative validation + warnings from the backend).
   5. Material dropdowns are populated from `/materials/` to guarantee only approved grades appear.
   6. Right-hand panel stays in sync across modes:
      - **3D** uses `BridgeCrossSection` for orbitable visualization.
      - **2D** uses `BridgeSchematic` for annotated plan view.
      - **Reference** renders the static SVG.
      - Validation highlights tint decks/girders/footpaths/overhangs when the backend or client detects an issue.
   7. "Generate report" captures 3D/2D/reference snapshots, compiles the inputs + environment values + validation status, and streams a PDF download.

## Developer Notes

- When CSV data changes, rerun the ingest commands and restart the backend to clear the cached location payload (`data_loader.clear_cached_payload()` is called automatically after ingest).
- Geometry validation exists in both tiers to keep the UI responsive. The backend remains source-of-truth; client-side helpers mimic the same logic to minimize round trips.
- The frontend stores minimal persistent state (no Redux); everything lives in React hooks within `App.tsx`.
- Tests exist on both sides (`python manage.py test`, `npm run test`) to guard the validation logic.

## Troubleshooting Tips

- **API 503 for locations/materials:** Run both ingest commands; ensure `data/` CSVs exist and the Django server has been restarted (payload cache is cleared on ingest).
- **Frontend shows "Unable to load catalog data":** The initial `fetchLocations`/`fetchMaterials` promise failed; check backend logs or adjust `VITE_API_BASE_URL`.
- **Geometry popup stuck with errors:** Ensure span/carriageway/skew respect backend limits; both the popup and main form roll errors up in `geometryErrors`.

This overview should give new collaborators enough context to navigate the codebase, reason about data flow, and extend either tier without reverse-engineering the entire application.
