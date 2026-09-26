"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { calculateSponsorshipPricing } from "@/services/campaign-sponsorship.service";

const trees = [
  { id: "tree-001", label: "Amazonia restoration", location: "Para, Brazil", impact: 48 },
  { id: "tree-002", label: "Mangrove recovery", location: "Mida Creek, Kenya", impact: 31 },
  { id: "tree-003", label: "Native woodland", location: "Baja, Mexico", impact: 22 },
  { id: "tree-004", label: "Riparian buffer", location: "Murray-Darling, Australia", impact: 36 },
];

const steps = ["Select trees", "Enter amount", "Preview", "Confirm"];

export default function SponsorCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [treeCount, setTreeCount] = useState("1");
  const [amount, setAmount] = useState("");
  const [sponsorAddress, setSponsorAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const numericTreeCount = Number(treeCount);
  const numericAmount = Number(amount);
  const pricing = useMemo(() => {
    try {
      return calculateSponsorshipPricing(amount, numericTreeCount);
    } catch {
      return null;
    }
  }, [amount, numericTreeCount]);
  const totalImpact = selected.reduce((sum, treeId) => sum + (trees.find((tree) => tree.id === treeId)?.impact ?? 0), 0);

  const toggleTree = (treeId: string) => {
    setSelected((current) => current.includes(treeId) ? current.filter((id) => id !== treeId) : [...current, treeId]);
  };

  const next = () => {
    setError("");
    if (step === 1 && (!Number.isSafeInteger(numericTreeCount) || numericTreeCount < 1)) return setError("Enter a positive whole-tree quantity.");
    if (step === 2 && (!Number.isFinite(numericAmount) || numericAmount <= 0 || !pricing)) return setError("Enter a contribution greater than zero.");
    setStep((current) => Math.min(4, current + 1));
  };

  const submit = async () => {
    setError("");
    if (!sponsorAddress.trim()) return setError("Enter the sponsor wallet address before confirming.");
    if (!pricing) return setError("Enter a valid contribution amount.");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/backers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backerAddress: sponsorAddress.trim(),
          grossAmount: pricing.grossAmount,
          amount: pricing.netAmount,
          treeCount: numericTreeCount,
          selectedTreeIds: selected,
          token: "USDC",
          idempotencyKey: `${id}:${sponsorAddress.trim().toLowerCase()}:${pricing.grossAmount}:${numericTreeCount}`,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Contribution could not be recorded");
      setConfirmed(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Contribution could not be recorded");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-full w-full max-w-4xl px-6 py-12 text-white">
      <div className="mb-10">
        <p className="text-sm font-medium text-emerald-300">Campaign {id}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sponsor a living forest</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">Bulk sponsorship discounts are calculated and validated by the server.</p>
      </div>
      <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Sponsorship steps">
        {steps.map((label, index) => { const number = index + 1; return <li key={label} className={`border-b-2 pb-3 text-sm ${number <= step ? "border-emerald-400 text-emerald-300" : "border-white/10 text-slate-500"}`}><span className="mr-2">{number}.</span>{label}</li>; })}
      </ol>
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        {step === 1 && <div><h2 className="text-xl font-semibold">Select trees</h2><p className="mt-2 text-sm text-slate-400">Choose examples to associate with your sponsorship, then set the total tree quantity for tier pricing.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{trees.map((tree) => <label key={tree.id} className={`cursor-pointer rounded-xl border p-4 transition ${selected.includes(tree.id) ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-black/20 hover:border-white/30"}`}><input type="checkbox" className="sr-only" checked={selected.includes(tree.id)} onChange={() => toggleTree(tree.id)} /><div className="flex items-start justify-between gap-3"><span className="font-medium">{tree.label}</span><span className="text-xs text-emerald-300">{selected.includes(tree.id) ? "Selected" : "Select"}</span></div><p className="mt-2 text-xs text-slate-400">{tree.location} · Estimated impact {tree.impact} kg CO₂e</p></label>)}</div><label htmlFor="tree-count" className="mt-6 block text-sm text-slate-300">Total trees sponsored</label><input id="tree-count" type="number" min="1" step="1" value={treeCount} onChange={(event) => setTreeCount(event.target.value)} className="mt-2 max-w-xs rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none" /></div>}
        {step === 2 && <div><h2 className="text-xl font-semibold">Enter amount</h2><label htmlFor="amount" className="mt-8 block text-sm text-slate-300">Gross contribution amount</label><div className="mt-2 flex max-w-md items-center rounded-xl border border-white/10 bg-black/20 px-4"><span className="text-slate-400">USDC</span><input id="amount" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full bg-transparent px-4 py-4 text-2xl outline-none" placeholder="0.00" /></div><p className="mt-3 text-xs text-slate-500">{numericTreeCount} trees · tier discounts are applied at confirmation.</p></div>}
        {step === 3 && <div><h2 className="text-xl font-semibold">Preview contribution</h2><dl className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10"><div className="flex justify-between p-4 text-sm"><dt className="text-slate-400">Trees selected</dt><dd>{numericTreeCount}</dd></div><div className="flex justify-between p-4 text-sm"><dt className="text-slate-400">Discount tier</dt><dd>{pricing?.tier ?? "—"}</dd></div><div className="flex justify-between p-4 text-sm"><dt className="text-slate-400">Gross contribution</dt><dd>{pricing?.grossAmount ?? "—"} USDC</dd></div><div className="flex justify-between p-4 text-sm"><dt className="text-slate-400">Discount</dt><dd>{pricing ? `${pricing.discountPercent}% (${pricing.discountAmount} USDC)` : "—"}</dd></div><div className="flex justify-between p-4 text-sm"><dt className="text-slate-400">Net contribution</dt><dd>{pricing?.netAmount ?? "—"} USDC</dd></div><div className="flex justify-between p-4 text-sm"><dt className="text-slate-400">Estimated selected impact</dt><dd>{totalImpact} kg CO₂e</dd></div></dl></div>}
        {step === 4 && <div><h2 className="text-xl font-semibold">Confirm contribution</h2>{confirmed ? <div className="mt-8 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-emerald-200">Contribution recorded with the {pricing?.tier} discount tier.</div> : <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-5"><label htmlFor="sponsor-address" className="text-sm text-slate-300">Sponsor wallet address</label><input id="sponsor-address" value={sponsorAddress} onChange={(event) => setSponsorAddress(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 outline-none" placeholder="G..." /><button type="button" disabled={submitting} onClick={submit} className="mt-5 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-50">{submitting ? "Recording…" : "Confirm in wallet"}</button></div>}</div>}
        {error && <p role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {!confirmed && <div className="mt-8 flex justify-between"><button type="button" onClick={() => { setError(""); setStep((current) => Math.max(1, current - 1)); }} disabled={step === 1} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:cursor-not-allowed disabled:opacity-30">Back</button>{step < 4 && <button type="button" onClick={next} className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-200">Continue</button>}</div>}
      </section>
    </main>
  );
}

export const dynamic = "force-dynamic";
