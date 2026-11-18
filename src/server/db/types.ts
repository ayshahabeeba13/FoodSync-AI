export type UserRole =
  | "RESTAURANT_MANAGER"
  | "RESTAURANT_STAFF"
  | "NGO_COORDINATOR"
  | "PLATFORM_ADMIN";

export type NGOVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type ListingType = "RAW_INGREDIENT" | "PREPARED_PORTION";

export type ListingStatus =
  | "DRAFT"
  | "VERIFIED_AVAILABLE"
  | "RESERVED"
  | "COMPLETED"
  | "CANCELLED";

export type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export type DonationStatus =
  | "CLAIMED"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  restaurantId?: string;
  ngoId?: string;
  fssaiFoodSafetySupervisorId?: string;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  fssaiLicenseNumber: string; // 14-digit statutory FSSAI number
  createdAt: string;
}

export interface NGO {
  id: string;
  name: string;
  regNumber: string;
  contactPerson: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  verificationStatus: NGOVerificationStatus;
  fssaiSurplusDistributionPermit?: string;
  createdAt: string;
}

export interface IngredientBatch {
  id: string;
  restaurantId: string;
  ingredientName: string;
  category: "Dairy" | "Produce" | "Meat" | "Bakery" | "Dry Goods" | "Pantry" | "Spices";
  currentQuantity: number;
  unit: "kg" | "g" | "litres" | "ml" | "units";
  lotNumber: string;
  receivedAt: string;
  expiryDate: string; // ISO string
  storageCondition: "Chilled (<5°C)" | "Frozen (<-18°C)" | "Dry Ambient" | "Controlled Humidity";
  unitCost: number; // In local currency
  createdAt: string;
}

export interface PreparedFoodPortion {
  id: string;
  restaurantId: string;
  dishName: string;
  portionCount: number;
  preparedAt: string; // ISO string
  consumeBy: string; // Strict FSSAI consumption deadline
  holdingMethod: "Hot Holding (>=65°C)" | "Chilled Cold Chain (<=5°C)" | "Immediate Distribution";
  holdingTempCelsius: number;
  allergenFlags: string[];
  preparedByStaffId: string;
  createdAt: string;
}

export interface FoodSafetyInspection {
  id: string;
  listingId: string;
  inspectorStaffId: string;
  inspectorName: string;
  storageTempCelsius: number;
  packagingIntact: boolean;
  sensoryPassed: boolean;
  allergensDeclared: boolean;
  isCertifiedSafe: boolean; // Must be true by authenticated human sign-off
  fssaiChecklistVersion: string;
  notes?: string;
  signedAt: string;
}

export interface SurplusListing {
  id: string;
  restaurantId: string;
  listingType: ListingType;
  itemRefId: string; // IngredientBatch ID or PreparedFoodPortion ID
  itemName: string;
  quantity: number;
  unit: string;
  targetAudience: "B2B_RESTAURANT" | "NGO_ONLY" | "ANY";
  status: ListingStatus;
  availableUntil: string;
  safetyVerified: boolean;
  inspectionId?: string;
  createdAt: string;
}

export interface B2BTransfer {
  id: string;
  fromRestaurantId: string;
  toRestaurantId: string;
  listingId: string;
  batchId: string;
  quantity: number;
  unit: string;
  status: TransferStatus;
  handoverCode?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface NGODonation {
  id: string;
  restaurantId: string;
  ngoId: string;
  listingId: string;
  quantity: number;
  unit: string;
  status: DonationStatus;
  hashedOtp: string;
  salt: string;
  otpExpiresAt: string;
  otpAttemptCount: number;
  maxAttempts: number;
  createdAt: string;
  completedAt?: string;
}

export interface Recipe {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  price: number;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantityRequired: number;
  unit: "kg" | "g" | "litres" | "ml" | "units";
}

export interface StockAuditLog {
  id: string;
  restaurantId: string;
  itemType: "RAW_INGREDIENT" | "PREPARED_PORTION";
  itemId: string;
  itemName: string;
  action: "STOCK_IN" | "POS_DEDUCT" | "B2B_OUT" | "B2B_IN" | "DONATED" | "WASTE_DISPOSAL";
  quantityDelta: number; // Negative for reduction, positive for addition
  remainingQuantity: number;
  unit: string;
  reason: string;
  referenceId?: string; // Order ID, Transfer ID, or Donation ID
  timestamp: string;
}
