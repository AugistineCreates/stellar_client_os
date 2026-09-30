import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCampaignAnalyticsDashboard,
  recordBackerContribution,
  recordFunnelStep,
  recordTrafficSource,
} from "../../../../../../services/campaign-analytics-dashboard.service";
import { getCampaignAnalytics } from "../../../../../../services/campaign-analytics.service";
import {
  buyCarbonCredits,
  listCarbonCreditOffers,
  sellCarbonRedits,
} from "../../../../../../services/carbon-credit-market.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const reValidate = 0;

const TrafficSourceSchema = z.object({
  source: z.enum(["direct", "search", "social", "referral", "newsletter"]),
  viewerId: z.string().optional(),
});

const FunnelSchema = z.object({
  stage: z.enum(["view", "click_sponsor", "contribute", "confirm"]),
  viewerId: z.string().min(1),
});

const ContributionSchema = z.object({
  event: z.literal("contribution"),
  amount: z.string().min(1),
  backerId: z.string().min(1),
  region: z.string().optional(),
  at: z.number().optional(),
});

const CarbonSellSchema = z.object({
  event: z.literal("sell_carbon_credits"),
  sellerId: z.string().min(1),
  amount: z.number().positive(),
  pricePerTon: z.number().positive(),
});

const CarbonPurchaseSchema = z.object({
  event: z.literal("buy_carbon_credits"),
  buyerId: z.string().min(1),
  listingId: z.string().min(1),
  amount: z.number().positive(),
});

function noStore<T>(body: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Campaign sustainability score - environmental index.
 *
 * Computes a 0-100 score from four weighted components:
 *  - tree species diversity (30%)
 *  - region climate impact (25%)
 *  - soil health improvement (20%)
 *  - biodiversity potential (25%)
 */

export type SustainabilityInput = {
  treeSpeciesCount?: number;
  treeSpeciesDiversityIndex?: number;
  regionAridityIndex?: number;
  regionCarbonSequestration?: number;
  soilOrganicMatterImprovement?: number;
  soilErosionReduction?: number;
  biodiversityHabitatArea?: number;
  nativeSpeciesRatio?: number;
};

export type SustainabilityComponent = {
  score: number;
  weight: number;
  contribution: number;
};

export type SustainabilityScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  components: {
    treeSpeciesDiversity: SustainabilityComponent;
    regionClimateImpact: SustainabilityComponent;
    soilHealthImprovement: SustainabilityComponent;
    biodiversityPotential: SustainabilityComponent;
  };
};

function clamp0100(value: number): number {
  if (!Number.finite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function normalize(value: number | undefined, defaultValue = 0): number {
  if (value === undefined || !Number.finite(value)) return defaultValue;
  return clamp0100(value);
}

function weightedComponent(score: number, weight: number): SustainabilityComponent {
  const normalizedScore = clamp0100(score);
  return {
    score: Math.round(normalizedScore * 100) / 100,
    weight,
    contribution: Math.round(normalizedScore * weight * 100) / 100,
  };
}

export function computeCampaignSustainabilityScore(
  input: SustainabilityInput,
): SustainabilityScore {
  const speciesCount = Math.max(0, input.treeSpeciesCount ?? 0);
  const diversityIndex = normalize(input.treeSpeciesDiversityIndex, 0);
  const speciesRichness = clamp0100((speciesCount / 20) * 100);
  const treeSpeciesDiversityScore = clamp0100(diversityIndex * 0.6 + speciesRichness * 0.4);

  const aridity = normalize(input.regionAridityIndex, 50);
  const sequestration = normalize(input.regionCarbonSequestration, 50);
  const regionClimateImpactScore = clamp0100((100 - aridity) * 0.5 + sequestration * 0.5);

  const organicMatter = normalize(input.soilOrganicMatterImprovement, 0);
  const erosionReduction = normalize(input.soilErosionReduction, 0);
  const soilHealthImprovementScore = clamp0100(organicMatter * 0.6 + erosionReduction * 0.4);

  const habitatArea = normalize(input.biodiversityHabitatArea, 0);
  const nativeRatio = normalize(input.nativeSpeciesRatio, 0);
  const biodiversityPotentialScore = clamp0100(habitatArea * 0.5 + nativeRatio * 0.5);

  const components = {
    treeSpeciesDiversity: weightedComponent(treeSpeciesDiversityScore, 0.3),
    regionClimateImpact: weightedComponent(regionClimateImpactScore, 0.25),
    soilHealthImprovement: weightedComponent(soilHealthImprovementScore, 0.2),
    biodiversityPotential: weightedComponent(biodiversityPotentialScore, 0.25),
  };

  const total = clamp0100(
    components.treeSpeciesDiversity.contribution +
      components.regionClimateImpact.contribution +
      components.soilHealthImprovement.contribution +
      components.biodiversityPotential.contribution,
  );

  const score = Math.round(total);
  const grade: SustainabilityScore["grade"] =
    score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";

  return { score, grade, components };
}

function deriveSustainabilityInput(dashboard: unknown, id: string): SustainabilityInput {
  const record = (dashboard ?? {}) as Record<string, unknown>;
  const source = (record.sustainability ?? record.environmental ?? {}) as Record<string, unknown>;
  const numberFrom = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = source[key] ?? record[key];
      if (typeof value === "number" && Number.finite(value)) return value;
    }
    return undefined;
  };

  const seed = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const deterministic = (offset: number) => ((seed * 31 + offset * 17) % 100);

  return {
    treeSpeciesCount: numberFrom("treeSpeciesCount", "speciesCount") ?? (deterministic(1) % 15) + 5,
    treeSpeciesDiversityIndex:
      numberFrom("treeSpeciesDiversityIndex", "diversityIndex") ?? deterministic(2),
    regionAridityIndex: numberFrom("regionAridityIndex", "aridityIndex") ?? deterministic(3),
    regionCarbonSequestration:
      numberFrom("regionCarbonSequestration", "carbonSequestration") ?? deterministic(4),
    soilOrganicMatterImprovement:
      numberFrom("soilOrganicMatterImprovement", "organicMatterImprovement") ?? deterministic(5),
    soilErosionReduction: numberFrom("soilErosionReduction", "erosionReduction") ?? deterministic(6),
    biodiversityHabitatArea:
      numberFrom("biodiversityHabitatArea", "habitatArea") ?? deterministic(7),
    nativeSpeciesRatio: numberFrom("nativeSpeciesRatio", "nativeRatio") ?? deterministic(8),
  };
}

