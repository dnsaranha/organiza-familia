import { expect, test, describe } from "bun:test";
import { mapInvestmentType } from "./investment-mapping";

describe("mapInvestmentType", () => {
  test("should map known type without subtype", () => {
    const result = mapInvestmentType("FIXED_INCOME", null);
    expect(result).toEqual({ label_pt: "Renda Fixa", descricao_pt: "" });
  });

  test("should map known type with known subtype", () => {
    const result = mapInvestmentType("FIXED_INCOME", "CDB");
    expect(result).toEqual({
      label_pt: "CDB",
      descricao_pt: "Certificado de Depósito Bancário"
    });
  });

  test("should map known type with unknown subtype", () => {
    const result = mapInvestmentType("FIXED_INCOME", "UNKNOWN_SUBTYPE");
    expect(result).toEqual({ label_pt: "Renda Fixa", descricao_pt: "" });
  });

  test("should return type as label for unknown type", () => {
    const result = mapInvestmentType("UNKNOWN_TYPE", null);
    expect(result).toEqual({ label_pt: "UNKNOWN_TYPE", descricao_pt: "" });
  });

  test("should map 'manual' type correctly", () => {
    const result = mapInvestmentType("manual", "ACAO");
    expect(result).toEqual({
      label_pt: "Ação",
      descricao_pt: "Ação adicionada manualmente"
    });
  });

  test("should be case-insensitive for types", () => {
    const result = mapInvestmentType("fixed_income", null);
    expect(result).toEqual({ label_pt: "Renda Fixa", descricao_pt: "" });
  });

  test("should be case-insensitive for subtypes", () => {
    const result = mapInvestmentType("FIXED_INCOME", "cdb");
    expect(result).toEqual({
      label_pt: "CDB",
      descricao_pt: "Certificado de Depósito Bancário"
    });
  });
});
