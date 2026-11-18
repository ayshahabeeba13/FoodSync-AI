/**
 * Food Safety and Standards Authority of India (FSSAI) Compliance Specification
 * 
 * Governed by:
 * 1. Food Safety and Standards (Recovery and Distribution of Surplus Food) Regulations, 2019.
 * 2. Schedule 4 (General Hygienic and Sanitary Practices), FSS (Licensing & Registration of Food Businesses) Regulations, 2011.
 * 3. FSS (Labelling and Display) Regulations, 2020.
 */

export interface FSSAIChecklistItem {
  id: string;
  category: "TEMPERATURE" | "HYGIENE_PACKAGING" | "SENSORY" | "TIME_WINDOW" | "ALLERGEN_DECLARATION" | "FBO_DECLARATION";
  label: string;
  regulatoryReference: string;
  required: boolean;
  type: "boolean" | "number" | "select";
  unit?: string;
  minThreshold?: number;
  maxThreshold?: number;
  acceptableValues?: string[];
  guidanceText: string;
}

export interface FSSAISafetyConfig {
  regulatoryBody: string;
  applicableRegulations: string[];
  rawIngredientChecklist: FSSAIChecklistItem[];
  preparedFoodChecklist: FSSAIChecklistItem[];
  declaredAllergensList: string[];
}

export const FSSAI_SURPLUS_SAFETY_RULES: FSSAISafetyConfig = {
  regulatoryBody: "Food Safety and Standards Authority of India (FSSAI)",
  applicableRegulations: [
    "FSS (Recovery and Distribution of Surplus Food) Regulations, 2019",
    "FSS (Licensing and Registration of Food Businesses) Regulations, 2011 - Schedule 4",
    "FSS (Labelling and Display) Regulations, 2020",
  ],
  declaredAllergensList: [
    "Cereals containing gluten (Wheat, Rye, Barley, Oats)",
    "Crustaceans and their products",
    "Eggs and egg products",
    "Fish and fish products",
    "Peanuts and peanut products",
    "Soybeans and soybean products",
    "Milk and milk products (including Lactose)",
    "Tree nuts and their products",
    "Sulphite in concentrations >= 10 mg/kg",
  ],
  rawIngredientChecklist: [
    {
      id: "raw_temp_control",
      category: "TEMPERATURE",
      label: "Cold Storage Temperature Verification",
      regulatoryReference: "Schedule 4, Part II, Section 4.2 - Temperature Control",
      required: true,
      type: "number",
      unit: "°C",
      maxThreshold: 5.0, // Chilled raw ingredients <= 5°C
      guidanceText: "Perishable raw ingredients must be stored at or below 5°C. Frozen ingredients must be at or below -18°C.",
    },
    {
      id: "raw_pack_integrity",
      category: "HYGIENE_PACKAGING",
      label: "Packaging & Seal Integrity",
      regulatoryReference: "FSS (Packaging) Regulations, 2018; Surplus Food Regulations 2019, Reg 4(1)",
      required: true,
      type: "boolean",
      guidanceText: "Original manufacturer seal intact or packed in food-grade, airtight, sanitized primary food contact containers.",
    },
    {
      id: "raw_sensory_clearance",
      category: "SENSORY",
      label: "Organoleptic / Sensory Evaluation",
      regulatoryReference: "Surplus Food Regulations 2019, Reg 4(1)(a) - Wholesome & Edible",
      required: true,
      type: "boolean",
      guidanceText: "Visual and olfactory inspection: No signs of mold, rot, discoloration, unnatural pest infestation, or off-odors.",
    },
    {
      id: "raw_expiry_cushion",
      category: "TIME_WINDOW",
      label: "Manufacturer Expiry Date Cushion",
      regulatoryReference: "Surplus Food Regulations 2019, Reg 4(1)(b) - Shelf Life",
      required: true,
      type: "boolean",
      guidanceText: "Ingredient must have at least 24 hours remaining before the 'Best Before' or 'Expiry Date' stamped by manufacturer.",
    },
    {
      id: "raw_fbo_license_confirm",
      category: "FBO_DECLARATION",
      label: "FSSAI License / Registration Declaration",
      regulatoryReference: "FSS Act 2006, Section 31 - Mandatory Licensing",
      required: true,
      type: "boolean",
      guidanceText: "Food Business Operator (FBO) holds a valid, active 14-digit FSSAI License/Registration number.",
    },
  ],
  preparedFoodChecklist: [
    {
      id: "prep_hot_cold_temp",
      category: "TEMPERATURE",
      label: "Holding Temperature (Hot >=65°C or Chilled <=5°C)",
      regulatoryReference: "Surplus Food Regulations 2019, Reg 4(1)(c); Schedule 4 Section 5.3",
      required: true,
      type: "number",
      unit: "°C",
      guidanceText: "Cooked food held hot must be maintained at or above 65°C. Chilled cooked food must be rapidly cooled to 5°C or below within 2 hours.",
    },
    {
      id: "prep_time_limit_window",
      category: "TIME_WINDOW",
      label: "Safe Consumption Window Verification",
      regulatoryReference: "Surplus Food Regulations 2019, Reg 4(1)(d) - Time-Temperature Control",
      required: true,
      type: "boolean",
      guidanceText: "Cooked food must be distributed and consumed within the safe window: max 4 hours for hot food, or max 24 hours if maintained in continuous cold chain (<=5°C).",
    },
    {
      id: "prep_hygienic_container",
      category: "HYGIENE_PACKAGING",
      label: "Food-Grade Sanitized Container",
      regulatoryReference: "FSS (Packaging) Regulations, 2018 - Food Contact Materials",
      required: true,
      type: "boolean",
      guidanceText: "Stored in clean, sanitized, food-grade stainless steel containers, insulated carriers, or approved single-use eco-friendly meal boxes.",
    },
    {
      id: "prep_sensory_eval",
      category: "SENSORY",
      label: "Organoleptic / Sensory Clearance",
      regulatoryReference: "Surplus Food Regulations 2019, Reg 4(1)(a) - Wholesome & Safe",
      required: true,
      type: "boolean",
      guidanceText: "Verified by qualified kitchen supervisor: Normal appearance, texture, and natural aroma without rancidity or microbial souring.",
    },
    {
      id: "prep_allergen_marking",
      category: "ALLERGEN_DECLARATION",
      label: "Mandatory Allergen Disclosure",
      regulatoryReference: "FSS (Labelling and Display) Regulations, 2020, Chapter 2",
      required: true,
      type: "boolean",
      guidanceText: "All major allergens present in the prepared dish (milk, nuts, gluten, soy, eggs, etc.) are explicitly checked and declared on handover manifest.",
    },
    {
      id: "prep_staff_attestation",
      category: "FBO_DECLARATION",
      label: "Authenticated Food Safety Supervisor Sign-Off",
      regulatoryReference: "Surplus Food Regulations 2019, Reg 4(2) - Designated Person Responsibility",
      required: true,
      type: "boolean",
      guidanceText: "I personally certify as a designated Food Safety Supervisor/Staff Member that this food is wholesome, fit for human consumption, and compliant with FSSAI regulations.",
    },
  ],
};
