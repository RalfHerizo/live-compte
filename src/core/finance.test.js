import { describe, expect, it } from "vitest";
import { computeBalances } from "./finance";

describe("computeBalances", () => {
  it("computes exact running balance and totals", () => {
    const transactions = [
      { id: 1, date: "2026-01-01", libelle: "VENTE", recette: 100000, depense: 0 },
      { id: 2, date: "2026-01-02", libelle: "DEPENSE", recette: 0, depense: 40000 },
    ];

    const result = computeBalances(transactions);

    expect(result.totalRecettes).toBe(100000);
    expect(result.totalDepenses).toBe(40000);
    expect(result.soldeFinal).toBe(60000);
    expect(result.items[1].solde).toBe(60000);
  });
});
