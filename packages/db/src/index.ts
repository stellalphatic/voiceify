export { createDb, db, getDb, type Database } from "./client.js";
export * from "./schema/index.js";

/** Common drizzle operators re-exported for consumers. */
export { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
