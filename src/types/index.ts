// Mirror of the Prisma LicenseStatus enum (kept in sync with schema.prisma)
export type LicenseStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'REFUNDED' | 'CANCELED';

export interface LoginRequest {
  email: string;
  license_key: string;
  device_hash: string;
  device_name: string;
  operating_system: string;
}

export interface LoginResponse {
  success: true;
  token: string;
  license: {
    plan: string;
    expires_at: Date;
    devices: number;
  };
}

export interface CreateLicenseRequest {
  email: string;
  name: string;
  plan: string;
  expires_at: string;
  max_devices?: number;
  hotmart_id?: string;
}

export interface UpdateLicenseRequest {
  status?: LicenseStatus;
  plan?: string;
  expires_at?: string;
  max_devices?: number;
}

export interface HotmartWebhookPayload {
  event: string;
  data: {
    buyer?: {
      email: string;
      name: string;
    };
    purchase?: {
      transaction: string;
      approved_date?: string;
      recurrence_number?: number;
      status?: string;
    };
    subscription?: {
      subscriber?: {
        code: string;
      };
      plan?: {
        name: string;
      };
    };
    product?: {
      id: number;
      name: string;
    };
  };
}