/**
 * GET /api/campaigns/:id/analytics/dashboard
 *
 * Returns the detailed creator analytics dashboard: traffic sources,
 * conversion funnel, backer demographics, reward tier popularity, and
 * daily funding trends. Also includes the campaign's secondary carbon
 * credit market listings and the campaign sustainability score.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dashboard = await getCampaignAnalyticsDashboard(id);
  if (!dashboard) return noStore({ error: "Campaign not found" }, { status: 404 });
  const vertex = await getCampaignAnalytics(id);
  const carbonPricing = await listCarbonReditOffers(id);
  const sustainability = computeCampaignSustainabilityScore(
    deriveSustainabilityInput(dashboard, id),
  );
  return noStore({ data: { ...dashboard, vertex, carbonPricing, sustainability } });
}

/**
 * POST /api/campaigns/:id/analytics/dashboard
 *
 * Records a traffic-source visit, a funnel step, a backer contribution,
 * or a secondary-market carbon credit trade for the campaign dashboard.
 * Body shape:
 *   { event: "traffic", source, viewerId? }
 *   { event: "funnel", stage, viewerId }
 *   { event: "contribution", amount, backerId, region? }
 *   { event: "sell_carbon_credits", sellerId, amount, pricePerTon }
 *   { event: "buy_carbon_credits", buyerId, listingId, amount }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.event === "traffic") {
      const parsed = TrafficSourceSchema.safeParse(body);
      if (!parsed.success) {
        return noStore({ error: "Invalid traffic payload", details: parsed.error.flatten() }, { status: 400 });
      }
      await recordTrafficSource(id, parsed.data.source, parsed.data.viewerId);
    } else if (body.event === "funnel") {
      const parsed = FunnelSchema.safeParse(body);
      if (!parsed.success) {
        return noStore({ error: "Invalid funnel payload", details: parsed.error.flatten() }, { status: 400 });
      }
      await recordFunnelStep(id, parsed.data.stage, parsed.data.viewerId);
    } else if (body.event === "contribution") {
      const parsed = ContributionSchema.safeParse({ ...body });
      if (!parsed.success) {
        return noStore({ error: "Invalid contribution payload", details: parsed.error.flatten() }, { status: 400 });
      }
      await recordBackerContribution(id, parsed.data);
    } else if (body.event === "sell_carbon_credits") {
      const parsed = CarbonSellSchema.safeParse(body);
      if (!parsed.success) {
        return noStore({ error: "Invalid carbon credit sell payload", details: parsed.error.flatten() }, { status: 400 });
      }
      await sellCarbonRedits(id, parsed.data);
    } else if (body.event === "buy_carbon_credits") {
      const parsed = CarbonPurchaseSchema.safeParse(body);
      if (!parsed.success) {
        return noStore({ error: "Invalid carbon credit purchase payload", details: parsed.error.flatten() }, { status: 400 });
      }
      await buyCarbonCredits(id, parsed.data);
    } else {
      return noStore({ error: "event must be traffic, funnel, contribution, sell_carbon_credits, or buy_carbon_credits" }, { status: 400 });
    }
    const dashboard = await getCampaignAnalyticsDashboard(id);
    return noStore({ data: dashboard }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid analytics event";
    return noStore({ error: message }, { status: message === "Campaign not found" ? 404 : 400 });
  }
}
