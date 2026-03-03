import { getErrorMessage } from "../lib/errors";

describe("getErrorMessage", () => {
  it("extracts message from Error instances", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("extracts message from Error subclasses", () => {
    expect(getErrorMessage(new TypeError("type error"))).toBe("type error");
    expect(getErrorMessage(new RangeError("range error"))).toBe("range error");
  });

  it("returns string errors as-is", () => {
    expect(getErrorMessage("plain string error")).toBe("plain string error");
    expect(getErrorMessage("")).toBe("");
  });

  it('returns "Unknown error" for non-Error, non-string values', () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
    expect(getErrorMessage(undefined)).toBe("Unknown error");
    expect(getErrorMessage(42)).toBe("Unknown error");
    expect(getErrorMessage(true)).toBe("Unknown error");
    expect(getErrorMessage({ message: "not an Error" })).toBe("Unknown error");
    expect(getErrorMessage([])).toBe("Unknown error");
    expect(getErrorMessage(Symbol("sym"))).toBe("Unknown error");
  });
});
