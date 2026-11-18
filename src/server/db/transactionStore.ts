import fs from "fs";
import path from "path";
import type {
  User,
  Restaurant,
  NGO,
  IngredientBatch,
  PreparedFoodPortion,
  SurplusListing,
  FoodSafetyInspection,
  B2BTransfer,
  NGODonation,
  Recipe,
  RecipeIngredient,
  StockAuditLog,
} from "./types.ts";

export interface DatabaseState {
  users: User[];
  restaurants: Restaurant[];
  ngos: NGO[];
  ingredientBatches: IngredientBatch[];
  preparedFoodPortions: PreparedFoodPortion[];
  surplusListings: SurplusListing[];
  foodSafetyInspections: FoodSafetyInspection[];
  b2bTransfers: B2BTransfer[];
  ngoDonations: NGODonation[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  stockAuditLogs: StockAuditLog[];
}

const DB_FILE_DIR = path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DB_FILE_DIR, "foodsync_store.json");

function getInitialState(): DatabaseState {
  return {
    users: [],
    restaurants: [],
    ngos: [],
    ingredientBatches: [],
    preparedFoodPortions: [],
    surplusListings: [],
    foodSafetyInspections: [],
    b2bTransfers: [],
    ngoDonations: [],
    recipes: [],
    recipeIngredients: [],
    stockAuditLogs: [],
  };
}

class TransactionStore {
  private state: DatabaseState;
  private rowLocks: Set<string> = new Set();
  private isPersisting: boolean = false;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn("Could not load database file, initializing empty store:", err);
    }
    return getInitialState();
  }

  public saveToDisk(): void {
    if (this.isPersisting) return;
    this.isPersisting = true;
    try {
      if (!fs.existsSync(DB_FILE_DIR)) {
        fs.mkdirSync(DB_FILE_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed persisting database to disk:", err);
    } finally {
      this.isPersisting = false;
    }
  }

  public resetState(customState?: Partial<DatabaseState>): void {
    this.state = { ...getInitialState(), ...customState };
    this.rowLocks.clear();
    this.saveToDisk();
  }

  public getState(): DatabaseState {
    return this.state;
  }

  /**
   * Executes an atomic database transaction with isolated snapshot and row-locking capability.
   * If any error is thrown during transaction execution, changes are entirely discarded (ROLLBACK).
   * Upon successful resolution, transaction changes are committed atomically.
   */
  public async runInTransaction<T>(
    operation: (tx: TransactionContext) => Promise<T>
  ): Promise<T> {
    // 1. Create a deep clone snapshot for isolation
    const snapshot: DatabaseState = JSON.parse(JSON.stringify(this.state));
    const acquiredLocks: string[] = [];

    const tx = new TransactionContext(snapshot, this.rowLocks, acquiredLocks);

    try {
      const result = await operation(tx);
      // 2. Commit transaction snapshot to master state
      this.state = snapshot;
      this.saveToDisk();
      return result;
    } catch (error) {
      // 3. Rollback: snapshot is discarded, master state untouched
      throw error;
    } finally {
      // 4. Release all acquired row-locks
      for (const lockKey of acquiredLocks) {
        this.rowLocks.delete(lockKey);
      }
    }
  }
}

export class TransactionContext {
  public state: DatabaseState;
  private globalLocks: Set<string>;
  private acquiredLocks: string[];

  constructor(
    state: DatabaseState,
    globalLocks: Set<string>,
    acquiredLocks: string[]
  ) {
    this.state = state;
    this.globalLocks = globalLocks;
    this.acquiredLocks = acquiredLocks;
  }

  /**
   * Acquires a row-level lock (analogous to SELECT ... FOR UPDATE).
   * Prevents race conditions such as duplicate claims or simultaneous transfers.
   */
  public lockRow(table: keyof DatabaseState, id: string): void {
    const lockKey = `${table}:${id}`;
    if (this.globalLocks.has(lockKey) && !this.acquiredLocks.includes(lockKey)) {
      throw new Error(`CONCURRENCY_CONFLICT: Row ${lockKey} is currently locked by another transaction.`);
    }
    this.globalLocks.add(lockKey);
    this.acquiredLocks.push(lockKey);
  }
}

// Global Singleton Instance
export const db = new TransactionStore();
