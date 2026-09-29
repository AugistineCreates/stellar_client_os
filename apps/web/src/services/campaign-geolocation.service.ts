/**
 * Campaign Geolocation Service — campaign geolocation, map all planting sites (v1)
 *
 * Turns the GPS coordinates stored on each campaign (`CampaignRecord.gpsLocations`)
 * into map-ready planting sites, so the UI can render every active planting
 * location on a global interactive map with tree counts and a species breakdown.
 *
 * The service is a pure function layer over `CampaignRecord` — campaigns in,
 * planting sites out — which keeps it trivially testable and independent of
 * any particular data source (in-memory, API, or contract).
 *
 * @example
 * import { getActivePlantingSites } from "@/services/campaign-geolocation.service";
 *
 * const sites = getActivePlantingSites(campaigns);
 * // → [{ id: "camp-101:site-0", campaignId: "camp-101", latitude: -3.5, …, treeCount: 500, species: ["Mangrove"] }]
 */

import type { CampaignRecord } from "./campaign.service";

/** A single GPS coordinate captured for a campaign's planting site. */
export interface CampaignGpsPoint {
  latitude: number;
  longitude: number;
  /** Optional timestamp of when the coordinate was captured on-site. */
  capturedAt?: number;
}

/** Latitude range guard used when validating coordinates. */
export const LATITUDE_MIN = -90;
/** Latitude range guard used when validating coordinates. */
export const LATITUDE_MAX = 90;
/** Longitude range guard used when validating coordinates. */
export const LONGITUDE_MIN = -180;
/** Longitude range guard used when validating coordinates. */
export const LONGITUDE_MAX = 180;

/** One point on the interactive planting map. */
export interface PlantingSite {
  /** Stable map-marker key, e.g. `camp-101:site-0`. */
  id: string;
  campaignId: string;
  campaignName: string;
  latitude: number;
  longitude: number;
  /**
   * Number of trees planted at this site. When a campaign records several
   * GPS points the campaign's total tree count is distributed across them
   * so the map total never overshoots the campaign's verified count.
   */
  treeCount: number;
  /** Species planted at this site, parsed from `campaign.treeSpecies`. */
  species: string[];
  /** Campaign lifecycle status, e.g. `ACTIVE`. */
  status: string;
  /** Broad region (e.g. "Africa") derived from the coordinates, if known. */
  region?: string;
  /** Free-text location label the creator provided, if any. */
  location?: string;
  raisedAmount: string;
  goalAmount: string;
}

/** Aggregate statistics shown above the planting map. */
export interface PlantingSitesStats {
  /** Total number of pins on the map (one per stored GPS point). */
  totalSites: number;
  /** Number of distinct campaigns represented on the map. */
  totalCampaigns: number;
  /** Sum of tree counts across all sites. */
  totalTrees: number;
  /** Trees per species, sorted most-common first. */
  speciesCounts: Array<{ species: string; count: number }>;
  /** Sites per region, sorted most-common first. */
  regions: Array<{ region: string; count: number }>;
}

/**
 * Parse a free-form `treeSpecies` string into a normalized species list.
 *
 * Accepts comma, semicolon and `/`-separated values and drops the trailing
 * "trees" word ("Mangrove trees" → "Mangrove") so the map legend can group
 * identical species planted under slightly different labels.
 */
export function parseTreeSpecies(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  const seen = new Set<string>();
  const species: string[] = [];
  for (const raw of value.split(/[,;/|]/)) {
    const normalized = raw
      .trim()
      .replace(/\s+trees?$/i, "")
      .replace(/\s+species$/i, "")
      .trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      species.push(normalized);
    }
  }
  return species;
}

/**
 * Distribute a campaign's total tree count across its recorded sites as
 * evenly as possible (largest remainder first).
 */
export function distributeTreeCount(total: number, parts: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || parts <= 0) {
    return new Array(Math.max(0, parts)).fill(0);
  }
  const count = Math.floor(total);
  const base = Math.floor(count / parts);
  const remainder = count % parts;
  return new Array(parts)
    .fill(0)
    .map((_, index) => base + (index < remainder ? 1 : 0));
}

/** Validate a single GPS point. Returns the point when valid, `null` otherwise. */
export function isValidGpsPoint(point: unknown): point is CampaignGpsPoint {
  if (!point || typeof point !== "object") return false;
  const candidate = point as { latitude?: unknown; longitude?: unknown };
  return (
    typeof candidate.latitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    candidate.latitude >= LATITUDE_MIN &&
    candidate.latitude <= LATITUDE_MAX &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.longitude) &&
    candidate.longitude >= LONGITUDE_MIN &&
    candidate.longitude <= LONGITUDE_MAX
  );
}

/**
 * Build map-ready planting sites from a list of campaigns.
 *
 * A campaign with no stored GPS coordinates produces no site (we cannot place
 * it on the map). A campaign with several coordinates produces one site per
 * point, with the campaign's total tree count distributed across them.
 */
export function getCampaignPlantingSites(
  campaigns: CampaignRecord[],
): PlantingSite[] {
  const sites: PlantingSite[] = [];
  for (const campaign of campaigns) {
    const points = (campaign.gpsLocations ?? []).filter(isValidGpsPoint);
    if (points.length === 0) continue;

    const treeCounts = distributeTreeCount(campaign.treeCount ?? 0, points.length);
    const species = parseTreeSpecies(campaign.treeSpecies);

    points.forEach((point, index) => {
      sites.push({
        id: `${campaign.id}:site-${index}`,
        campaignId: campaign.id,
        campaignName: campaign.name,
        latitude: point.latitude,
        longitude: point.longitude,
        treeCount: treeCounts[index] ?? 0,
        species,
        status: campaign.status,
        region: campaign.region,
        location: campaign.location,
        raisedAmount: campaign.raisedAmount,
        goalAmount: campaign.goalAmount,
      });
    });
  }
  return sites;
}

/** Restrict planting sites to campaigns whose lifecycle status is `ACTIVE`. */
export function getActivePlantingSites(
  campaigns: CampaignRecord[],
): PlantingSite[] {
  return getCampaignPlantingSites(
    campaigns.filter((campaign) => campaign.status === "ACTIVE"),
  );
}

/** Count sites per region, most-common first. */
export function countSitesByRegion(sites: PlantingSite[]): Array<{ region: string; count: number }> {
  const counts = new Map<string, number>();
  for (const site of sites) {
    const region = site.region?.trim() || "Unknown";
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}

/** Count planted trees per species across the given sites, most-common first. */
export function countTreesBySpecies(sites: PlantingSite[]): Array<{ species: string; count: number }> {
  const counts = new Map<string, number>();
  for (const site of sites) {
    if (site.species.length === 0) {
      counts.set("Unknown", (counts.get("Unknown") ?? 0) + site.treeCount);
      continue;
    }
    for (const species of site.species) {
      counts.set(species, (counts.get(species) ?? 0) + site.treeCount);
    }
  }
  return Array.from(counts.entries())
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count);
}

/** Summarize a set of planting sites for the map's stats header. */
export function summarizePlantingSites(sites: PlantingSite[]): PlantingSitesStats {
  const campaignIds = new Set(sites.map((site) => site.campaignId));
  return {
    totalSites: sites.length,
    totalCampaigns: campaignIds.size,
    totalTrees: sites.reduce((sum, site) => sum + site.treeCount, 0),
    speciesCounts: countTreesBySpecies(sites),
    regions: countSitesByRegion(sites),
  };
}