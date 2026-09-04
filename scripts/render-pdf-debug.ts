import { writeFileSync } from "node:fs";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
const report = await appRouter.createCaller(ctx).report.generate({
  language: "hi", business: "Dairy Farm", location: "Bodh Gaya, Gaya, Bihar", latitude: 24.6951, longitude: 84.9912,
  locationSource: "Browser GPS + reverse geocoding", score: 79, recommendation: "Promising", riskLevel: "Low",
  projectCost: 1000000, capital: 100000, baseLoan: 900000, finalLoan: 900000, scheme: "Micro Finance Scheme", rate: "6.5%", tenure: "3 years", moratorium: "3 months", emi: 29856, totalInterest: 85261, totalRepayment: 985261, demand: "High", competition: "Medium", marketStatus: "Estimated Data", mitigations: [{ title: "Validate buyers", text: "Speak with local customers first.", tag: "Before investment" }],
});
writeFileSync("/tmp/grambiz-debug-hi.pdf", Buffer.from(report.base64, "base64"));
