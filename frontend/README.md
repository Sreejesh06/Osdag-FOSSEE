# Osdag Bridge Screening UI – Frontend

This Vite + React + TypeScript app implements the full set of UI behaviors requested for the Osdag bridge module screening deliverable.

## Available scripts

```bash
npm install          # install dependencies
npm run dev          # start the Vite dev server on http://localhost:5173/
npm run build        # production build (outputs to dist/)
npm run lint         # run TypeScript + ESLint checks
```

Set a custom API origin (defaults to `http://localhost:8000/api`) via `.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## Feature checklist

- **Basic/Additional tabs** that mirror the PDF layout (Basic is fully interactive, Additional is a visible placeholder).
- **Type of structure** dropdown that locks the rest of the workflow and shows *“Other structures not included”* when “Other” is selected.
- **Project location** section with mutually exclusive modes:
  - *Enter Location Name* exposes State → District dropdowns backed by `/api/locations/` and paints wind/seismic/temperature values in green.
  - *Tabulate Custom Loading Parameters* launches the spreadsheet-style modal; saved entries immediately drive the summary tiles.
- **Geometric details** with span/carriageway validation, skew-angle warnings, and the Modify Additional Geometry popup that enforces `overall width = girders × spacing + 2 × overhang`.
- **Material inputs** sourced from `/api/materials/`, limited to E250/E350/E450 and M25–M60 grades.
- **Reference panel** on the right that always shows the supplied bridge cross-section artwork.

## Demo tips

For the required short demo video:

1. Start the backend (`python manage.py runserver`) and frontend (`npm run dev`).
2. Walk through the Basic Inputs tab (structure toggle, project location selector, spreadsheet popup, validations).
3. Open the Modify Additional Geometry dialog and tweak spacing/count/overhang to show the constraint solver.
4. Flip to the Additional Inputs tab briefly to show the placeholder and the right-hand reference image.

This quick recording satisfies the screening deliverable without extra narration.
