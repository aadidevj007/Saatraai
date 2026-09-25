"use client";

import { useEffect, useState } from "react";
import { getApiHealth, type HealthResponse } from "@/lib/api";

type Hypothesis = {
  id: string;
  title: string;
  status: "UNTESTED" | "INSUFFICIENT EVIDENCE";
  detail: string;
  tone: "cyan" | "amber" | "slate";
};

const hypotheses: Hypothesis[] = [
  {
    id: "H1",
    title: "Rainfall intensity changed",
    status: "UNTESTED",
    detail: "Requires a configured rainfall source for the selected period.",
    tone: "cyan",
  },
  {
    id: "H2",
    title: "Built-up area increased",
    status: "UNTESTED",
    detail: "Requires cloud-free optical scenes and a land-cover analysis.",
    tone: "amber",
  },
  {
    id: "H3",
    title: "Terrain concentrates runoff",
    status: "INSUFFICIENT EVIDENCE",
    detail: "DEM and drainage evidence are not configured in this workspace.",
    tone: "slate",
  },
];

const timeline = ["2022", "2023", "2024", "2025", "2026"];

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState(
    "Why has flooding increased in this region between 2022 and 2026?",
  );
  const [activeYear, setActiveYear] = useState("2026");
  const [activeHypothesis, setActiveHypothesis] = useState("H1");

  useEffect(() => {
    getApiHealth()
      .then(setHealth)
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

  return (
    <main className="min-h-screen bg-[#071019] text-slate-100">
      <header className="border-b border-white/10 bg-[#091521]/90 px-5 py-4 lg:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <button className="text-left" onClick={() => setStarted(false)}>
            <span className="block text-lg font-semibold tracking-[0.18em] text-white">SAATRAAI</span>
            <span className="hidden text-[10px] uppercase tracking-[0.28em] text-cyan-300/65 sm:block">Observe. Investigate. Verify. Explain.</span>
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${health ? "bg-emerald-400" : error ? "bg-rose-400" : "bg-amber-400"}`} />
            {health ? "API ONLINE" : error ? "API OFFLINE" : "API CONNECTING"}
            <span className="hidden rounded border border-amber-400/25 bg-amber-400/10 px-2 py-1 uppercase tracking-wider text-amber-200 sm:inline">Demo mode</span>
          </div>
        </div>
      </header>

      {!started ? (
        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1500px] items-center gap-12 px-5 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.38em] text-cyan-300/70">Autonomous Earth observation investigation</p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-white md:text-7xl">Ask questions about Earth.<br /><span className="text-cyan-300">Investigate the evidence.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">SAATRAAI turns a remote-sensing question into a structured investigation with competing hypotheses, multimodal evidence, contradiction search, and explicit uncertainty.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => setStarted(true)} className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#061018] transition hover:bg-cyan-200">Start investigation</button>
              <button onClick={() => setStarted(true)} className="rounded-lg border border-white/15 px-5 py-3 text-sm text-slate-200 transition hover:border-cyan-300/60">Explore demo</button>
            </div>
            <p className="mt-5 text-xs text-slate-500">Demo values are visibly marked. No satellite findings are claimed without a configured provider.</p>
          </div>
          <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0b202c] p-6 shadow-2xl shadow-cyan-950/20">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(103,232,249,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.12)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="relative flex h-full min-h-[350px] items-center justify-center">
              <div className="h-64 w-64 rounded-full border border-cyan-200/50 bg-[radial-gradient(circle_at_35%_30%,#286b78,#0d313e_54%,#06141e_72%)] shadow-[0_0_90px_rgba(34,211,238,.25)]" />
              <div className="absolute left-[18%] top-[31%] h-28 w-44 rotate-[-12deg] border-2 border-dashed border-amber-300/80" />
              <div className="absolute right-8 top-8 rounded border border-white/15 bg-[#08131dcc] p-3 text-[10px] uppercase tracking-wider text-cyan-200">Evidence graph ready</div>
              <div className="absolute bottom-8 left-8 rounded border border-white/15 bg-[#08131dcc] p-3 text-[10px] uppercase tracking-wider text-slate-300">ROI / temporal layers / demo</div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-[1500px] px-5 py-6 lg:px-10">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">Investigation workspace / demo data</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Flooding increase investigation</h1>
            </div>
            <div className="flex gap-2 text-xs text-slate-400"><span className="rounded border border-white/10 px-3 py-2">Region: Virudhunagar</span><span className="rounded border border-white/10 px-3 py-2">2022 — 2026</span><span className="rounded border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-amber-200">DEMO DATA</span></div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[280px_minmax(420px,1fr)_350px]">
            <aside className="space-y-5">
              <section className="rounded-xl border border-white/10 bg-[#0b1722] p-4">
                <label htmlFor="question" className="text-xs uppercase tracking-[0.2em] text-slate-500">Investigation question</label>
                <textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-3 min-h-28 w-full resize-none rounded-lg border border-white/10 bg-[#071019] p-3 text-sm leading-6 text-slate-200 outline-none focus:border-cyan-300/60" />
                <button className="mt-3 w-full rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-300/10">Interpret query</button>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0b1722] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Interpreted query</p>
                <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Intent</dt><dd className="text-slate-200">Flood change investigation</dd></div><div><dt className="text-slate-500">Required evidence</dt><dd className="text-slate-200">SAR, rainfall, terrain, land cover</dd></div><div><dt className="text-slate-500">Status</dt><dd className="text-amber-200">Awaiting configured providers</dd></div></dl>
              </section>
              <section className="rounded-xl border border-white/10 bg-[#0b1722] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workflow</p>
                <ol className="mt-4 space-y-3 text-xs text-slate-400"><li className="text-emerald-300">01 Query interpreted</li><li className="text-emerald-300">02 Hypotheses proposed</li><li className="text-amber-200">03 Evidence plan pending</li><li>04 Contradiction search</li><li>05 Explainable conclusion</li></ol>
              </section>
            </aside>

            <section className="min-w-0 rounded-xl border border-white/10 bg-[#0b1722] p-4">
              <div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Spatial evidence canvas</p><p className="mt-1 text-sm text-slate-300">ROI and layer state, not processed imagery</p></div><button className="rounded border border-white/10 px-3 py-2 text-xs text-slate-300">Layers</button></div>
              <div className="relative min-h-[480px] overflow-hidden rounded-lg border border-cyan-300/15 bg-[#0a202b] [background-image:linear-gradient(rgba(103,232,249,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.1)_1px,transparent_1px)] [background-size:34px_34px]">
                <div className="absolute inset-[13%_16%_17%_13%] rounded-[45%] border border-cyan-100/20 bg-[#14414a]/55" />
                <div className="absolute left-[25%] top-[28%] h-44 w-64 rotate-[-9deg] border-2 border-dashed border-amber-300/80" />
                <div className="absolute left-[42%] top-[39%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_24px_8px_rgba(103,232,249,.3)]" />
                <div className="absolute bottom-4 left-4 rounded border border-white/10 bg-[#071019dd] px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400">Demo ROI · 9.58°N, 77.96°E</div>
                <div className="absolute right-4 top-4 space-y-2 text-[10px] uppercase tracking-wider"><div className="rounded border border-white/10 bg-[#071019dd] px-3 py-2 text-cyan-200">ROI boundary</div><div className="rounded border border-white/10 bg-[#071019dd] px-3 py-2 text-amber-200">Change layer unavailable</div></div>
              </div>
              <div className="mt-4 flex items-center gap-2 overflow-x-auto">{timeline.map((year) => <button key={year} onClick={() => setActiveYear(year)} className={`min-w-16 rounded border px-3 py-2 text-xs ${activeYear === year ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-500 hover:text-slate-300"}`}>{year}</button>)}</div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-xl border border-white/10 bg-[#0b1722] p-4"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hypotheses</p><span className="text-xs text-slate-500">3 proposed</span></div><div className="mt-3 space-y-2">{hypotheses.map((hypothesis) => <button key={hypothesis.id} onClick={() => setActiveHypothesis(hypothesis.id)} className={`w-full rounded-lg border p-3 text-left ${activeHypothesis === hypothesis.id ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-[#071019]"}`}><div className="flex justify-between gap-2"><span className="text-sm text-white">{hypothesis.id} · {hypothesis.title}</span><span className={`text-[10px] ${hypothesis.tone === "amber" ? "text-amber-200" : hypothesis.tone === "cyan" ? "text-cyan-200" : "text-slate-400"}`}>{hypothesis.status}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{hypothesis.detail}</p></button>)}</div></section>
              <section className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Evidence completeness</p><p className="mt-2 text-3xl font-semibold text-amber-100">Insufficient</p><p className="mt-2 text-xs leading-5 text-slate-400">No provider has been configured. Required evidence is unavailable, not negative.</p><div className="mt-4 space-y-2 text-xs text-slate-400"><p>○ Sentinel-1 flood extent</p><p>○ Rainfall time series</p><p>○ DEM and drainage</p></div></section>
              <section className="rounded-xl border border-white/10 bg-[#0b1722] p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Conclusion</p><p className="mt-3 text-sm leading-6 text-slate-300">Available evidence is insufficient to determine why flooding increased. Configure data providers to begin analysis.</p></section>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
