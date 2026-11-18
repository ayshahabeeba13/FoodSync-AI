import { TokenResponse, UserRegisterDTO, User } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export class ApiService {
  private static getToken(): string | null {
    return localStorage.getItem("foodsync_jwt");
  }

  public static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.error || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // Health
  public static async getHealth(): Promise<any> {
    return this.request<any>("/health");
  }

  // Auth & Profile
  public static async register(data: UserRegisterDTO): Promise<TokenResponse> {
    return this.request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async login(credentials: { email: string; password: string }): Promise<TokenResponse> {
    return this.request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  public static async getMe(): Promise<User> {
    return this.request<User>("/auth/me", {
      method: "GET",
    });
  }

  public static async switchDemoRole(targetUserId: string): Promise<TokenResponse> {
    return this.request<TokenResponse>("/auth/switch-role", {
      method: "POST",
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
  }

  // Inventory
  public static async getBatches(category?: string): Promise<any[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request<any[]>(`/inventory/batches${q}`);
  }

  public static async createBatch(data: any): Promise<any> {
    return this.request<any>("/inventory/batches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getPortions(): Promise<any[]> {
    return this.request<any[]>("/inventory/portions");
  }

  public static async createPortion(data: any): Promise<any> {
    return this.request<any>("/inventory/portions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getInventoryAlerts(): Promise<any> {
    return this.request<any>("/inventory/alerts");
  }

  public static async getAuditLogs(limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/inventory/audit-logs?limit=${limit}`);
  }

  // Recipes & BOM
  public static async getMenuItems(): Promise<any[]> {
    return this.request<any[]>("/recipes/menu");
  }

  public static async createMenuItem(data: any): Promise<any> {
    return this.request<any>("/recipes/menu", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async createOrUpdateRecipe(data: any): Promise<any> {
    return this.request<any>("/recipes/bom", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // POS & Billing
  public static async checkout(data: { items: { menu_item_id: string; quantity: number }[]; payment_method?: string }): Promise<any> {
    return this.request<any>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getBills(limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/billing/bills?limit=${limit}`);
  }

  // AI Demand Predictions
  public static async getForecast(targetDate?: string): Promise<any> {
    const q = targetDate ? `?target_date_str=${targetDate}` : "";
    return this.request<any>(`/predictions/forecast${q}`);
  }

  public static async getStockGap(): Promise<any> {
    return this.request<any>("/predictions/stock-gap");
  }

  public static async retrainModel(): Promise<any> {
    return this.request<any>("/predictions/retrain", {
      method: "POST",
    });
  }

  // B2B Exchange
  public static async createB2BListing(data: any): Promise<any> {
    return this.request<any>("/b2b/listings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getB2BListings(radiusKm: number = 15.0): Promise<any[]> {
    return this.request<any[]>(`/b2b/listings?radius_km=${radiusKm}`);
  }

  public static async requestB2BTransfer(listingId: string, quantity: number): Promise<any> {
    return this.request<any>("/b2b/transfers/request", {
      method: "POST",
      body: JSON.stringify({ listing_id: listingId, quantity }),
    });
  }

  public static async acceptB2BTransfer(transferId: string): Promise<any> {
    return this.request<any>(`/b2b/transfers/${transferId}/accept`, {
      method: "POST",
    });
  }

  public static async completeB2BTransfer(transferId: string, handoverCode: string): Promise<any> {
    return this.request<any>(`/b2b/transfers/${transferId}/complete`, {
      method: "POST",
      body: JSON.stringify({ handover_code: handoverCode }),
    });
  }

  public static async getB2BTransfers(): Promise<any[]> {
    return this.request<any[]>("/b2b/transfers");
  }

  // Food Safety Inspection Gate
  public static async certifyFoodSafety(data: any): Promise<any> {
    return this.request<any>("/safety/certify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // NGO Donations
  public static async createDonationListing(data: any): Promise<any> {
    return this.request<any>("/donations/listings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public static async getAvailableDonations(radiusKm: number = 15.0): Promise<any[]> {
    return this.request<any[]>(`/donations/available?radius_km=${radiusKm}`);
  }

  public static async claimDonation(listingId: string): Promise<any> {
    return this.request<any>("/donations/claim", {
      method: "POST",
      body: JSON.stringify({ listing_id: listingId }),
    });
  }

  public static async verifyDonationOTP(donationId: string, submittedOtp: string): Promise<any> {
    return this.request<any>(`/donations/${donationId}/collect`, {
      method: "POST",
      body: JSON.stringify({ submitted_otp: submittedOtp }),
    });
  }

  public static async getDonationStats(): Promise<any> {
    return this.request<any>("/donations/stats");
  }

  // Map & Analytics
  public static async getMapEntities(): Promise<any> {
    return this.request<any>("/map/entities");
  }

  public static async getDashboardAnalytics(): Promise<any> {
    return this.request<any>("/analytics/dashboard");
  }

  public static async getAdminOverview(): Promise<any> {
    return this.request<any>("/admin/overview");
  }
}

export default ApiService;

