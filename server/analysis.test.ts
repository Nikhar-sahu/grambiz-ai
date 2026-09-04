import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

const baseInput = {
  state: "Bihar",
  district: "Gaya",
  pincode: "824231",
  business: "Dairy Farm",
  category: "Dairy",
  monthlySales: 135000,
  monthlyCost: 76000,
};

describe("analysis.calculate financial engine", () => {
  it("routes a ₹10 lakh project to Micro Finance and reconciles the schedule", async () => {
    const result = await caller().analysis.calculate({ ...baseInput, capital: 100000 });
    expect(result.projectCost).toBe(1000000);
    expect(result.scheme?.shortName).toBe("Micro Finance");
    expect(result.finalLoan).toBe(900000);
    expect(result.schedule.at(-1)?.closing).toBe(0);
    expect(Math.abs(result.totalRepayment - (result.finalLoan + result.totalInterest))).toBeLessThan(0.01);
  });

  it("applies the Micro Finance cap at the ₹14 lakh boundary", async () => {
    const result = await caller().analysis.calculate({ ...baseInput, capital: 140000 });
    expect(result.projectCost).toBe(1400000);
    expect(result.scheme?.shortName).toBe("Micro Finance");
    expect(result.baseLoan).toBe(1260000);
    expect(result.finalLoan).toBe(1250000);
  });

  it("routes ₹14,00,001 to Term Loan", async () => {
    const result = await caller().analysis.calculate({ ...baseInput, capital: 140000.1 });
    expect(result.projectCost).toBe(1400001);
    expect(result.scheme?.shortName).toBe("Term Loan");
    expect(result.scheme?.rate).toBe(0.08);
  });

  it("routes the ₹50 lakh boundary to Term Loan and rejects the next rupee", async () => {
    const boundary = await caller().analysis.calculate({ ...baseInput, capital: 500000 });
    const outside = await caller().analysis.calculate({ ...baseInput, capital: 500000.1 });
    expect(boundary.scheme?.shortName).toBe("Term Loan");
    expect(boundary.finalLoan).toBe(4500000);
    expect(outside.scheme).toBeNull();
    expect(outside.emi).toBe(0);
  });

  it("rejects zero capital", async () => {
    await expect(caller().analysis.calculate({ ...baseInput, capital: 0 })).rejects.toThrow();
  });

  it("generates a downloadable PDF report payload", async () => {
    const report = await caller().report.generate({
      business: "Dairy Farm",
      location: "Bodh Gaya, Gaya, Bihar",
      score: 79,
      recommendation: "Promising",
      riskLevel: "Low",
      projectCost: 1000000,
      capital: 100000,
      baseLoan: 900000,
      finalLoan: 900000,
      scheme: "Micro Finance Scheme",
      rate: "6.5%",
      tenure: "3 years",
      moratorium: "3 months",
      emi: 29856,
      totalInterest: 85261,
      totalRepayment: 985261,
      demand: "High",
      competition: "Medium",
      marketStatus: "Estimated Data",
      mitigations: [{ title: "Validate buyers", text: "Speak with local customers first.", tag: "Before investment" }],
    });
    expect(report.filename).toBe("grambiz-feasibility-brief-en.pdf");
    expect(Buffer.from(report.base64, "base64").subarray(0, 8).toString()).toBe("%PDF-1.3");
    const hindiReport = await caller().report.generate({
      business: "Dairy Farm",
      location: "Bodh Gaya, Gaya, Bihar",
      language: "hi",
      score: 79,
      recommendation: "Promising",
      riskLevel: "Low",
      projectCost: 1000000,
      capital: 100000,
      baseLoan: 900000,
      finalLoan: 900000,
      scheme: "Micro Finance Scheme",
      rate: "6.5%",
      tenure: "3 years",
      moratorium: "3 months",
      emi: 29856,
      totalInterest: 85261,
      totalRepayment: 985261,
      demand: "High",
      competition: "Medium",
      marketStatus: "Estimated Data",
      mitigations: [{ title: "Validate buyers", text: "Speak with local customers first.", tag: "Before investment" }],
    });
    expect(hindiReport.filename).toBe("grambiz-feasibility-brief-hi.pdf");
    expect(Buffer.from(hindiReport.base64, "base64").subarray(0, 8).toString()).toBe("%PDF-1.3");
  });
});
