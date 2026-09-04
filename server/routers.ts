import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import path from "node:path";

const analysisInput = z.object({
  state: z.string().min(2),
  district: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be a six-digit postal code"),
  business: z.string().min(2),
  category: z.string().min(2),
  capital: z.number().positive().max(10000000),
  monthlySales: z.number().nonnegative().default(0),
  monthlyCost: z.number().nonnegative().default(0),
});

function buildAnalysis(input: z.infer<typeof analysisInput>) {
  const projectCost = input.capital / 0.1;
  const baseLoan = projectCost * 0.9;
  const insideRange = projectCost <= 5000000;
  const scheme = projectCost <= 1400000
    ? { name: "Micro Finance Scheme", shortName: "Micro Finance", rate: 0.065, max: 1250000, tenure: 36, moratorium: 3 }
    : projectCost <= 5000000
      ? { name: "Term Loan Scheme", shortName: "Term Loan", rate: 0.08, max: 4500000, tenure: 84, moratorium: 6 }
      : null;
  const finalLoan = scheme ? Math.min(baseLoan, scheme.max) : 0;
  const monthlyRate = scheme ? scheme.rate / 12 : 0;
  const repaymentMonths = scheme ? scheme.tenure - scheme.moratorium : 0;
  const emi = scheme && monthlyRate > 0
    ? finalLoan * monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths) / (Math.pow(1 + monthlyRate, repaymentMonths) - 1)
    : 0;

  const schedule = [] as Array<{ month: number; opening: number; interest: number; principal: number; payment: number; closing: number }>;
  let balance = finalLoan;
  for (let month = 1; month <= repaymentMonths; month += 1) {
    const opening = balance;
    const interest = opening * monthlyRate;
    const principal = month === repaymentMonths ? opening : Math.min(opening, emi - interest);
    const payment = principal + interest;
    balance = Math.max(0, opening - principal);
    schedule.push({ month, opening, interest, principal, payment, closing: balance });
  }

  const affordabilitySurplus = input.monthlySales - input.monthlyCost;
  const coverage = emi > 0 && affordabilitySurplus > 0 ? affordabilitySurplus / emi : 0;
  const demand = input.category === "Dairy" || input.category === "Grocery / Retail" ? 84 : 76;
  const financialFit = input.monthlySales > 0 ? Math.max(35, Math.min(96, Math.round((coverage * 22) + 48))) : 72;
  const competition = input.category === "Grocery / Retail" ? 61 : input.category === "Dairy" ? 48 : 54;
  const opportunity = input.category === "Dairy" ? 87 : input.category === "Food Processing" ? 84 : 78;
  const risk = !insideRange ? 36 : coverage > 2 ? 82 : coverage > 1.3 ? 68 : input.monthlySales > 0 ? 52 : 64;
  const growth = input.category === "Food Processing" || input.category === "Dairy" ? 82 : 74;
  const score = Math.round((demand * 0.2) + (financialFit * 0.2) + ((100 - competition) * 0.12) + (opportunity * 0.18) + (risk * 0.15) + (growth * 0.15));
  const recommendation = score >= 75 ? "Promising" : score >= 58 ? "Proceed with caution" : "High risk";
  const riskLevel = score >= 75 ? "Low" : score >= 58 ? "Medium" : "High";

  const mitigation = [
    { title: "Validate buyers before borrowing", text: `Speak with at least 10 potential customers in ${input.district || "your local area"} (PIN ${input.pincode}) and record likely monthly demand before committing the full project cost.`, tag: "Before investment" },
    { title: "Protect repayment capacity", text: emi > 0 ? `Keep a reserve equal to at least three estimated EMIs (about ₹${Math.round(emi * 3).toLocaleString("en-IN")}) and review the conservative sales case each month.` : "Keep a separate launch reserve for operating costs and unexpected delays.", tag: "Financial control" },
    { title: "Build more than one sales channel", text: "Combine direct customers with at least one local retailer, institution, cooperative, or delivery channel so the business is not dependent on a single buyer.", tag: "During launch" },
  ];

  return {
    input,
    projectCost,
    baseLoan,
    scheme,
    finalLoan,
    emi,
    totalInterest: schedule.reduce((sum, row) => sum + row.interest, 0),
    totalRepayment: schedule.reduce((sum, row) => sum + row.payment, 0),
    schedule,
    affordabilitySurplus,
    coverage,
    score,
    riskLevel,
    recommendation,
    dimensions: { demand, financialFit, competition, opportunity, risk: 100 - risk, growth },
    market: {
      demand: demand >= 80 ? "High" : "Medium",
      competition: competition >= 60 ? "Medium-high" : "Medium",
      gap: input.category === "Dairy" ? "High" : "Medium-high",
      reach: "5–10 km",
      status: "Estimated Data",
    },
    mitigation,
    sources: ["Problem Statement Configuration", "Demo market indicators"],
  };
}

