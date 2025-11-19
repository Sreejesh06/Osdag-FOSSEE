export interface DistrictRecord {
  district: string;
  basic_wind_speed: number | null;
  seismic_zone: string;
  seismic_factor: number | null;
  max_temp: number | null;
  min_temp: number | null;
}

export interface LocationResponse {
  states: string[];
  districts: Record<string, DistrictRecord[]>;
}

export interface CustomLoadingValues {
  wind: number;
  seismicZone: string;
  seismicFactor: number;
  maxTemp: number;
  minTemp: number;
}

export type GeometryField = 'girder_spacing' | 'girder_count' | 'deck_overhang';

export interface GeometryRequestPayload {
  span: number;
  carriageway_width: number;
  skew_angle: number;
  girder_spacing: number;
  girder_count: number;
  deck_overhang: number;
  changed_field?: GeometryField;
}

export interface GeometryResponsePayload {
  errors: Record<string, string>;
  warnings: Record<string, string>;
  geometry: {
    overall_width: number;
    girder_spacing: number;
    girder_count: number;
    deck_overhang: number;
  };
  is_valid: boolean;
}

export interface EnvironmentSummary {
  wind: number | null;
  seismicZone: string | null;
  seismicFactor: number | null;
  maxTemp: number | null;
  minTemp: number | null;
}

export interface MaterialsResponse {
  girder_steel: string[];
  cross_bracing_steel: string[];
  deck_concrete: string[];
}
