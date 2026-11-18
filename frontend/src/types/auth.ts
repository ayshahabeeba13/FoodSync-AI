export type UserRole = "RESTAURANT" | "NGO" | "ADMIN";

export interface RestaurantBrief {
  id: string;
  name: string;
  cuisine_type: string;
  fssai_license_number: string;
  address: string;
}

export interface NGOBrief {
  id: string;
  name: string;
  registration_number: string;
  address: string;
  verification_status: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  restaurant_id?: string;
  ngo_id?: string;
  restaurant?: RestaurantBrief;
  ngo?: NGOBrief;
  restaurant_name?: string;
  ngo_name?: string;
  fssai_license_number?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserRegisterDTO {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  restaurant_name?: string;
  cuisine_type?: string;
  restaurant_address?: string;
  fssai_license_number?: string;
  contact_phone?: string;
  ngo_name?: string;
  registration_number?: string;
  ngo_address?: string;
  service_radius_km?: number;
}
