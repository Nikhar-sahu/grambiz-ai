import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Compass,
  Download,
  FileText,
  IndianRupee,
  LocateFixed,
  Loader2,
  Lightbulb,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Analysis = inferRouterOutputs<AppRouter>["analysis"]["calculate"];
type FormState = {
  state: string;
  district: string;
  pincode: string;
  business: string;
  category: string;
  capital: number;
  monthlySales: number;
  monthlyCost: number;
};

const defaultForm: FormState = {
  state: "Bihar",
  district: "Gaya",
  pincode: "824231",
  business: "Dairy Farm",
  category: "Dairy",
  capital: 100000,
  monthlySales: 135000,
  monthlyCost: 76000,
};

const categoryOptions = ["Dairy", "Agriculture", "Grocery / Retail", "Food Processing", "Textile", "Handicraft", "Poultry", "Livestock", "Repair Services", "Transportation", "Other"];
const steps = ["Location", "Business", "Finance", "Your brief"];
const accent = ["#327e68", "#df9a2e", "#5e7397", "#a85c4d", "#327e68", "#df9a2e"];

const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const pct = (value: number) => `${value.toFixed(1)}%`;

function DataBadge({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "green" | "slate" }) {
  const styles = tone === "green" ? "bg-[#e7f1eb] text-[#29654f]" : tone === "slate" ? "bg-[#eef0ef] text-[#566260]" : "bg-[#fcf0d8] text-[#93651e]";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${styles}`}>{children}</span>;
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#b57920]">{children}</p>;
}

function MetricCard({ label, value, note, icon: Icon, tone = "green" }: { label: string; value: string; note: string; icon: typeof IndianRupee; tone?: "green" | "amber" | "red" }) {
  const colors = { green: "bg-[#e8f1ed] text-[#28634f]", amber: "bg-[#fdf1d9] text-[#9c6a1d]", red: "bg-[#f7e8e5] text-[#9d4c42]" };
  return <div className="rounded-2xl border border-[#e5e4dc] bg-white p-5 shadow-soft">
    <div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold text-[#697572]">{label}</span><span className={`rounded-xl p-2 ${colors[tone]}`}><Icon size={16} /></span></div>
    <p className="mt-5 font-display text-2xl font-extrabold tracking-tight text-[#173738]">{value}</p>
    <p className="mt-1 text-xs leading-relaxed text-[#7b8581]">{note}</p>
  </div>;
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 52;
  return <div className="relative h-40 w-40 shrink-0">
    <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
      <circle cx="64" cy="64" r="52" fill="none" stroke="#e8ece8" strokeWidth="11" />
      <circle cx="64" cy="64" r="52" fill="none" stroke="#327e68" strokeLinecap="round" strokeWidth="11" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-4xl font-extrabold text-[#173738]">{score}</span><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#71807c]">out of 100</span></div>
  </div>;
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<Analysis | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [question, setQuestion] = useState("");
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [answer, setAnswer] = useState("Your advisor will explain the result using the numbers and indicators in this brief.");
  const calculate = trpc.analysis.calculate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep(3);
      window.setTimeout(() => document.getElementById("analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    },
    onError: (error) => toast.error(error.message || "We could not complete the analysis. Please check your inputs."),
  });

  const radarData = useMemo(() => result ? [
    { subject: "Demand", score: result.dimensions.demand },
    { subject: "Finance", score: result.dimensions.financialFit },
    { subject: "Opportunity", score: result.dimensions.opportunity },
    { subject: "Growth", score: result.dimensions.growth },
    { subject: "Safety", score: 100 - result.dimensions.risk },
    { subject: "Competition", score: 100 - result.dimensions.competition },
  ] : [], [result]);

  const chartData = useMemo(() => result ? result.schedule.filter((_, index) => index % 6 === 0 || index === result.schedule.length - 1).map((row) => ({ period: `M${row.month}`, balance: Math.round(row.closing) })) : [], [result]);

  const update = (key: keyof FormState, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const start = () => { setStarted(true); setStep(0); window.setTimeout(() => document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth" }), 30); };
  const loadDemo = (kind: "dairy" | "retail" | "term") => {
    const values: Record<typeof kind, FormState> = {
      dairy: defaultForm,
      retail: { ...defaultForm, business: "Village Essentials Store", category: "Grocery / Retail", capital: 200000, monthlySales: 225000, monthlyCost: 160000 },
      term: { ...defaultForm, business: "Millet Processing Unit", category: "Food Processing", capital: 200000, monthlySales: 425000, monthlyCost: 265000 },
    };
    setForm(values[kind]); setResult(null); setStarted(true); setStep(2); window.setTimeout(() => document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth" }), 30);
    toast.success(`${kind === "term" ? "Term Loan" : kind === "dairy" ? "Dairy" : "Retail"} demo loaded`);
  };
  const analyze = () => {
    if (!form.state || !form.district || !form.pincode || !form.business || !form.category || form.capital <= 0) {
      toast.error("Please complete the required fields before continuing."); return;
    }
    calculate.mutate(form);
  };
  const askAdvisor = () => {
    const q = question.toLowerCase();
    if (!result) return;
    if (q.includes("emi") || q.includes("loan")) setAnswer(`Your estimated project cost is ${money(result.projectCost)}. The configured ${result.scheme?.shortName || "scheme"} results in a final loan amount of ${money(result.finalLoan)} and a monthly EMI of ${money(result.emi)}. This is an estimate based on the current configuration, not a sanction decision.`);
    else if (q.includes("risk") || q.includes("reduce")) setAnswer(`The main watch-outs are repayment capacity, seasonal sales, and local demand validation. Start with buyer conversations, keep a three-EMI reserve, and build a second sales channel before expanding.`);
    else if (q.includes("why") || q.includes("suitable")) setAnswer(`${form.business} scores ${result.score}/100 because demand and growth indicators are supportive, while the recommendation also accounts for competition and financial fit. Validate local buyers before committing the full project cost.`);
    else setAnswer(`Based on this brief, focus first on validating demand in the ${result.market.reach} service area, then compare the conservative monthly surplus with the estimated EMI before borrowing.`);
    setQuestion("");
  };
  const generateReport = trpc.report.generate.useMutation({
    onSuccess: (data) => {
      const binary = window.atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = data.filename; link.click();
      URL.revokeObjectURL(url); toast.success(language === "hi" ? "हिंदी PDF तैयार है।" : "Your professional PDF brief is ready.");
    },
    onError: () => toast.error("The report could not be generated. Please try again."),
  });
  const downloadReport = () => {
    if (!result || generateReport.isPending) return;
    generateReport.mutate({
      business: form.business, category: form.category, location: `${form.district}, ${form.state} - PIN ${form.pincode}`, language, latitude: coordinates?.latitude, longitude: coordinates?.longitude, locationSource: coordinates ? "Browser GPS + reverse geocoding" : "Manual entry",
      score: result.score, recommendation: result.recommendation, riskLevel: result.riskLevel,
      projectCost: result.projectCost, capital: form.capital, baseLoan: result.baseLoan, finalLoan: result.finalLoan,
      scheme: result.scheme?.name || "Outside configured range", rate: result.scheme ? pct(result.scheme.rate * 100) : "Not applicable",
      tenure: result.scheme ? `${result.scheme.tenure / 12} years` : "Not applicable", moratorium: result.scheme ? `${result.scheme.moratorium} months` : "Not applicable",
      emi: result.emi, totalInterest: result.totalInterest, totalRepayment: result.totalRepayment, demand: result.market.demand, competition: result.market.competition, marketStatus: result.market.status, mitigations: result.mitigation,
    });
  };
  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error("Location detection is not available in this browser."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${coords.latitude}&lon=${coords.longitude}`);
        const data = await response.json();
        const address = data.address || {};
        const cityLike = address.city || address.town || address.municipality || address.village || address.suburb;
        const state = address.state || address.region;
        const district = address.state_district || address.district || address.county || address.city_district || cityLike;
                setForm((current) => ({ ...current, state: state || current.state, district: district || current.district, pincode: address.postcode || current.pincode }));
        toast.success("Location detected. State, district, block, and village fields were updated where available. Please review them before continuing.");
      } catch { toast.error("We found your coordinates, but could not resolve the address. Please enter it manually."); }
      setLocating(false);
    }, () => { setLocating(false); toast.error("Location permission was not granted. You can enter the location manually."); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  };

  return <div className="min-h-screen bg-[#f7f6f1] text-[#173738]">
    <header className="sticky top-0 z-30 border-b border-[#e5e3da]/80 bg-[#f7f6f1]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <button onClick={() => { setStarted(false); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#173738] text-[#f2b64c] shadow-soft"><Compass size={22} strokeWidth={2.2} /></span>
          <span><span className="block font-display text-[17px] font-extrabold tracking-[-0.04em]">GramBiz <span className="text-[#c98322]">AI</span></span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a8581]">Business clarity, closer to home</span></span>
        </button>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#5e6b67] md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-[#173738]">How it works</a><a href="#why-grambiz" className="transition-colors hover:text-[#173738]">Why GramBiz</a><a href="#demo" className="transition-colors hover:text-[#173738]">SIH demo</a><button onClick={() => setLanguage((value) => value === "en" ? "hi" : "en")} className="rounded-lg border border-[#d9ddd5] bg-white px-2.5 py-1.5 text-xs font-bold text-[#315c55]">{language === "en" ? "हिन्दी" : "EN"}</button>
          <button onClick={() => setStarted((value) => !value)} className="rounded-full bg-[#173738] px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[.97]">{started ? "Back to overview" : "Start an analysis"}</button>
        </nav>
          <div className="flex items-center gap-2 md:hidden"><button onClick={() => setLanguage((value) => value === "en" ? "hi" : "en")} className="rounded-lg border border-[#d9ddd5] bg-white px-2 py-1.5 text-[10px] font-bold text-[#315c55]">{language === "en" ? "हिन्दी" : "EN"}</button><button aria-label="Toggle navigation" onClick={() => setMobileMenu((value) => !value)} className="rounded-xl p-2 text-[#173738]"><Menu size={22} /></button></div>
      </div>
      {mobileMenu && <div className="border-t border-[#e5e3da] bg-[#f7f6f1] px-5 py-4 md:hidden"><div className="flex flex-col gap-4 text-sm font-semibold"><a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a><a href="#why-grambiz" onClick={() => setMobileMenu(false)}>Why GramBiz</a><button onClick={() => { setMobileMenu(false); start(); }} className="rounded-xl bg-[#173738] px-4 py-3 text-left text-white">Start an analysis <ArrowRight className="ml-2 inline" size={16} /></button></div></div>}
    </header>

    {!started ? <>
      <main>
        <section className="paper-grid relative overflow-hidden border-b border-[#e5e3da]">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
            <div className="relative z-10 rise-in">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d6dfd8] bg-[#f4f7f1] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#327e68]"><span className="h-2 w-2 rounded-full bg-[#3b9b75]" /> Built for rural and semi-urban entrepreneurs</div>
              <h1 className="max-w-3xl font-display text-[clamp(2.65rem,6vw,5.35rem)] font-extrabold leading-[.99] tracking-[-0.065em] text-[#173738]">{language === "en" ? <>A clearer path from <span className="text-[#c98322]">local opportunity</span> to a business plan.</> : <>स्थानीय अवसर से <span className="text-[#c98322]">बेहतर व्यवसाय योजना</span> तक का स्पष्ट रास्ता।</>}</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#65716e]">{language === "en" ? "GramBiz AI brings local market signals, financial planning, and scheme guidance together—so a first business decision feels less like a guess." : "GramBiz AI स्थानीय बाज़ार, वित्तीय योजना और योजना संबंधी जानकारी को एक जगह लाता है—ताकि आपका पहला व्यवसायिक निर्णय अधिक स्पष्ट हो।"}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={start} className="group inline-flex items-center justify-center gap-3 rounded-xl bg-[#173738] px-6 py-4 text-sm font-bold text-white shadow-lift transition-all hover:-translate-y-1 active:scale-[.98]">Start business analysis <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></button><a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6d9d1] bg-white/60 px-6 py-4 text-sm font-bold text-[#315c55] transition-colors hover:bg-white">See how it works</a></div>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-[#75817d]"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#327e68]" /> Explainable by design</span><span className="flex items-center gap-2"><IndianRupee size={15} className="text-[#c98322]" /> Deterministic finance</span><span className="flex items-center gap-2"><Sparkles size={15} className="text-[#327e68]" /> English + हिन्दी</span></div>
            </div>
            <div className="relative rise-in delay-2">
              <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#e9b34c]/15 blur-3xl" />
              <div className="relative rounded-[28px] border border-[#dfe3d9] bg-[#fffefa] p-4 shadow-lift sm:p-6">
                <div className="flex items-center justify-between border-b border-[#ecebe3] pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a7772a]">Sample decision brief</p><p className="mt-1 font-display text-base font-extrabold">Dairy Farm · Bodh Gaya</p></div><DataBadge tone="green"><CircleCheck size={12} /> Ready</DataBadge></div>
                <div className="grid grid-cols-[auto_1fr] items-center gap-5 py-6"><ScoreRing score={82} /><div><p className="text-xs font-semibold text-[#73807c]">Overall feasibility</p><p className="mt-1 font-display text-xl font-extrabold text-[#173738]">Promising, with checks</p><p className="mt-2 text-xs leading-5 text-[#75817d]">Strong demand signals; validate buyers and protect the first three months of repayment.</p></div></div>
                <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f5f6f0] p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#79837e]">Local opportunity</p><p className="mt-2 font-display text-xl font-extrabold">High</p><p className="mt-1 text-[11px] text-[#6f7d78]">5–10 km view</p></div><div className="rounded-2xl bg-[#fbf0d8] p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#98702a]">Monthly EMI</p><p className="mt-2 font-display text-xl font-extrabold text-[#6f501d]">₹27,600</p><p className="mt-1 text-[11px] text-[#84692f]">Illustrative estimate</p></div></div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#e6e3d8] p-3"><span className="rounded-xl bg-[#e9f2ed] p-2 text-[#327e68]"><Lightbulb size={16} /></span><p className="text-xs leading-5 text-[#5f6c68]"><span className="font-bold text-[#315c55]">The useful bit:</span> every result comes with a next step, not just a score.</p></div>
              </div>
              <div className="absolute -bottom-7 -left-8 hidden rounded-2xl border border-[#dfe3d9] bg-white px-4 py-3 shadow-soft sm:block"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173738] text-[#f2b64c]"><MapPin size={15} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#7e8984]">Designed around</p><p className="text-xs font-bold text-[#315c55]">the local context</p></div></div></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="max-w-2xl"><SectionKicker>The idea</SectionKicker><h2 className="font-display text-4xl font-extrabold leading-tight tracking-[-.05em] sm:text-5xl">A business plan should begin with the place, not a template.</h2><p className="mt-5 text-base leading-7 text-[#687571]">GramBiz turns a few simple inputs into a decision brief a first-time entrepreneur can actually use—and a judge can understand at a glance.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3"><div className="rise-in rounded-3xl bg-[#173738] p-7 text-white shadow-lift"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#285b59] text-[#f2b64c]"><MapPin size={21} /></span><p className="mt-10 text-sm font-bold text-[#f2b64c]">01 / Start local</p><h3 className="mt-2 font-display text-2xl font-extrabold">Read the nearby market</h3><p className="mt-3 text-sm leading-6 text-[#c6d5cf]">Explore demand, competition, customer groups, and market gaps within a practical local radius.</p></div><div className="rise-in delay-1 rounded-3xl border border-[#e1e2d9] bg-white p-7 shadow-soft"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fbefd7] text-[#a36c1b]"><IndianRupee size={21} /></span><p className="mt-10 text-sm font-bold text-[#b57920]">02 / Make it tangible</p><h3 className="mt-2 font-display text-2xl font-extrabold">See the money clearly</h3><p className="mt-3 text-sm leading-6 text-[#697571]">Understand how your contribution translates into a project size, loan structure, scheme, and EMI.</p></div><div className="rise-in delay-2 rounded-3xl border border-[#e1e2d9] bg-white p-7 shadow-soft"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f1ed] text-[#327e68]"><Lightbulb size={21} /></span><p className="mt-10 text-sm font-bold text-[#327e68]">03 / Act with care</p><h3 className="mt-2 font-display text-2xl font-extrabold">Leave with next steps</h3><p className="mt-3 text-sm leading-6 text-[#697571]">Get a plain-language recommendation with practical ways to reduce risk before investing or borrowing.</p></div></div></section>

        <section id="why-grambiz" className="border-y border-[#e5e3da] bg-[#f0f2ec]"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-24"><div><SectionKicker>Built for trust</SectionKicker><h2 className="font-display text-4xl font-extrabold leading-tight tracking-[-.05em]">Useful enough for a founder. Explainable enough for a public programme.</h2><p className="mt-5 text-base leading-7 text-[#687571]">The system separates what is calculated, what is estimated, and what still needs local verification. That distinction is the product.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[#dce2da] bg-white p-5"><BarChart3 className="text-[#327e68]" size={20} /><h3 className="mt-5 font-display text-lg font-extrabold">Rules plus AI</h3><p className="mt-2 text-sm leading-6 text-[#6d7975]">The engine calculates. The advisor explains. Neither is allowed to blur the line.</p></div><div className="rounded-2xl border border-[#dce2da] bg-white p-5"><ShieldCheck className="text-[#c98322]" size={20} /><h3 className="mt-5 font-display text-lg font-extrabold">Honest signals</h3><p className="mt-2 text-sm leading-6 text-[#6d7975]">Estimated and demo indicators are visibly labelled instead of dressed up as official data.</p></div><div className="rounded-2xl border border-[#dce2da] bg-white p-5"><Users className="text-[#327e68]" size={20} /><h3 className="mt-5 font-display text-lg font-extrabold">Made for real people</h3><p className="mt-2 text-sm leading-6 text-[#6d7975]">Simple language, Hindi support, and visual explanations reduce the barrier to financial planning.</p></div><div className="rounded-2xl border border-[#dce2da] bg-white p-5"><TrendingUp className="text-[#c98322]" size={20} /><h3 className="mt-5 font-display text-lg font-extrabold">Actionable risk</h3><p className="mt-2 text-sm leading-6 text-[#6d7975]">Every material risk points to a practical mitigation action and a validation step.</p></div></div></div></section>

        <section id="demo" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><SectionKicker>For the SIH room</SectionKicker><h2 className="font-display text-4xl font-extrabold tracking-[-.05em]">Three stories. One working engine.</h2></div><p className="max-w-sm text-sm leading-6 text-[#6d7975]">Load a scenario, change the inputs, and watch the recommendation respond. No slides needed.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3"><button onClick={() => loadDemo("dairy")} className="group rounded-3xl border border-[#dfdfd6] bg-white p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-[#b8d3c4]"><div className="flex items-center justify-between"><span className="rounded-full bg-[#e7f1eb] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#327e68]">Scenario 01</span><ArrowRight size={18} className="text-[#87938e] transition-transform group-hover:translate-x-1" /></div><h3 className="mt-8 font-display text-2xl font-extrabold">A dairy start-up</h3><p className="mt-2 text-sm text-[#72807b]">₹1,00,000 own capital · Micro Finance route</p></button><button onClick={() => loadDemo("retail")} className="group rounded-3xl border border-[#dfdfd6] bg-white p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-[#ecd29e]"><div className="flex items-center justify-between"><span className="rounded-full bg-[#fbefd7] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#9b6b20]">Scenario 02</span><ArrowRight size={18} className="text-[#87938e] transition-transform group-hover:translate-x-1" /></div><h3 className="mt-8 font-display text-2xl font-extrabold">A village essentials store</h3><p className="mt-2 text-sm text-[#72807b]">₹2,00,000 own capital · recalculated locally</p></button><button onClick={() => loadDemo("term")} className="group rounded-3xl border border-[#dfdfd6] bg-white p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:border-[#cfd7e5]"><div className="flex items-center justify-between"><span className="rounded-full bg-[#e9edf5] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#587095]">Scenario 03</span><ArrowRight size={18} className="text-[#87938e] transition-transform group-hover:translate-x-1" /></div><h3 className="mt-8 font-display text-2xl font-extrabold">A millet processing unit</h3><p className="mt-2 text-sm text-[#72807b]">Term Loan route · cap and repayment in view</p></button></div></section>
      </main>
      <footer className="border-t border-[#e5e3da] bg-[#173738] text-[#dbe7df]"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center lg:px-8"><p><span className="font-display font-extrabold text-white">GramBiz AI</span> · Problem Statement 26091</p><p className="max-w-lg text-xs leading-5 text-[#a8c0b6]">Prototype guidance only. Actual lending decisions and scheme benefits depend on official rules and the concerned authority or institution.</p></div></footer>
    </> : <main id="assessment" className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col justify-between gap-5 border-b border-[#e1e2d9] pb-8 sm:flex-row sm:items-end"><div><SectionKicker>GramBiz analysis</SectionKicker><h1 className="font-display text-4xl font-extrabold tracking-[-.05em]">Build your decision brief.</h1><p className="mt-2 text-sm text-[#6b7773]">A few details now. A clearer next step in a moment.</p></div><div className="flex items-center gap-2"><DataBadge tone="green"><ShieldCheck size={12} /> Demo-safe</DataBadge><button onClick={() => { setStarted(false); setResult(null); }} className="rounded-xl border border-[#d9ddd5] bg-white px-3 py-2 text-xs font-bold text-[#53635d]">Exit analysis</button></div></div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit"><div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2">{steps.map((label, index) => <button key={label} onClick={() => index <= (result ? 3 : Math.min(step, 2)) && setStep(index)} className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition-colors lg:w-full ${step === index ? "bg-[#173738] text-white" : "text-[#65736e] hover:bg-white"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${step === index ? "bg-[#f2b64c] text-[#173738]" : "bg-[#e6ebe5] text-[#65736e]"}`}>{index < step ? <Check size={14} /> : index + 1}</span>{label}</button>)}</div><div className="mt-7 hidden rounded-2xl border border-[#e2e3db] bg-white p-4 lg:block"><p className="text-xs font-bold text-[#53635d]">Plain-language mode</p><p className="mt-2 text-xs leading-5 text-[#78837e]">You can change any answer later. Estimates are labelled clearly.</p></div></aside>
        <div className="min-w-0">
          {!result && step < 3 && <div className="max-w-3xl rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-8">
            <div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#b57920]">Step {step + 1} of 3</p><h2 className="mt-2 font-display text-2xl font-extrabold">{step === 0 ? "Where will you start?" : step === 1 ? "Tell us about the business" : "Let’s make the numbers practical"}</h2></div><span className="text-sm font-bold text-[#87918d]">{Math.round(((step + 1) / 3) * 100)}%</span></div><div className="mb-8 h-1.5 overflow-hidden rounded-full bg-[#edf0ea]"><div className="h-full rounded-full bg-[#327e68] transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
            {step === 0 && <div className="grid gap-5 sm:grid-cols-2"><Field label="State" value={form.state} onChange={(value) => update("state", value)} placeholder="e.g. Bihar" /><Field label="District" value={form.district} onChange={(value) => update("district", value)} placeholder="e.g. Gaya" /><Field label="Pincode" value={form.pincode} onChange={(value) => update("pincode", value.replace(/\D/g, "").slice(0, 6))} placeholder="e.g. 824231" type="text" helper="Use the six-digit postal code for the business location." /><div className="sm:col-span-2 rounded-2xl bg-[#f3f6f0] p-4 text-sm text-[#687770]"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-[#327e68]" /><p><span className="font-bold text-[#315c55]">Local lens:</span> the analysis uses an approximate 5–10 km view around your selected area. Any non-live indicators will be marked as estimated or demo data.</p></div><button onClick={detectLocation} disabled={locating} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#bcd3c5] bg-white px-3 py-2 text-xs font-bold text-[#28634f] hover:bg-[#e8f1ed] disabled:opacity-60">{locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />} {locating ? "Detecting…" : "Use my location"}</button></div></div></div>}
            {step === 1 && <div className="space-y-6"><div><label className="mb-2 block text-sm font-bold text-[#38514b]">What kind of business are you considering?</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{categoryOptions.map((option) => <button key={option} onClick={() => update("category", option)} className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${form.category === option ? "border-[#327e68] bg-[#e8f1ed] text-[#28634f] ring-2 ring-[#327e68]/10" : "border-[#e1e4dc] text-[#65736e] hover:border-[#b7c9bf]"}`}>{option}</button>)}</div></div><Field label="Business name" value={form.business} onChange={(value) => update("business", value)} placeholder="e.g. Dairy Farm" /><div className="rounded-2xl bg-[#fbf0d8] p-4 text-sm text-[#745724]"><div className="flex gap-3"><Lightbulb size={18} className="mt-0.5 shrink-0 text-[#b57920]" /><p>Choose the closest category. GramBiz will combine it with your location and operating context to make the brief more relevant.</p></div></div></div>}
            {step === 2 && <div className="space-y-6"><Field label="How much of your own money can you invest?" value={String(form.capital)} onChange={(value) => update("capital", Number(value) || 0)} type="number" prefix="₹" helper="This is treated as the configured 10% beneficiary contribution." /><div className="grid gap-5 sm:grid-cols-2"><Field label="Expected monthly sales" value={String(form.monthlySales)} onChange={(value) => update("monthlySales", Number(value) || 0)} type="number" prefix="₹" helper="Optional, but useful for repayment comfort." /><Field label="Expected monthly operating cost" value={String(form.monthlyCost)} onChange={(value) => update("monthlyCost", Number(value) || 0)} type="number" prefix="₹" helper="Include supplies, transport, wages, and rent." /></div><div className="rounded-2xl border border-[#e2e3db] bg-[#fbfbf8] p-4"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#327e68]" /><div><p className="text-sm font-bold text-[#315c55]">A safer way to look at borrowing</p><p className="mt-1 text-xs leading-5 text-[#71807a]">The final brief compares the estimated EMI with your operating surplus and suggests ways to protect repayment capacity. It is an analytical aid, not a loan approval.</p></div></div></div></div>}
            <div className="mt-9 flex items-center justify-between border-t border-[#ecece4] pt-6">{step > 0 ? <button onClick={() => setStep((value) => value - 1)} className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-[#61706a] hover:bg-[#f4f5ef]"><ChevronLeft size={17} /> Back</button> : <span />}{step < 2 ? <button onClick={() => setStep((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl bg-[#173738] px-5 py-3 text-sm font-bold text-white transition-transform active:scale-[.97]">Continue <ChevronRight size={17} /></button> : <button onClick={analyze} disabled={calculate.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#327e68] px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{calculate.isPending ? "Building your brief…" : "Analyze my business"} <ArrowRight size={17} /></button>}</div>
          </div>}

          {result && <div id="analysis-result" className="space-y-6">
            <div className="rounded-3xl bg-[#173738] p-6 text-white shadow-lift sm:p-8"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><DataBadge tone="green"><CircleCheck size={12} /> Analysis complete</DataBadge><DataBadge>Estimated market indicators</DataBadge></div><p className="mt-5 text-sm font-semibold text-[#b7cec3]">{form.business} · {form.district}, {form.state} · PIN {form.pincode}</p><h2 className="mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-[-.04em] sm:text-4xl">A grounded starting point, with a few things to validate.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#c2d3cc]">The current inputs indicate a <span className="font-bold text-[#f2c467]">{result.recommendation.toLowerCase()}</span> opportunity. Here is what is working, what to watch, and what to do next.</p></div><div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-4"><ScoreRing score={result.score} /><div><p className="text-xs font-semibold text-[#afc9bc]">Overall feasibility</p><p className="mt-1 font-display text-xl font-extrabold">{result.riskLevel} risk</p><p className="mt-1 text-xs text-[#afc9bc]">Rule-based score</p></div></div></div><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => { setResult(null); setStep(2); }} className="rounded-xl bg-[#f2b64c] px-4 py-3 text-sm font-bold text-[#173738] transition-transform hover:-translate-y-0.5 active:scale-[.97]">Change inputs</button><button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><Download size={16} /> {generateReport.isPending ? "Preparing PDF…" : "Download PDF brief"}</button></div></div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Estimated project cost" value={money(result.projectCost)} note="Based on your 10% contribution" icon={IndianRupee} /><MetricCard label="Final configured loan" value={money(result.finalLoan)} note={result.scheme ? `Capped at ${money(result.scheme.max)}` : "No configured scheme"} icon={IndianRupee} tone="amber" /><MetricCard label="Monthly EMI" value={money(result.emi)} note={result.scheme ? `${result.scheme.tenure / 12} year tenure · reducing balance` : "Not applicable"} icon={TrendingUp} /><MetricCard label="Market opportunity" value={result.market.demand} note={`${result.market.reach} local view · ${result.market.status}`} icon={MapPin} tone="green" /></div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><section className="rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-7"><div className="flex items-start justify-between gap-4"><div><SectionKicker>Financial structure</SectionKicker><h3 className="font-display text-2xl font-extrabold">See the money move</h3></div><DataBadge tone="slate">Problem configuration</DataBadge></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><MoneyStep label="Your contribution" value={money(form.capital)} note="10%" /><MoneyStep label="Estimated project" value={money(result.projectCost)} note="100%" /><MoneyStep label="Base 90% loan" value={money(result.baseLoan)} note="Before cap" /></div><div className="mt-4 rounded-2xl border border-[#f0dfb9] bg-[#fff8e9] p-4"><div className="flex items-start gap-3"><CircleAlert size={18} className="mt-0.5 shrink-0 text-[#a6731f]" /><div><p className="text-sm font-bold text-[#72531e]">{result.scheme ? `${result.scheme.name} · ${pct(result.scheme.rate * 100)} per annum` : "Outside configured range"}</p><p className="mt-1 text-xs leading-5 text-[#856b35]">{result.scheme ? `The final configured loan is ${money(result.finalLoan)} after applying the scheme maximum of ${money(result.scheme.max)}.` : "This project cost is above the schemes currently configured in this prototype."}</p></div></div></div><div className="mt-6 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-[#7a8580]">Tenure</p><p className="mt-1 font-bold">{result.scheme ? `${result.scheme.tenure / 12} years` : "—"}</p></div><div><p className="text-xs text-[#7a8580]">Moratorium</p><p className="mt-1 font-bold">{result.scheme ? `${result.scheme.moratorium} months` : "—"}</p></div><div><p className="text-xs text-[#7a8580]">Total repayment</p><p className="mt-1 font-bold">{money(result.totalRepayment)}</p></div></div><p className="mt-6 text-[11px] leading-5 text-[#89938e]">Actual treatment of interest and repayment during the moratorium is subject to the applicable lending terms.</p></section><section className="rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-7"><SectionKicker>Market snapshot</SectionKicker><div className="flex items-start justify-between gap-3"><h3 className="font-display text-2xl font-extrabold">What stands out</h3><DataBadge>{result.market.status}</DataBadge></div><div className="mt-7 space-y-5"><SnapshotRow label="Demand" value={result.market.demand} width={result.dimensions.demand} color="bg-[#327e68]" /><SnapshotRow label="Opportunity gap" value={result.market.gap} width={result.dimensions.opportunity} color="bg-[#dfa43e]" /><SnapshotRow label="Competition" value={result.market.competition} width={result.dimensions.competition} color="bg-[#a85c4d]" /></div><div className="mt-7 rounded-2xl bg-[#f3f6f0] p-4"><p className="text-sm font-bold text-[#315c55]">Read this carefully</p><p className="mt-1 text-xs leading-5 text-[#71807a]">These indicators help frame a local conversation. They are not a substitute for speaking with buyers, suppliers, or the lending institution.</p></div></section></div>

            <div className="grid gap-6 xl:grid-cols-[.86fr_1.14fr]"><section className="rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-7"><div className="flex items-center justify-between"><div><SectionKicker>Score anatomy</SectionKicker><h3 className="font-display text-2xl font-extrabold">Why this score?</h3></div><BarChart3 className="text-[#327e68]" size={21} /></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="72%"><PolarGrid stroke="#dfe7e0" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#65736e", fontSize: 11, fontWeight: 600 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey="score" stroke="#327e68" fill="#327e68" fillOpacity={0.25} strokeWidth={2} /></RadarChart></ResponsiveContainer></div><p className="text-xs leading-5 text-[#78847f]">This prototype uses deterministic weights across demand, financial fit, competition, opportunity, risk, and growth. Identical inputs produce the same result.</p></section><section className="rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-7"><div className="flex items-center justify-between"><div><SectionKicker>Repayment view</SectionKicker><h3 className="font-display text-2xl font-extrabold">Balance over time</h3></div><DataBadge tone="slate">Monthly schedule</DataBadge></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece6" /><XAxis dataKey="period" tick={{ fill: "#78847f", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `₹${Math.round(value / 100000)}L`} tick={{ fill: "#78847f", fontSize: 10 }} axisLine={false} tickLine={false} width={38} /><Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e0e5df", fontSize: 12 }} /><Bar dataKey="balance" radius={[5, 5, 0, 0]}>{chartData.map((_, index) => <Cell key={index} fill={accent[index % accent.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf0ea] pt-4 sm:grid-cols-3"><div><p className="text-[11px] text-[#7e8984]">Monthly EMI</p><p className="mt-1 font-bold">{money(result.emi)}</p></div><div><p className="text-[11px] text-[#7e8984]">Total interest</p><p className="mt-1 font-bold">{money(result.totalInterest)}</p></div><div><p className="text-[11px] text-[#7e8984]">Total repayment</p><p className="mt-1 font-bold">{money(result.totalRepayment)}</p></div></div></section></div>

            <section className="rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionKicker>Practical next steps</SectionKicker><h3 className="font-display text-2xl font-extrabold">Reduce the risk before you scale it.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7975]">A useful recommendation should tell the entrepreneur what to do next—not just how to feel about the idea.</p></div><DataBadge tone="green"><ShieldCheck size={12} /> Actionable by design</DataBadge></div><div className="mt-7 grid gap-4 lg:grid-cols-3">{result.mitigation.map((item, index) => <div key={item.title} className="rounded-2xl bg-[#f4f6f1] p-5"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173738] text-xs font-bold text-[#f2b64c]">0{index + 1}</span><span className="text-[10px] font-bold uppercase tracking-[.13em] text-[#75817b]">{item.tag}</span></div><h4 className="mt-6 font-display text-lg font-extrabold">{item.title}</h4><p className="mt-2 text-sm leading-6 text-[#697770]">{item.text}</p></div>)}</div></section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-3xl bg-[#fff7e5] p-6 shadow-soft sm:p-7"><div className="flex items-start gap-3"><MessageCircle className="mt-1 text-[#a6731f]" size={21} /><div><SectionKicker>Ask GramBiz AI</SectionKicker><h3 className="font-display text-2xl font-extrabold">Make the brief easier to understand.</h3><p className="mt-2 text-sm leading-6 text-[#756039]">Ask in your own words. The advisor explains the current result; it does not recalculate the financials.</p></div></div><div className="mt-6 flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && askAdvisor()} placeholder="Why is this business suitable for me?" className="min-w-0 flex-1 rounded-xl border border-[#e5d5ae] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#a99d80] focus:border-[#b57920] focus:ring-2 focus:ring-[#b57920]/10" /><button onClick={askAdvisor} className="rounded-xl bg-[#173738] px-4 py-3 text-sm font-bold text-white">Ask</button></div><div className="mt-4 rounded-2xl border border-[#ead9b2] bg-white/65 p-4 text-sm leading-6 text-[#6e5b35]"><span className="font-bold">Advisor:</span> {answer}</div><div className="mt-4 flex flex-wrap gap-2">{["Explain my EMI", "What are my biggest risks?", "Why this business?"].map((prompt) => <button key={prompt} onClick={() => { setQuestion(prompt); }} className="rounded-full border border-[#e5d5ae] px-3 py-1.5 text-xs font-semibold text-[#806a3d] hover:bg-white">{prompt}</button>)}</div></section><section className="rounded-3xl border border-[#e1e2d9] bg-white p-6 shadow-soft sm:p-7"><SectionKicker>Sources and caveat</SectionKicker><h3 className="font-display text-2xl font-extrabold">Keep the context visible.</h3><div className="mt-5 space-y-3">{result.sources.map((source) => <div key={source} className="flex items-start gap-3 rounded-xl bg-[#f5f6f1] p-3"><FileText size={15} className="mt-0.5 shrink-0 text-[#327e68]" /><span className="text-xs font-semibold text-[#65736e]">{source}</span></div>)}</div><p className="mt-5 text-xs leading-5 text-[#818d88]">This tool provides informational and analytical guidance. Actual loan eligibility, sanction, interest, repayment terms, and government-scheme benefits are subject to official rules and the concerned authority or lending institution.</p></section></div>

            <section className="overflow-hidden rounded-3xl border border-[#e1e2d9] bg-white shadow-soft"><div className="flex flex-col justify-between gap-4 border-b border-[#e6e7df] p-6 sm:flex-row sm:items-center sm:p-7"><div><SectionKicker>Repayment schedule</SectionKicker><h3 className="font-display text-2xl font-extrabold">A transparent view of the balance</h3></div><span className="text-xs font-semibold text-[#79857f]">Showing first 6 months</span></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#f5f6f1] text-[10px] font-bold uppercase tracking-[.12em] text-[#7b8781]"><tr><th className="px-6 py-3">Period</th><th className="px-6 py-3">Opening principal</th><th className="px-6 py-3">Interest</th><th className="px-6 py-3">Principal</th><th className="px-6 py-3">Payment</th><th className="px-6 py-3">Closing principal</th></tr></thead><tbody className="divide-y divide-[#edf0ea]">{result.schedule.slice(0, 6).map((row) => <tr key={row.month}><td className="px-6 py-4 font-bold text-[#315c55]">Month {row.month}</td><td className="px-6 py-4 text-[#687570]">{money(row.opening)}</td><td className="px-6 py-4 text-[#687570]">{money(row.interest)}</td><td className="px-6 py-4 text-[#687570]">{money(row.principal)}</td><td className="px-6 py-4 font-bold text-[#315c55]">{money(row.payment)}</td><td className="px-6 py-4 text-[#687570]">{money(row.closing)}</td></tr>)}</tbody></table></div></section>
          </div>}
        </div>
      </div>
    </main>}
  </div>;
}

const LOCATION_HINTS = [
  "Bodh Gaya, Gaya, Bihar", "Patna, Patna, Bihar", "Ranchi, Ranchi, Jharkhand",
  "Lucknow, Lucknow, Uttar Pradesh", "Jaipur, Jaipur, Rajasthan", "Bhubaneswar, Khordha, Odisha",
];
const LOCATION_OPTIONS: Record<string, string[]> = {
  State: ["Bihar", "Jharkhand", "Madhya Pradesh", "Odisha", "Rajasthan", "Uttar Pradesh"],
  District: ["Gaya", "Patna", "Sheopur", "Khordha", "Ranchi", "Jaipur", "Lucknow"],
  Pincode: ["824231", "823001", "800001", "476339", "751001", "302001", "226001"],
};
function Field({ label, value, onChange, placeholder, type = "text", prefix, helper }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; prefix?: string; helper?: string }) {
  const [focused, setFocused] = useState(false);
  const normalizedValue = value.trim().toLowerCase();
  const suggestions = value.length > 0 ? (LOCATION_OPTIONS[label] || []).filter((item) => item.toLowerCase().includes(normalizedValue) && item.toLowerCase() !== normalizedValue).slice(0, 5) : [];
  return <div><label className="mb-2 block text-sm font-bold text-[#38514b]">{label}</label><div className="relative"><div className="relative">{prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#7b8681]">{prefix}</span>}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") setFocused(false); }} placeholder={placeholder} className={`w-full rounded-xl border border-[#dfe3da] bg-[#fcfcf9] px-4 py-3.5 text-sm text-[#173738] outline-none transition-shadow placeholder:text-[#a3aca7] focus:border-[#327e68] focus:ring-4 focus:ring-[#327e68]/10 ${prefix ? "pl-9" : ""}`} />{focused && suggestions.length > 0 && <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[#dfe3da] bg-white shadow-lift">{suggestions.map((suggestion) => <button key={suggestion} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(suggestion.split(",")[0]); setFocused(false); }} className="block w-full border-b border-[#edf0ea] px-3 py-2.5 text-left text-xs font-semibold text-[#53635d] last:border-0 hover:bg-[#f3f6f0]">{suggestion}</button>)}</div>}</div></div>{helper && <p className="mt-2 text-xs leading-5 text-[#87918c]">{helper}</p>}</div>;
}

function MoneyStep({ label, value, note }: { label: string; value: string; note: string }) { return <div className="rounded-2xl bg-[#f5f6f1] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#78847e]">{label}</p><p className="mt-2 font-display text-xl font-extrabold text-[#173738]">{value}</p><p className="mt-1 text-[11px] font-semibold text-[#327e68]">{note}</p></div>; }
function SnapshotRow({ label, value, width, color }: { label: string; value: string; width: number; color: string }) { return <div><div className="mb-2 flex justify-between text-xs"><span className="font-bold text-[#5f6e68]">{label}</span><span className="font-bold text-[#315c55]">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0ea]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(12, Math.min(100, width))}%` }} /></div></div>; }
