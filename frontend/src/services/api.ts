import axios from 'axios';
import type {
  CustomLoadingValues,
  GeometryRequestPayload,
  GeometryResponsePayload,
  LocationResponse,
  MaterialsResponse,
} from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchLocations() {
  const { data } = await apiClient.get<LocationResponse>('/locations/');
  return data;
}

export async function fetchMaterials() {
  const { data } = await apiClient.get<MaterialsResponse>('/materials/');
  return data;
}

export async function submitCustomLoading(values: CustomLoadingValues) {
  const payload = {
    wind: values.wind,
    seismic_zone: values.seismicZone,
    seismic_factor: values.seismicFactor,
    max_temp: values.maxTemp,
    min_temp: values.minTemp,
  };
  const { data } = await apiClient.post('/custom-loading/', payload);
  return data;
}

export async function validateGeometry(payload: GeometryRequestPayload) {
  try {
    const { data } = await apiClient.post<GeometryResponsePayload>('/geometry/validate/', payload);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data as GeometryResponsePayload;
    }
    throw error;
  }
}