const reportInput = z.object({
  business: z.string(),
  category: z.string().default("General enterprise"),
  location: z.string(),
  language: z.enum(["en", "hi"]).default("en"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  locationSource: z.string().default("Manual entry"),
  score: z.number(),
  recommendation: z.string(),
  riskLevel: z.string(),
  projectCost: z.number(),
  capital: z.number(),
  baseLoan: z.number(),
  finalLoan: z.number(),
  scheme: z.string(),
  rate: z.string(),
  tenure: z.string(),
  moratorium: z.string(),
  emi: z.number(),
  totalInterest: z.number(),
  totalRepayment: z.number(),
  demand: z.string(),
  competition: z.string(),
  marketStatus: z.string(),
  mitigations: z.array(z.object({ title: z.string(), text: z.string(), tag: z.string() })),
});

const reportMoney = (value: number) => `INR ${Math.round(value).toLocaleString("en-IN")}`;
const reportFont = (name: "regular" | "bold") => path.join(process.cwd(), `server/assets/NotoSansDevanagari-${name === "bold" ? "Bold" : "Regular"}.ttf`);

async function makePdf(input: z.infer<typeof reportInput>) {
  const PDFDocument = (await import("pdfkit")).default;
  const document = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: `${input.business} — GramBiz AI Feasibility Brief`, Author: "GramBiz AI" } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => { document.on("end", resolve); document.on("error", reject); });
  const hindi = input.language === "hi";
  const regular = hindi ? reportFont("regular") : "Helvetica";
  const bold = hindi ? reportFont("bold") : "Helvetica-Bold";
  const copy = hindi ? {
    title: "ग्रामबिज़ एआई", brief: "व्यवसाय व्यवहार्यता रिपोर्ट", prepared: "आपके स्थानीय व्यवसाय निर्णय के लिए एक व्यावहारिक रिपोर्ट", assessment: "समग्र आकलन", market: "बाज़ार की झलक", demand: "मांग", competition: "प्रतिस्पर्धा", financial: "वित्तीय संरचना", capital: "उपलब्ध अपनी पूंजी", project: "अनुमानित परियोजना लागत", baseLoan: "आधार ऋण", finalLoan: "अंतिम निर्धारित ऋण", scheme: "योजना", interest: "ब्याज दर", tenure: "अवधि", moratorium: "मोराटोरियम", emi: "मासिक भुगतान", totalInterest: "कुल ब्याज", totalRepayment: "कुल भुगतान", mitigation: "जोखिम कम करने के उपाय", location: "स्थान और मानचित्र", coordinates: "निर्देशांक", source: "स्थान स्रोत", disclaimer: "अस्वीकरण", before: "निवेश से पहले", during: "शुरुआत के दौरान", confirm: "उधार लेने से पहले", data: "डेटा स्थिति", footer: "ग्रामबिज़ एआई - 2026 प्रोटोटाइप · समस्या विवरण 26091"
  } : {
    title: "GramBiz AI", brief: "Feasibility Brief", prepared: "A practical report for a better-informed local business decision", assessment: "Overall assessment", market: "Market snapshot", demand: "Demand", competition: "Competition", financial: "Financial structure", capital: "Available capital", project: "Estimated project cost", baseLoan: "Base 90% loan", finalLoan: "Final configured loan", scheme: "Scheme", interest: "Interest rate", tenure: "Tenure", moratorium: "Moratorium", emi: "Monthly EMI", totalInterest: "Total interest", totalRepayment: "Total repayment", mitigation: "Risk mitigation", location: "Location and map", coordinates: "Coordinates", source: "Location source", disclaimer: "Disclaimer", before: "Before investment", during: "During launch", confirm: "Before borrowing", data: "Data status", footer: "GramBiz AI · SIH 2026 prototype · Problem Statement 26091"
  };
  const format = (value: number | null | undefined) => value == null ? (hindi ? "उपलब्ध नहीं" : "Not available") : value.toFixed(6);
  const addHeader = (section: string) => {
    document.font(bold).fontSize(20).fillColor("#173738").text(copy.title);
    document.moveDown(0.15).fontSize(10).fillColor("#b57920").text(section.toUpperCase());
    document.moveTo(42, 92).lineTo(553, 92).strokeColor("#327e68").lineWidth(2).stroke();
  };
  const label = (name: string, value: string, y?: number) => {
    if (y != null) document.y = y;
    document.font(bold).fontSize(9).fillColor("#65736e").text(name, 48, document.y, { width: 235 });
    document.font(/[\u0900-\u097F]/.test(value) ? regular : "Helvetica").fontSize(11).fillColor("#173738").text(value, 310, document.y - 13, { width: 220, align: "right" });
    document.x = 42;
    document.moveDown(0.45);
  };
  const body = (text: string, size = 10) => document.font(/[\u0900-\u097F]/.test(text) ? regular : "Helvetica").fontSize(size).fillColor("#51615c").text(text, { width: 505, lineGap: 3 });
  const mapSnapshot = () => {
    const x = 42, y = document.y, w = 511, h = 184;
    document.roundedRect(x, y, w, h, 12).fill("#eaf2e9");
    document.save().lineWidth(1).strokeColor("#c4d8c8");
    for (let i = 1; i < 8; i += 1) document.moveTo(x + (w / 8) * i, y).lineTo(x + (w / 8) * i - 38, y + h).stroke();
    for (let i = 1; i < 6; i += 1) document.moveTo(x, y + (h / 6) * i).lineTo(x + w, y + (h / 6) * i - 25).stroke();
    document.lineWidth(8).strokeColor("#a9c9d7").moveTo(x + 18, y + h - 28).bezierCurveTo(x + 160, y + 80, x + 260, y + 115, x + w - 15, y + 34).stroke();
    document.lineWidth(3).strokeColor("#ffffff").moveTo(x + 24, y + 48).lineTo(x + w - 35, y + 145).stroke();
    const pinX = x + w / 2, pinY = y + h / 2;
    document.circle(pinX, pinY, 12).fill("#173738"); document.circle(pinX, pinY, 5).fill("#f2b64c");
    document.restore();
    document.font(bold).fontSize(8).fillColor("#315c55").text(hindi ? "स्थानीय क्षेत्र का मानचित्र पूर्वावलोकन" : "Local area map snapshot", x + 14, y + 14);
    document.font(regular).fontSize(8).fillColor("#60706a").text(hindi ? "यह स्थान-आधारित पूर्वावलोकन है; सीमा लगभग 5–10 किमी है।" : "Location-based preview; approximate analysis radius is 5–10 km.", x + 14, y + h - 22);
    document.y = y + h + 16;
  };

  // Formal cover page with the GramBiz visual identity.
  document.rect(0, 0, 595, 842).fill("#f7f7f2");
  document.rect(0, 0, 595, 18).fill("#173738");
  document.roundedRect(42, 58, 58, 58, 16).fill("#173738");
  document.circle(71, 87, 13).fill("#f2b64c");
  document.circle(71, 87, 7).fill("#173738");
  document.font(bold).fontSize(25).fillColor("#173738").text(hindi ? "ग्रामबिज़ एआई" : "GramBiz AI", 118, 68);
  document.font(regular).fontSize(9).fillColor("#6b7872").text(hindi ? "स्थानीय व्यवसाय निर्णयों के लिए स्पष्टता" : "BUSINESS CLARITY, CLOSER TO HOME", 120, 101);
  document.roundedRect(42, 196, 511, 238, 20).fill("#173738");
  document.font(bold).fontSize(11).fillColor("#f2b64c").text(hindi ? "व्यवसाय व्यवहार्यता रिपोर्ट" : "BUSINESS FEASIBILITY REPORT", 72, 235);
  document.font(hindi && /[\u0900-\u097F]/.test(input.business) ? bold : "Helvetica-Bold").fontSize(32).fillColor("#ffffff").text(input.business, 72, 278, { width: 430 });
  document.font(hindi && /[\u0900-\u097F]/.test(input.location) ? regular : "Helvetica").fontSize(14).fillColor("#c8d8d0").text(input.location, 72, 338, { width: 430 });
  document.moveTo(72, 382).lineTo(520, 382).strokeColor("#467d6e").lineWidth(1).stroke();
  document.font(regular).fontSize(11).fillColor("#dce8e1").text(hindi ? "आपके निर्णय के लिए वित्तीय, बाज़ार और जोखिम संकेतों का संक्षिप्त विश्लेषण।" : "A concise view of financial, market, and risk signals for your next decision.", 72, 400, { width: 420 });
  document.font(bold).fontSize(12).fillColor("#173738").text(hindi ? "तैयार किया गया विश्लेषण" : "PREPARED ANALYSIS", 42, 506);
  document.font(regular).fontSize(11).fillColor("#51615c").text(hindi ? "उद्यम और स्थान-आधारित प्रारंभिक आकलन - समस्या विवरण 26091" : "Location-aware initial assessment · Problem Statement 26091", 42, 532, { width: 500 }); document.font(hindi && /[\u0900-\u097F]/.test(input.business) ? regular : "Helvetica").fontSize(10).fillColor("#65736e").text(`${input.business} (${input.category})`, 42, 552, { width: 500 });
  document.font(regular).fontSize(10).fillColor("#7a8882").text(hindi ? "यह रिपोर्ट सूचनात्मक और विश्लेषणात्मक मार्गदर्शन है; यह ऋण स्वीकृति नहीं है।" : "This report provides informational and analytical guidance; it is not a loan approval.", 42, 692, { width: 500 });
  document.font(bold).fontSize(10).fillColor("#327e68").text(hindi ? "ग्रामबिज़ एआई - 2026 प्रोटोटाइप" : "GramBiz AI · 2026 prototype", 42, 746);
  document.addPage();
  document.font(regular);
  addHeader(copy.brief);
  document.moveDown(2.5).font(hindi && /[\u0900-\u097F]/.test(input.business) ? bold : "Helvetica-Bold").fontSize(25).fillColor("#173738").text(input.business);
  document.moveDown(0.25).font(hindi && /[\u0900-\u097F]/.test(input.location) ? regular : "Helvetica").fontSize(11).fillColor("#65736e").text(input.location);
  document.moveDown(1); body(copy.prepared, 12);
  document.moveDown(2).font(bold).fontSize(11).fillColor("#b57920").text(copy.assessment.toUpperCase());
  document.moveDown(0.6).font(bold).fontSize(36).fillColor("#327e68").text(`${input.score}/100`);
  document.font(hindi ? "Helvetica-Bold" : bold).fontSize(13).fillColor("#173738").text(`${input.recommendation} · ${input.riskLevel} risk`);
  document.moveDown(1.5).font(bold).fontSize(11).fillColor("#b57920").text(copy.market.toUpperCase());
  document.moveDown(0.6); label(copy.demand, input.demand); label(copy.competition, input.competition); label(copy.data, input.marketStatus);
  document.moveDown(1.5).font(bold).fontSize(11).fillColor("#b57920").text(copy.location.toUpperCase());
  document.moveDown(0.6); mapSnapshot();
  label(copy.coordinates, `${format(input.latitude)}, ${format(input.longitude)}`); label(copy.source, input.locationSource);

  document.addPage(); addHeader(copy.financial); document.moveDown(2.2);
  label(copy.capital, reportMoney(input.capital)); label(copy.project, reportMoney(input.projectCost)); label(copy.baseLoan, reportMoney(input.baseLoan)); label(hindi ? "योजना अधिकतम सीमा" : "Scheme maximum cap", input.scheme === "Micro Finance Scheme" ? reportMoney(1250000) : "Configured by scheme"); label(copy.finalLoan, reportMoney(input.finalLoan));
  document.moveDown(0.8); label(copy.scheme, input.scheme); label(copy.interest, input.rate); label(copy.tenure, input.tenure); label(copy.moratorium, input.moratorium); label(copy.emi, reportMoney(input.emi)); label(copy.totalInterest, reportMoney(input.totalInterest)); label(copy.totalRepayment, reportMoney(input.totalRepayment));
  document.moveDown(0.5).font(regular).fontSize(8).fillColor("#65736e").text(hindi ? "नीति तर्क: परियोजना लागत = पूंजी / 10%; आधार ऋण = परियोजना लागत × 90%; अंतिम ऋण = न्यूनतम (आधार ऋण, योजना सीमा)।" : "Policy logic: project cost = capital / 10%; base loan = project cost × 90%; final loan = minimum of base loan and scheme cap."); document.moveDown(0.5).font(hindi ? "Helvetica" : regular).fontSize(8).fillColor("#65736e").text(hindi ? "EMI formula: P × r × (1+r)^n / ((1+r)^n - 1), reducing-balance repayment." : "EMI formula: P × r × (1+r)^n / ((1+r)^n - 1), using reducing-balance amortization."); document.moveDown(0.8).font(bold).fontSize(11).fillColor("#b57920").text(copy.mitigation.toUpperCase()); document.moveDown(0.6);
  input.mitigations.forEach((item, index) => { document.font(hindi ? "Helvetica-Bold" : bold).fontSize(11).fillColor("#173738").text(`${index + 1}. ${item.title}`); document.moveDown(0.15); body(item.text, 9); document.moveDown(0.7); });

  document.addPage(); addHeader(hindi ? "बाज़ार, रणनीति और मूल्य निर्धारण" : "Market, SWOT and positioning"); document.moveDown(2.2);
  document.font(bold).fontSize(12).fillColor("#b57920").text(hindi ? "हाइपर-लोकल बाज़ार इंटेलिजेंस (5–10 किमी क्षेत्र)" : "HYPER-LOCAL MARKET INTELLIGENCE (5–10 KM CATCHMENT)"); document.moveDown(0.6);
  label(hindi ? "क्षेत्रफल" : "Catchment radius", "~7.5 km"); label(hindi ? "अनुमानित जनसंख्या" : "Est. catchment population", "Estimated Data"); label(hindi ? "ग्रामीण परिवार" : "Est. rural households", "Estimated Data"); label(hindi ? "निकटवर्ती गांव समूह" : "Nearby village clusters", "Estimated Data"); label(hindi ? "मांग स्तर" : "Local demand level", input.demand); label(hindi ? "बाज़ार अंतर" : "Market gap level", input.category === "Dairy" ? "Medium-high" : "Medium"); label(hindi ? "विकास क्षमता" : "Growth potential", "High"); label(hindi ? "प्रतिस्पर्धा घनत्व" : "Competition density", `${input.competition} (Demo Data)`);
  document.moveDown(0.8).font(bold).fontSize(12).fillColor("#b57920").text(hindi ? "रणनीतिक विश्लेषण" : "STRATEGIC SWOT ANALYSIS"); document.moveDown(0.5);
  const dairy = input.category.toLowerCase().includes("dairy");
  const swot = dairy ? { s: "Consistent daily cash generation from milk sales; local fodder availability; low marketing cost through village customers.", w: "Dependency on animal health and veterinary care; limited refrigerated chilling; seasonal fodder-price pressure.", o: "Tie-ups with local dairy cooperatives; organic manure as secondary revenue; premium high-fat milk for urban buyers.", t: "Seasonal cattle disease; fodder and feed inflation; milk spoilage or spillage in hot weather." } : { s: "Local customer access; manageable operating scale; opportunity to build repeat demand through a focused product mix.", w: "Limited initial working capital; dependence on consistent local demand; operating processes may need to mature.", o: "Institutional buyers, local partnerships, digital ordering, and adjacent products can widen revenue sources.", t: "Input-price inflation, established competitors, seasonal demand shifts, and delayed receivables." };
  const swotBox = (heading: string, text: string, color: string) => { document.roundedRect(42, document.y, 511, 52, 5).fill(color); document.font(bold).fontSize(9).fillColor("#173738").text(heading, 52, document.y + 8); document.font("Helvetica").fontSize(8).fillColor("#51615c").text(text, 52, document.y + 23, { width: 490, lineGap: 1.5 }); document.moveDown(4.2); };
  swotBox(hindi ? "ताकत" : "STRENGTHS (S)", swot.s, "#eef7f0"); swotBox(hindi ? "कमज़ोरियां" : "WEAKNESSES (W)", swot.w, "#fff6e7"); swotBox(hindi ? "अवसर" : "OPPORTUNITIES (O)", swot.o, "#eef5fb"); swotBox(hindi ? "खतरे" : "THREATS (T)", swot.t, "#fff0ef");
  document.addPage(); addHeader(hindi ? "मूल्य निर्धारण और डेटा पारदर्शिता" : "Pricing and data transparency"); document.moveDown(2.2);
  document.font(bold).fontSize(12).fillColor("#b57920").text(hindi ? "उत्पाद मूल्य निर्धारण और स्थानीय स्थिति रणनीति" : "PRODUCT PRICING & LOCAL POSITIONING STRATEGY"); document.moveDown(0.7);
  label(hindi ? "सुझाई गई मूल्य सीमा" : "Suggested price band", dairy ? "INR 48–65 / litre" : "Validate locally"); label(hindi ? "अनुशंसित रणनीति" : "Recommended strategy", "Competitive market rate");
  document.moveDown(0.4); body(hindi ? "तर्क: स्थानीय बाजार दर के अनुरूप कीमत रखें और गुणवत्ता, ताजगी तथा भरोसेमंद सेवा को स्पष्ट रूप से बताएं।" : "Rationale: align with local market rates while emphasizing quality, freshness, and dependable service.", 9);
  document.moveDown(1.2).font(bold).fontSize(12).fillColor("#b57920").text(hindi ? "डेटा पारदर्शिता और ऑडिट लेबल" : "DATA TRANSPARENCY & AUDIT AUDIENCE LABELS"); document.moveDown(0.6);
  label(hindi ? "योजना पैरामीटर और सीमाएं" : "Scheme parameters & limits", "Official Source — SIH 2026 PS 26091 configured rules"); label(hindi ? "वित्तीय संरचना और EMI" : "Financial structuring & EMI", "Official Source — deterministic reducing-balance engine"); label(hindi ? "कैचमेंट और पहुंच" : "Catchment population / reach", "Estimated Data — Gram Panchayat projection"); label(hindi ? "प्रतिस्पर्धी बिंदु" : "Competitor pinpoints", "Demo Data — simulated 5–10 km benchmark"); label(hindi ? "मूल्य सीमा" : "Product pricing band", "Estimated Data — regional market survey");
  document.addPage(); addHeader(copy.disclaimer); document.moveDown(2.2);
  document.font(bold).fontSize(13).fillColor("#173738").text(copy.data); document.moveDown(0.5); body(hindi ? "वित्तीय मान: समस्या विवरण कॉन्फ़िगरेशन और नियतात्मक गणना। बाज़ार संकेत: अनुमानित डेटा। स्थान: उपयोगकर्ता प्रविष्टि या ब्राउज़र स्थान अनुमति।" : "Financial values: Problem Statement Configuration and deterministic calculation. Market indicators: Estimated Data. Location: User entry or browser location permission.");
  document.moveDown(2).font(bold).fontSize(13).fillColor("#173738").text(copy.disclaimer); document.moveDown(0.5); body(hindi ? "यह रिपोर्ट ग्रामबिज़ एआई द्वारा सूचनात्मक और विश्लेषणात्मक व्यवहार्यता उद्देश्यों के लिए तैयार की गई है। वास्तविक ऋण स्वीकृति, ब्याज दर, इक्विटी आवश्यकता, सब्सिडी वितरण और योजना लाभ संबंधित बैंक, वित्तीय संस्था तथा सरकारी प्राधिकरण के आधिकारिक मूल्यांकन और दिशानिर्देशों पर निर्भर हैं। किसी परिणाम की गारंटी नहीं है।" : "This report is generated by GramBiz AI for informational and analytical feasibility purposes. Actual loan sanction, interest rates, equity requirements, subsidy disbursements, and scheme benefits are subject to official evaluation and guidelines of the concerned lending bank, financial institution, and government authorities. No outcome is guaranteed.");
  document.moveDown(3).font(bold).fontSize(12).fillColor("#327e68").text(hindi ? "अगले कदम" : "Recommended next step"); document.moveDown(0.5); body(hindi ? "स्थानीय खरीदारों से बात करें, आपूर्तिकर्ता के मूल्य की पुष्टि करें और उधार लेने से पहले वर्तमान ऋण शर्तों की पुष्टि करें।" : "Speak with local buyers, confirm supplier pricing, and verify current lending terms before borrowing.");
  const pageRange = document.bufferedPageRange();
  for (let page = 1; page <= pageRange.count; page += 1) {
    document.switchToPage(page - 1);
    document.save();
    document.moveTo(42, 760).lineTo(553, 760).strokeColor("#d8e1d9").lineWidth(0.7).stroke();
    document.font("Helvetica").fontSize(8).fillColor("#7a8882").text("GRAMBIZ AI", 42, 770);
    document.text(`Page ${page} of ${pageRange.count}`, 450, 770, { width: 103, align: "right" });
    document.restore();
  }
  document.flushPages();
  document.end(); await finished;
  return Buffer.concat(chunks).toString("base64");
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  analysis: router({
    calculate: publicProcedure.input(analysisInput).mutation(({ input }) => buildAnalysis(input)),
  }),

  report: router({
    generate: publicProcedure.input(reportInput).mutation(async ({ input }) => ({ filename: `grambiz-feasibility-brief-${input.language}.pdf`, base64: await makePdf(input) })),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
