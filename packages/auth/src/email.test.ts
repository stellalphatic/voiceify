import { describe, expect, it } from "vitest";
import { cleanEnvValue } from "./email.js";

describe("cleanEnvValue", () => {
  it("strips wrapping double quotes", () => {
    expect(cleanEnvValue('"re_abc"')).toBe("re_abc");
  });

  it("strips wrapping single quotes", () => {
    expect(cleanEnvValue("'re_abc'")).toBe("re_abc");
  });

  it("trims whitespace", () => {
    expect(cleanEnvValue("  re_abc  ")).toBe("re_abc");
  });
});
