/** API response types matching backend DTOs. */

export interface LockerView {
  id: string;
  size: string;
  status: 'AVAILABLE' | 'OCCUPIED';
}

export interface StoreResult {
  lockerId: string;
  packageId: string;
  pickupCode: string;
}

export interface RetrieveResult {
  lockerId: string;
  packageId: string;
  durationDays: number;
  totalStorageFee: number;
  currency: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

const BASE_URL = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiError;
      if (body?.error?.message) {
        errorMessage = body.error.message;
      }
    } catch {
      // Body is not JSON (e.g. proxy HTML 502/504)
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

export async function fetchLockers(): Promise<LockerView[]> {
  const res = await fetch(`${BASE_URL}/lockers`);
  const data = await handleResponse<{ lockers: LockerView[] }>(res);
  return data.lockers;
}

export async function storePackage(packageSize: string): Promise<StoreResult> {
  const res = await fetch(`${BASE_URL}/packages/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageSize }),
  });
  return handleResponse<StoreResult>(res);
}

export async function retrievePackage(
  lockerId: string,
  pickupCode: string,
): Promise<RetrieveResult> {
  const res = await fetch(`${BASE_URL}/packages/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lockerId, pickupCode }),
  });
  return handleResponse<RetrieveResult>(res);
}
