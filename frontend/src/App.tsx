import { useEffect, useMemo, useState } from 'react';
import './App.css';
import bridgeImage from './assets/bridge.svg';
import logoImage from './assets/logo.svg';
import { Dropdown } from './components/Dropdown';
import { FormSection } from './components/FormSection';
import { GeometryPopup } from './components/GeometryPopup';
import { InputField } from './components/InputField';
import { BridgeCrossSection } from './components/BridgeCrossSection';
import { BridgeSchematic } from './components/BridgeSchematic';
import { SpreadsheetPopup } from './components/SpreadsheetPopup';
import { fetchLocationSummary, fetchLocations, fetchMaterials, submitCustomLoading, validateGeometry } from './services/api';
import { resolveGeometryChange } from './utils/geometry';
import type {
  CustomLoadingValues,
  EnvironmentSummary,
  GeometryField,
  GeometryResponsePayload,
  LocationResponse,
  MaterialsResponse,
} from './types';

const structureOptions = [
  { label: 'Highway', value: 'Highway' },
  { label: 'Other', value: 'Other' },
];

const footpathOptions = [
  { label: 'Single-sided', value: 'Single-sided' },
  { label: 'Both', value: 'Both' },
  { label: 'None', value: 'None' },
];

const VIEW_MODE_OPTIONS: Array<{ label: string; value: '3d' | '2d' | 'reference' }> = [
  { label: '3D View', value: '3d' },
  { label: '2D View', value: '2d' },
  { label: 'Reference', value: 'reference' },
];

const DEFAULT_ENVIRONMENT: EnvironmentSummary = {
  wind: null,
  seismicZone: null,
  seismicFactor: null,
  maxTemp: null,
  minTemp: null,
};

const DEFAULT_CUSTOM_VALUES: CustomLoadingValues = {
  wind: 45,
  seismicZone: 'III',
  seismicFactor: 0.16,
  maxTemp: 40,
  minTemp: 20,
};

type GeometryState = GeometryResponsePayload['geometry'];

interface BasicInputsState {
  span: number;
  carriagewayWidth: number;
  footpath: string;
  footpathWidth: number;
  skewAngle: number;
  girderSteel: string;
  crossBracingSteel: string;
  deckConcrete: string;
}

const INITIAL_BASIC_INPUTS: BasicInputsState = {
  span: 30,
  carriagewayWidth: 8.5,
  footpath: 'Single-sided',
  footpathWidth: 1.5,
  skewAngle: 0,
  girderSteel: '',
  crossBracingSteel: '',
  deckConcrete: '',
};

const deriveGeometrySeed = (carriagewayWidth: number): GeometryState => {
  const overallWidth = Number((carriagewayWidth + 5).toFixed(2));
  const girderCount = 4;
  const girderSpacing = 2.5;
  const deckOverhang = Number(((overallWidth - girderCount * girderSpacing) / 2).toFixed(1));
  return {
    overall_width: overallWidth,
    girder_spacing: girderSpacing,
    girder_count: girderCount,
    deck_overhang: deckOverhang,
  };
};

const stripGeometryFieldEntries = (record: Record<string, string>) => {
  const next = { ...record };
  delete next.girder_spacing;
  delete next.girder_count;
  delete next.deck_overhang;
  return next;
};

