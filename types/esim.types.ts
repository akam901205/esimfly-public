// ESim related types and interfaces

export interface ESim {
  id: number;
  plan_name: string;
  status: string;
  status_key: string;
  data_left: number | 'Unlimited';
  data_left_formatted: string;
  data_left_percentage: number;
  total_volume: string;
  time_left: string;
  activated_before: string;
  iccid: string;
  flag_url: string;
  short_url: string;
  country: string;
  package_code: string;
  unlimited: boolean;
  provider?: string;
  package_duration_days?: number | null;
  created_at?: string | null;
  assigned_user: {
    email: string;
    id: number;
  } | null;
}

export interface ESimDetails extends ESim {
  activation_type: string;
  expire_date: string;
  consumption: number;
  consumption_formatted: string;
  data_total: string;
  data_total_bytes: number;
  data_usage_percentage: number;
  countries: string[];
  networks: any[];
  qr_code_url?: string;
  sharing_access_code?: string;
  direct_apple_installation_url?: string;
  ac?: string;
  provider?: string;
}

export interface AddOnPlan {
  id: string;
  name: string;
  data: number;
  data_formatted: string;
  duration: number;
  duration_formatted: string;
  price: number | string;
  packageCode: string;
  region: string;
  is_unlimited: boolean;
  amount: number;
  voice: number;
  text: number;
  flag_url: string;
  speed: string;
  location: string;
  operator: string;
}

export interface ModalState {
  isVisible: boolean;
  esim: ESim | null;
}

export interface TopUpAvailability {
  canTopUp: boolean;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
}