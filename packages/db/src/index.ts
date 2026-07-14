export { createDb, db, getDb, type Database } from "./client.js";
export * from "./schema/index.js";

/** Common drizzle operators re-exported for consumers. */
export { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
