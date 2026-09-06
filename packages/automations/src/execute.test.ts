import { describe, expect, it } from "vitest";
import { executePackTool } from "./execute";

describe("executePackTool input safety", () => {
  it("does not create a reservation with fabricated defaults", async () => {
    const result = await executePackTool(
      "00000000-0000-0000-0000-000000000001",
      "create_reservation",
      {},
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("does not book an appointment as Guest at the current time", async () => {
    const result = await executePackTool(
      "00000000-0000-0000-0000-000000000001",
      "book_appointment",
      {},
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