function App() {
  const [activeTab, setActiveTab] = useState<'basic' | 'additional'>('basic');
  const [structureType, setStructureType] = useState('Highway');
  const [locationMode, setLocationMode] = useState<'database' | 'custom'>('database');
  const [locations, setLocations] = useState<LocationResponse | null>(null);
  const [materials, setMaterials] = useState<MaterialsResponse | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [environmentSummary, setEnvironmentSummary] = useState<EnvironmentSummary>(DEFAULT_ENVIRONMENT);
  const [customValues, setCustomValues] = useState<CustomLoadingValues | null>(null);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const [geometryPopupOpen, setGeometryPopupOpen] = useState(false);
  const [basicInputs, setBasicInputs] = useState<BasicInputsState>(INITIAL_BASIC_INPUTS);
  const [geometryState, setGeometryState] = useState<GeometryState>(() => deriveGeometrySeed(INITIAL_BASIC_INPUTS.carriagewayWidth));
  const [geometryErrors, setGeometryErrors] = useState<Record<string, string>>({});
  const [geometryWarnings, setGeometryWarnings] = useState<Record<string, string>>({});
  const [geometryLoading, setGeometryLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [environmentError, setEnvironmentError] = useState('');
  const [geometryError, setGeometryError] = useState('');
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'reference'>('3d');
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [hasValidationError, setHasValidationError] = useState(false);

  const structureDisabled = structureType === 'Other';
  const showLeftFootpath = basicInputs.footpath !== 'None';
  const showRightFootpath = basicInputs.footpath === 'Both';
  const spanValue = Number(basicInputs.span) || 0;
  const girderHeightEstimate = Math.max(2.8, Math.min(5.5, spanValue / 8));
  const deckDepthEstimate = Math.max(1.5, Math.min(3.2, spanValue / 18 || 2.2));
  const carriagewayThicknessEstimate = Math.max(0.25, Math.min(0.6, spanValue / 200 + 0.3));
  const includeCrossBracing = spanValue >= 25;
  const footpathThicknessEstimate = Math.max(0.2, Math.min(0.45, (basicInputs.footpathWidth || 1.2) / 4));

  const handleReportGeneration = () => {
    // Placeholder action until backend integration exists
    alert('Report generation will be available soon.');
  };

  useEffect(() => {
    const loadReferenceData = async () => {
      setCatalogLoading(true);
      try {
        const [locationData, materialData] = await Promise.all([fetchLocations(), fetchMaterials()]);
        setLocations(locationData);
        setMaterials(materialData);
        setCatalogError('');
        const defaultState = locationData.states[0] ?? '';
        const defaultDistrict = locationData.districts[defaultState]?.[0]?.district ?? '';
        setSelectedState(defaultState);
        setSelectedDistrict(defaultDistrict);
        if (defaultState && defaultDistrict) {
          await refreshEnvironmentFromAPI(defaultState, defaultDistrict, locationData);
        } else {
          setEnvironmentSummary(DEFAULT_ENVIRONMENT);
        }
      } catch (error) {
        setCatalogError('Unable to load catalog data.');
        setEnvironmentSummary(DEFAULT_ENVIRONMENT);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    runGeometryValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicInputs.span, basicInputs.carriagewayWidth, basicInputs.skewAngle]);

  const applyEnvironmentFromDataset = (
    stateName: string,
    districtName: string,
    dataset: LocationResponse | null = locations,
  ) => {
    if (!dataset || !stateName || !districtName) {
      setEnvironmentSummary(DEFAULT_ENVIRONMENT);
      return false;
    }
    const districtEntry = dataset.districts[stateName]?.find((item) => item.district === districtName);
    if (!districtEntry) {
      setEnvironmentSummary(DEFAULT_ENVIRONMENT);
      return false;
    }
    setEnvironmentSummary({
      wind: districtEntry.basic_wind_speed,
      seismicZone: districtEntry.seismic_zone,
      seismicFactor: districtEntry.seismic_factor,
      maxTemp: districtEntry.max_temp,
      minTemp: districtEntry.min_temp,
    });
    return true;
  };

  const refreshEnvironmentFromAPI = async (
    stateName: string,
    districtName: string,
    datasetOverride?: LocationResponse,
  ) => {
    if (!stateName || !districtName) {
      setEnvironmentSummary(DEFAULT_ENVIRONMENT);
      return;
    }
    setEnvironmentLoading(true);
    setEnvironmentError('');
    try {
      const result = await fetchLocationSummary(stateName, districtName);
      setEnvironmentSummary({
        wind: result.basic_wind_speed,
        seismicZone: result.seismic_zone,
        seismicFactor: result.seismic_factor,
        maxTemp: result.max_temp,
        minTemp: result.min_temp,
      });
    } catch (error) {
      setEnvironmentError('Unable to load environment values from the database.');
      applyEnvironmentFromDataset(stateName, districtName, datasetOverride);
    } finally {
      setEnvironmentLoading(false);
    }
  };

  const formatSummaryValue = (value: number | string | null, unit?: string) => {
    if (value === null || value === undefined || value === '') {
      return '--';
    }
    return unit ? `${value} ${unit}` : value;
  };

  const runGeometryValidation = async (
    overrides?: Partial<GeometryState>,
    changedField?: GeometryField,
  ) => {
    const payload = {
      span: Number(basicInputs.span) || 0,
      carriageway_width: Number(basicInputs.carriagewayWidth) || 0,
      skew_angle: Number(basicInputs.skewAngle) || 0,
      girder_spacing: overrides?.girder_spacing ?? geometryState.girder_spacing,
      girder_count: overrides?.girder_count ?? geometryState.girder_count,
      deck_overhang: overrides?.deck_overhang ?? geometryState.deck_overhang,
      changed_field: changedField,
    };

    setGeometryLoading(true);
    try {
      const data = await validateGeometry(payload);
      setGeometryState(data.geometry);
      setGeometryErrors(data.errors);
      setGeometryWarnings(data.warnings);
      setHasValidationError(Object.keys(data.errors).length > 0);
      setGeometryError('');
    } catch (error) {
      setGeometryError('Geometry validation failed.');
      setHasValidationError(true);
    } finally {
      setGeometryLoading(false);
    }
  };

  const handleStructureChange = (value: string) => {
    setStructureType(value);
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    const firstDistrict = locations?.districts[value]?.[0]?.district ?? '';
    setSelectedDistrict(firstDistrict);
    if (locationMode === 'database' && firstDistrict) {
      void refreshEnvironmentFromAPI(value, firstDistrict);
    } else if (locationMode === 'database') {
      setEnvironmentSummary(DEFAULT_ENVIRONMENT);
    }
  };

  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value);
    if (locationMode === 'database') {
      void refreshEnvironmentFromAPI(selectedState, value);
    }
  };

  const handleBasicInputChange = (field: keyof BasicInputsState, nextValue: string) => {
    const dropdownFields: Array<keyof BasicInputsState> = ['footpath', 'girderSteel', 'crossBracingSteel', 'deckConcrete'];
    setBasicInputs((previous) => ({
      ...previous,
      [field]: dropdownFields.includes(field) ? nextValue : Number(nextValue),
    }));
  };

  const handleLocationModeChange = (mode: 'database' | 'custom') => {
    setLocationMode(mode);
    if (mode === 'database') {
      setSpreadsheetOpen(false);
      setEnvironmentError('');
      const syncDatabaseValues = async () => {
        setCatalogLoading(true);
        try {
          const locationData = await fetchLocations();
          setLocations(locationData);
          setCatalogError('');
          let nextState = selectedState;
          if (!nextState || !locationData.states.includes(nextState)) {
            nextState = locationData.states[0] ?? '';
          }
          const validDistricts = nextState ? locationData.districts[nextState] || [] : [];
          let nextDistrict = selectedDistrict;
          if (!validDistricts.some((entry) => entry.district === nextDistrict)) {
            nextDistrict = validDistricts[0]?.district ?? '';
          }
          setSelectedState(nextState);
          setSelectedDistrict(nextDistrict);
          if (nextState && nextDistrict) {
            await refreshEnvironmentFromAPI(nextState, nextDistrict, locationData);
          } else {
            setEnvironmentSummary(DEFAULT_ENVIRONMENT);
          }
        } catch (error) {
          setCatalogError('Unable to load catalog data.');
          setEnvironmentSummary(DEFAULT_ENVIRONMENT);
        } finally {
          setCatalogLoading(false);
        }
      };
      void syncDatabaseValues();
    } else {
      setEnvironmentLoading(false);
      setEnvironmentError('');
      if (customValues) {
        setEnvironmentSummary({
          wind: customValues.wind,
          seismicZone: customValues.seismicZone,
          seismicFactor: customValues.seismicFactor,
          maxTemp: customValues.maxTemp,
          minTemp: customValues.minTemp,
        });
      } else {
        setEnvironmentSummary(DEFAULT_ENVIRONMENT);
      }
    }
  };

  const handleCustomSubmit = async (values: CustomLoadingValues) => {
    await submitCustomLoading(values);
    setCustomValues(values);
    if (locationMode === 'custom') {
      setEnvironmentSummary({
        wind: values.wind,
        seismicZone: values.seismicZone,
        seismicFactor: values.seismicFactor,
        maxTemp: values.maxTemp,
        minTemp: values.minTemp,
      });
    }
  };

  const openSpreadsheetModal = () => {
    if (locationMode !== 'custom') {
      handleLocationModeChange('custom');
    }
    setSpreadsheetOpen(true);
  };

  const handleGeometryFieldChange = (field: GeometryField, numericValue: number) => {
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    const result = resolveGeometryChange({
      carriagewayWidth: basicInputs.carriagewayWidth,
      current: geometryState,
      field,
      value: safeValue,
    });

    setGeometryErrors((prev) => {
      const cleaned = stripGeometryFieldEntries(prev);
      return Object.keys(result.errors).length ? { ...cleaned, ...result.errors } : cleaned;
    });

    setGeometryWarnings((prev) => {
      const cleaned = stripGeometryFieldEntries(prev);
      return Object.keys(result.warnings).length ? { ...cleaned, ...result.warnings } : cleaned;
    });

    if (!result.isValid) {
      setGeometryState((prev) => ({
        ...prev,
        overall_width: result.raw.overall_width,
        [field]: result.raw[field],
      }));
      return;
    }

    setGeometryState(result.geometry);
    runGeometryValidation(result.geometry, field);
  };

  const materialsOptions = useMemo(() => {
    if (!materials) {
      return {
        girder: [],
        bracing: [],
        deck: [],
      };
    }
    return {
      girder: materials.girder_steel.map((grade) => ({ label: grade, value: grade })),
      bracing: materials.cross_bracing_steel.map((grade) => ({ label: grade, value: grade })),
      deck: materials.deck_concrete.map((grade) => ({ label: grade, value: grade })),
    };
  }, [materials]);

  const summaryFields = [
    { label: 'Basic wind speed', value: formatSummaryValue(environmentSummary.wind, 'm/s') },
    { label: 'Seismic zone', value: formatSummaryValue(environmentSummary.seismicZone) },
    { label: 'Seismic factor', value: formatSummaryValue(environmentSummary.seismicFactor) },
    { label: 'Max temperature', value: formatSummaryValue(environmentSummary.maxTemp, '°C') },
    { label: 'Min temperature', value: formatSummaryValue(environmentSummary.minTemp, '°C') },
  ];

  const summaryNote =
    locationMode === 'database'
      ? 'Values auto-fill from the Osdag reference tables (shown in green).'
      : 'Values mirror the spreadsheet overrides (shown in green).';

  return (
    <div className="app-shell">
      <main className="layout">
        <section className="panel panel--form">
          <div className="panel__intro">
            <div className="app-branding">
              <img src={logoImage} alt="Osdag logo" className="app-branding__badge" />
              <div>
                <p className="app-branding__eyebrow">Group Design Console</p>
                <h1>Bridge Input Workspace</h1>
              </div>
            </div>
            <div className="panel__tabs">
              <div className="tabs">
                <button
                  type="button"
                  className={activeTab === 'basic' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('basic')}
                >
                  Basic Inputs
                </button>
                <button
                  type="button"
                  className={activeTab === 'additional' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('additional')}
                >
                  Additional Inputs
                </button>
              </div>
            </div>
          </div>
          <div className="panel__scroll">
            {activeTab === 'basic' ? (
              <div className="panel__content">
              {catalogError && <p className="alert alert--error">{catalogError}</p>}
              <FormSection title="Type of structure">
                <div className="grid two-col">
                  <Dropdown
                    label="Structure type"
                    value={structureType}
                    options={structureOptions}
                    onChange={handleStructureChange}
                  />
                </div>
                {structureDisabled && <p className="alert">Other structures not included.</p>}
              </FormSection>

              <FormSection title="Project location" description="Use database values or custom spreadsheet." disabled={structureDisabled}>
                <div className="mode-select">
                  <label className="toggle">
                    <input
                      type="radio"
                      name="location-mode"
                      value="database"
                      checked={locationMode === 'database'}
                      onChange={() => handleLocationModeChange('database')}
                      disabled={catalogLoading}
                    />
                    <span>Enter location name (state + district)</span>
                  </label>
                  <label className="toggle">
                    <input
                      type="radio"
                      name="location-mode"
                      value="custom"
                      checked={locationMode === 'custom'}
                      onChange={() => handleLocationModeChange('custom')}
                      disabled={catalogLoading}
                    />
                    <span>Tabulate custom loading parameters</span>
                  </label>
                  <button
                    type="button"
                    className="ghost"
                    onClick={openSpreadsheetModal}
                    disabled={catalogLoading}
                  >
                    Open spreadsheet
                  </button>
                </div>

                <div className="grid two-col">
                  <Dropdown
                    label="State"
                    value={selectedState}
                    options={(locations?.states || []).map((state) => ({ label: state, value: state }))}
                    onChange={handleStateChange}
                    placeholder="Select state"
                    disabled={locationMode !== 'database' || catalogLoading}
                  />
                  <Dropdown
                    label="District"
                    value={selectedDistrict}
                    options={(selectedState && locations?.districts[selectedState])
                      ? locations.districts[selectedState].map((district) => ({ label: district.district, value: district.district }))
                      : []}
                    onChange={handleDistrictChange}
                    placeholder="Select district"
                    disabled={locationMode !== 'database' || catalogLoading}
                  />
                </div>

                <div className="summary-note" aria-live="polite">
                  <span>{summaryNote}</span>
                  {(catalogLoading || environmentLoading) && (
                    <span className="summary-note__loader">
                      <span className="spinner" aria-hidden="true" />
                      <span>{catalogLoading ? 'Loading catalog…' : 'Fetching latest values…'}</span>
                    </span>
                  )}
                </div>
                <div className={`summary-grid${environmentLoading ? ' summary-grid--loading' : ''}`}>
                  {summaryFields.map((item) => (
                    <div key={item.label} className="summary-card">
                      <span>{item.label}</span>
                      <strong className="summary-card__value">{item.value}</strong>
                    </div>
                  ))}
                </div>
                {environmentError && <p className="alert alert--error">{environmentError}</p>}
              </FormSection>

              <FormSection title="Geometric details" description="Validate core bridge geometry." disabled={structureDisabled}>
                <div className="grid three-col">
                  <InputField
                    label="Span (m)"
                    type="number"
                    value={basicInputs.span}
                    onChange={(value) => handleBasicInputChange('span', value)}
                    error={geometryErrors.span}
                    min={20}
                    max={45}
                    step={0.5}
                    helperText="Supported range 20 m - 45 m"
                  />
                  <InputField
                    label="Carriageway width (m)"
                    type="number"
                    value={basicInputs.carriagewayWidth}
                    onChange={(value) => handleBasicInputChange('carriagewayWidth', value)}
                    error={geometryErrors.carriageway_width}
                    min={4.25}
                    max={24}
                    step={0.25}
                    helperText="4.25 m - 24 m"
                  />
                  <InputField
                    label="Skew angle (°)"
                    type="number"
                    value={basicInputs.skewAngle}
                    onChange={(value) => handleBasicInputChange('skewAngle', value)}
                    warning={geometryWarnings.skew_angle}
                    step={0.5}
                    helperText="Warning beyond ±15°"
                  />
                </div>
                <p className="geometry-hint">Overall width is fixed at carriageway width + 5 m and always equals girders × spacing + 2 × overhang.</p>
                <div className="grid two-col geometry-footpath">
                  <Dropdown
                    label="Footpath"
                    value={basicInputs.footpath}
                    options={footpathOptions}
                    onChange={(value) => handleBasicInputChange('footpath', value)}
                  />
                  <InputField
                    label="Footpath width per side (m)"
                    type="number"
                    value={basicInputs.footpathWidth}
                    onChange={(value) => handleBasicInputChange('footpathWidth', value)}
                    min={0.5}
                    max={3}
                    step={0.1}
                    disabled={basicInputs.footpath === 'None'}
                    helperText=
                      {basicInputs.footpath === 'None'
                        ? 'Enable a footpath option to edit width.'
                        : 'Applied to each enabled footpath edge.'}
                  />
                </div>
                  <div className="geometry-footer">
                    <button type="button" className="accent-button" onClick={() => setGeometryPopupOpen(true)}>
                      Modify additional geometry
                    </button>
                    <div className={`geometry-status${geometryLoading ? ' is-loading' : ''}`}>
                      <div className="geometry-status__header">
                        {geometryLoading && <span className="spinner" aria-hidden="true" />}
                        <span>{geometryLoading ? 'Validating geometry…' : 'Geometry synced'}</span>
                      </div>
                      <p className="geometry-status__value">
                        Overall width <strong>{geometryState.overall_width.toFixed(2)} m</strong>
                      </p>
                    </div>
                  </div>
                {geometryError && <p className="alert alert--error">{geometryError}</p>}
              </FormSection>

              <FormSection title="Material inputs" description="Select approved grades." disabled={structureDisabled}>
                <div className="grid three-col">
                  <Dropdown
                    label="Girder steel"
                    value={basicInputs.girderSteel}
                    options={materialsOptions.girder}
                    onChange={(value) => handleBasicInputChange('girderSteel', value)}
                    placeholder="Select grade"
                  />
                  <Dropdown
                    label="Cross bracing steel"
                    value={basicInputs.crossBracingSteel}
                    options={materialsOptions.bracing}
                    onChange={(value) => handleBasicInputChange('crossBracingSteel', value)}
                    placeholder="Select grade"
                  />
                  <Dropdown
                    label="Deck concrete"
                    value={basicInputs.deckConcrete}
                    options={materialsOptions.deck}
                    onChange={(value) => handleBasicInputChange('deckConcrete', value)}
                    placeholder="Select grade"
                  />
                </div>
              </FormSection>
              </div>
            ) : (
              <div className="panel__placeholder">
                <h3>Additional inputs</h3>
                <p>Placeholder tab for upcoming parameters and advanced load combinations.</p>
                <ul>
                  <li>Future thermal gradient options</li>
                  <li>Detailed seismic combinations</li>
                  <li>Automated report templates</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        <aside className="panel panel--image">
          <div className="bridge-view">
            <div className="bridge-view__intro">
              <div>
                <p className="bridge-view__eyebrow">Live visualisation</p>
                <h2>Bridge cross-section</h2>
              </div>
              <button
                type="button"
                className={`bridge-view__info-button${infoPanelOpen ? ' is-active' : ''}`}
                onClick={() => setInfoPanelOpen((previous) => !previous)}
                aria-pressed={infoPanelOpen}
                aria-label={infoPanelOpen ? 'Hide model details' : 'Show model details'}
              >
                i
              </button>
            </div>
            <div className="bridge-view__mode-controls" role="tablist" aria-label="Cross-section display mode">
              {VIEW_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === option.value}
                  className={viewMode === option.value ? 'is-active' : ''}
                  onClick={() => setViewMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="bridge-view__surface">
              {viewMode === '3d' && (
                <BridgeCrossSection
                  carriagewayWidth={basicInputs.carriagewayWidth}
                  carriagewayThickness={carriagewayThicknessEstimate}
                  deckDepth={deckDepthEstimate}
                  footpathWidth={basicInputs.footpathWidth}
                  footpathThickness={footpathThicknessEstimate}
                  overhangWidth={geometryState.deck_overhang}
                  girderCount={geometryState.girder_count}
                  girderSpacing={geometryState.girder_spacing}
                  girderHeight={girderHeightEstimate}
                  includeCrossBracing={includeCrossBracing}
                  showLeftFootpath={showLeftFootpath}
                  showRightFootpath={showRightFootpath}
                  span={spanValue}
                  structureType={structureType}
                  showAnnotations={infoPanelOpen}
                  backgroundColor="#e6ecfb"
                  hasValidationError={hasValidationError}
                />
              )}
              {viewMode === '2d' && (
                <BridgeSchematic
                  carriagewayWidth={basicInputs.carriagewayWidth}
                  footpathWidth={basicInputs.footpathWidth}
                  overhangWidth={geometryState.deck_overhang}
                  girderCount={geometryState.girder_count}
                  girderSpacing={geometryState.girder_spacing}
                  span={spanValue}
                  structureType={structureType}
                  showLeftFootpath={showLeftFootpath}
                  showRightFootpath={showRightFootpath}
                />
              )}
              {viewMode === 'reference' && (
                bridgeImage ? (
                  <div className="bridge-view__reference" role="img" aria-label="Reference bridge illustration">
                    <img src={bridgeImage} alt="Reference bridge cross section" className="bridge-view__reference-image" />
                    <div>
                      <p>
                        {structureType} · Span {spanValue.toFixed(2)} m
                      </p>
                      <p>
                        Carriageway {basicInputs.carriagewayWidth.toFixed(2)} m · Footpath {basicInputs.footpathWidth.toFixed(2)} m
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bridge-view__fallback" role="status">
                    <p>Reference imagery is not available for the selected parameters.</p>
                    <p>Please rely on the 3D or 2D view for now.</p>
                  </div>
                )
              )}
            </div>
            <div className="bridge-view__actions">
              <button type="button" className="bridge-view__report" onClick={handleReportGeneration}>
                Generate report
              </button>
            </div>
          </div>
        </aside>
      </main>

      <SpreadsheetPopup
        isOpen={spreadsheetOpen}
        initialValues={customValues ?? DEFAULT_CUSTOM_VALUES}
        onSubmit={handleCustomSubmit}
        onClose={() => setSpreadsheetOpen(false)}
      />

      <GeometryPopup
        isOpen={geometryPopupOpen}
        carriagewayWidth={basicInputs.carriagewayWidth}
        geometry={geometryState}
        errors={geometryErrors}
        warnings={geometryWarnings}
        onChange={handleGeometryFieldChange}
        onClose={() => setGeometryPopupOpen(false)}
      />
    </div>
  );
}

export default App;
