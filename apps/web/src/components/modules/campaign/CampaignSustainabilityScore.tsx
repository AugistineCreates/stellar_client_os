"use client";

import React, { useMemo } from "react";
import { Leaf, Sun, Droplets, Bug, Sparkles, Info } from "lucide-react";

export interface CampaignSustainabilityInput {
  /** Number of distinct tree species in the campaign. */
  treeSpeciesDiversity?: number;
  /** Region climate impact score (0-100). */
  regionClimateImpact?: number;
  /** Soil health improvement score (0-100). */
  soilHealthImprovement?: number;
  /** Biodiversity potential score (0-100). */
  biodiversityPotential?: number;
  /** Number of trees planted (optional, used to scale diversity). */
  treesPlanted?: number;
}

export interface CampaignSustainabilityScoreProps {
  /** Raw input metrics for the campaign. */
  input?: CampaignSustainabilityInput;
  /** Optional pre-computed score (0-100). */
  score?: number;
  /** Optional className for the wrapper. */
  className?: string;
}

const DIMENSIONS = [
  { key: "treeSpeciesDiversity", label: "Tree Species Diversity", weight: 0.25, icon: Leaf },
  { key: "regionClimateImpact", label: "Region Climate Impact", weight: 0.3, icon: Sun },
  { key: "soilHealthImprovement", label: "Soil Health Improvement", weight: 0.2, icon: Droplets },
  { key: "biodiversityPotential", label: "Biodiversity Potential", weight: 0.25, icon: Bug },
] as const;

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

/**
 * Normalize the number of tree species into a 0-100 score.
 * 1 species => 20, 5 => 60, 10+ => 100.
 */
export const normalizeSpeciesDiversity = (species: number): number => {
  if (!Number.finite(species) || species <= 0) return 0;
  return clamp(20 + (species - 1) * 10);
};

export const computeSustainabilityScore = (input: CampaignSustainabilityInput): number => {
  const {
    treeSpeciesDiversity = 0,
    regionClimateImpact = 0,
    soilHealthImprovement = 0,
    biodiversityPotential = 0,
  } = input;

  const dividend = normalizeSpeciesDiversity(treeSpeciesDiversity);
  const weighted =
    dividend * 0.25 +
    clamp(regionClimateImpact) * 0.3 +
    clamp(soilHealthImprovement) * 0.2 +
    clamp(biodiversityPotential) * 0.25;

  return Math.round(clamp(weighted));
};

const getScoreColor = (score: number) => {
  if (score >= 80) return { text: "text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/30" };
  if (score >= 60) return { text: "text-lime-400", bar: "bg-lime-500", border: "border-lime-500/30" };
  if (score >= 40) return { text: "text-amber-400", bar: "bg-amber-500", border: "border-amber-500/30" };
  return { text: "text-rose-400", bar: "bg-rose-500", border: "border-rose-500/30" };
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  if (score > 0) return "Needs Improvement";
  return "Not Rated";
};

export const CampaignSustainabilityScore: React.FC < CampaignSustainabilityScoreProps> = ({
  input,
  score,
  className,
}) => {
  const resolvedInput = input ?? {};
  const computedScore = useMemo(() => {
    if (typeof score === "number") return clamp(Math.round(score));
    return computeSustainabilityScore(resolvedInput);
  }, [score, resolvedInput]);

  const colors = getScoreColor(computedScore);
  const label = getScoreLabel(computedScore);

  const dimensionValues = useMemo(() => {
    const {
      treeSpeciesDiversity = 0,
      regionClimateImpact = 0,
      soilHealthImprovement = 0,
      biodiversityPotential = 0,
    } = resolvedInput;
    return {
      treeSpeciesDiversity: normalizeSpeciesDiversity(treeSpeciesDiversity),
      regionClimateImpact: clamp(regionClimateImpact),
      soilHealthImprovement: clamp(soilHealthImprovement),
      biodiversityPotential: clamp(biodiversityPotential),
    };
  }, [resolvedInput]);

  return (
    <div
      className={`rounded-2xl bg-slate-900/90 border ${colors.border} p-6 sm:p-8 backdrop-blur-md space-6 ${className ?? ""}`}
      data-testid="campaign-sustainability-score"
    >
      <div class>Name="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center justify-center size-10 rounded-xl bg-zinc-950/80 border ${colors.border}`}>
            <Sparkles className={`size-5${colors.text}`} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Environmental Index</h2>
            <p className="text-[11px] text-zinc-400">Campaign Sustainability Score</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black tracking-tight ${colors.text}`}>
            {computedScore}
          </span>
          <span className="text-xs font-semibold text-zinc-400">/100</span>
        </div>
      </div>

      <div className="space-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">{label}</span>
          <span className="text-zinc-500">Weighted across 4 dimensions</span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={computedScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Campaign sustainability score ${computedScore} out of 100`}
        >
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${computedScore}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols1-sm:grid-cols-2 gap-3">
        {DIMENSIONS.map((dimension) => {
          const value = dimensionValues[dimension.key as keyof typeof dimensionValues];
          const Icon = dimension.icon;
          return (
            <div key={dimension.key} className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-3 space-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Icon className={`size-3.5${colors.text}`} />
                  <span className="font-semibold">{dimension.label}</span>
                </div>
                <span className="text-xs font-bold text-zinc-100">{value}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bar}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Weight {Math.round(dimension.weight * 100)}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-zinc-400">
        <Info className="size-3.5 text-emerald-400 shrink-0" />
        <span>
          Score is derived from tree species diversity, region climate impact,
          soil health improvement, and biodiversity potential.
        </span>
      </div>
    </div>
  );
};

export default CampaignSustainabilityScore;
