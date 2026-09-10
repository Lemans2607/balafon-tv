import { describe, expect, it } from "vitest";

import { snap30 } from "../utils/time";

describe("drag & drop EPG", () => {
  it("arrondit le dépôt au créneau de 30 minutes le plus proche", () => {
    const dayStartMin = 6 * 60;
    const dropPositionInMinutes = 7 * 60 + 12;

    const startMin = snap30(dropPositionInMinutes);

    expect(startMin).toBe(7 * 60);
    expect(startMin).toBeGreaterThanOrEqual(dayStartMin);
  });

  it("choisit le créneau supérieur à partir du milieu", () => {
    expect(snap30(7 * 60 + 16)).toBe(7 * 60 + 30);
  });
});