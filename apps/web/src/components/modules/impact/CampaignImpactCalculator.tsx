"use client";

import { useMemo, useState, useEffect } from "react";
import AppSelect from "@/components/molecules/AppSelect";
import { Input } from "@/components/ui/input";
import {
  calculateCo2Offset,
  DEFAULT_SPECIES_ID,
  TREE_SPECIES,
} from "@/lib/co2-impact";

const SPECIES_OPTIONS = TREE_SPECIES.map((species) => ({
  label: species.label,
  value: species.id,
}));

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

export interface CampaignImpactCalculatorProps {
  campaignSpeciesId?: string;
  campaignTreeCount?: number;
  readOnly?: boolean;
}

export function CampaignImpactCalculator({
  campaignSpeciesId,
  campaignTreeCount,
  readOnly,
}: CampaignImpactCalculatorProps = {}) {
  const [speciesId, setSpeciesId] = useState<string>(campaignSpeciesId || DEFAULT_SPECIES_ID);
  const [quantity, setQuantity] = useState<string>(campaignTreeCount?.toString() || "10");
  const [growthRate, setGrowthRate] = useState<string>("1.0");

  useEffect(() => {
    if (campaignSpeciesId && TREE_SPECIES.find((s) => s.id === campaignSpeciesId.toLowerCase())) {
      setSpeciesId(campaignSpeciesId.toLowerCase());
    }
  }, [campaignSpeciesId]);

  useEffect(() => {
    if (campaignTreeCount !== undefined) {
      setQuantity(campaignTreeCount.toString());
    }
  }, [campaignTreeCount]);

  const parsedQuantity = Number.parseInt(quantity, 10);
  const quantityValue = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
  
  const parsedGrowthRate = Number.parseFloat(growthRate);
  const growthRateValue = Number.isFinite(parsedGrowthRate) && parsedGrowthRate > 0 ? parsedGrowthRate : 1.0;

  const result = useMemo(
    () => calculateCo2Offset(speciesId, quantityValue, undefined, growthRateValue),
    [speciesId, quantityValue, growthRateValue],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">
          Real-Time CO2 Sequestration (v2)
        </h2>
        <p className="text-sm text-zinc-400">
          Projected CO2 offset based on tree count, species, and estimated growth rate. Updates as contributions arrive.
        </p>
      </div>

      {!readOnly && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-1.5 ml-1 text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Tree species
            </p>
            <AppSelect
              options={SPECIES_OPTIONS}
              value={speciesId}
              setValue={setSpeciesId}
              placeholder="Select a species"
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label
              htmlFor="co2-quantity"
              className="mb-1.5 ml-1 block text-xs font-medium uppercase tracking-[0.08em] text-zinc-500"
            >
              Number of trees
            </label>
            <Input
              id="co2-quantity"
              type="number"
              min={0}
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label
              htmlFor="growth-rate"
              className="mb-1.5 ml-1 block text-xs font-medium uppercase tracking-[0.08em] text-zinc-500"
            >
              Est. Growth Rate
            </label>
            <Input
              id="growth-rate"
              type="number"
              step="0.1"
              min="0.1"
              inputMode="decimal"
              value={growthRate}
              onChange={(event) => setGrowthRate(event.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
        </div>
      )}

      {readOnly && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-1.5 ml-1 text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Est. Growth Rate Mult.
            </p>
            <Input
              id="growth-rate-readonly"
              type="number"
              step="0.1"
              min="0.1"
              inputMode="decimal"
              value={growthRate}
              onChange={(event) => setGrowthRate(event.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-400">CO2 offset / year</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {formatNumber(result.co2PerYearKg)}
          </p>
          <p className="text-xs text-zinc-500">kg ≈ {formatNumber(result.co2PerYearTonnes, 2)} t</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-400">CO2 offset over 10 years</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {formatNumber(result.co2Over10YearsKg)}
          </p>
          <p className="text-xs text-zinc-500">kg ≈ {formatNumber(result.co2Over10YearsTonnes, 2)} t</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-400">Species</p>
          <p className="mt-1 text-2xl font-bold text-white">{result.speciesLabel}</p>
          <p className="text-xs text-zinc-500">
            {result.quantity} trees @ {result.co2PerTreePerYearKg} kg/tree/yr
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-400">🚗 Driving avoided / year</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatNumber(result.carKmEquivalentPerYear)}
          </p>
          <p className="text-xs text-zinc-500">km in an average car</p>
        </div>
      </div>
    </section>
  );
}

export default CampaignImpactCalculator;
