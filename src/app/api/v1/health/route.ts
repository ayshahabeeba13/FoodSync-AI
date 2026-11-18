import { NextResponse } from "next/server.js";
import { db } from "../../../../server/db/transactionStore.ts";

export async function GET() {
  const state = db.getState();
  return NextResponse.json({
    status: "healthy",
    system: "FoodSync AI Engine",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === "true",
    counts: {
      users: state.users.length,
      restaurants: state.restaurants.length,
      ngos: state.ngos.length,
      batches: state.ingredientBatches.length,
      preparedPortions: state.preparedFoodPortions.length,
      listings: state.surplusListings.length,
    },
  });
}
