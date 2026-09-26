import { randomUUID } from "node:crypto";
import { EmailService } from "@/services/email.service";
import type {
  CampaignFollow,
  CampaignFollowPreferences,
  CreateCampaignFollowInput,
} from "@/types/campaign-follow";

const DEFAULT_PREFERENCES: CampaignFollowPreferences = {
  milestoneUpdates: true,
  verificationUpdates: true,
  completionUpdates: true,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Campaign follows are kept behind a service boundary so the storage can be
 * replaced with the application's persistent data source without changing the
 * API or UI. Duplicate follows are idempotent per campaign and email.
 */
export class CampaignFollowService {
  private readonly follows = new Map<string, CampaignFollow[]>();

  follow(input: CreateCampaignFollowInput, now = Date.now()): CampaignFollow {
    const email = this.normalizeEmail(input.email);
    if (!input.campaignId?.trim()) throw new Error("campaignId is required");

    const current = this.follows.get(input.campaignId) ?? [];
    const existing = current.find((follow) => follow.email === email);
    if (existing) {
      existing.walletAddress = input.walletAddress?.trim() || existing.walletAddress;
      existing.preferences = this.mergePreferences(existing.preferences, input.preferences);
      existing.updatedAt = now;
      return existing;
    }

    const follow: CampaignFollow = {
      id: `follow_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
      campaignId: input.campaignId,
      email,
      walletAddress: input.walletAddress?.trim() || undefined,
      preferences: this.mergePreferences(DEFAULT_PREFERENCES, input.preferences),
      createdAt: now,
      updatedAt: now,
    };
    current.push(follow);
    this.follows.set(input.campaignId, current);
    return follow;
  }

  unfollow(campaignId: string, email: string): boolean {
    const normalized = this.normalizeEmail(email);
    const current = this.follows.get(campaignId) ?? [];
    const remaining = current.filter((follow) => follow.email !== normalized);
    if (remaining.length === current.length) return false;
    this.follows.set(campaignId, remaining);
    return true;
  }

  getFollowers(campaignId: string): CampaignFollow[] {
    return [...(this.follows.get(campaignId) ?? [])];
  }

  getFollow(campaignId: string, email: string): CampaignFollow | null {
    const normalized = this.normalizeEmail(email);
    return this.getFollowers(campaignId).find((follow) => follow.email === normalized) ?? null;
  }

  async notifyFollowers(
    campaignId: string,
    subject: string,
    html: string,
    preference: keyof CampaignFollowPreferences,
    emailService = new EmailService(),
  ): Promise<number> {
    const recipients = this.getFollowers(campaignId).filter((follow) => follow.preferences[preference]);
    await Promise.all(recipients.map((follow) => emailService.sendEmail({ to: follow.email, subject, html })));
    return recipients.length;
  }

  private normalizeEmail(email: string): string {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !EMAIL_PATTERN.test(normalized)) throw new Error("A valid email is required");
    return normalized;
  }

  private mergePreferences(
    current: CampaignFollowPreferences,
    updates?: Partial<CampaignFollowPreferences>,
  ): CampaignFollowPreferences {
    return {
      milestoneUpdates: updates?.milestoneUpdates ?? current.milestoneUpdates,
      verificationUpdates: updates?.verificationUpdates ?? current.verificationUpdates,
      completionUpdates: updates?.completionUpdates ?? current.completionUpdates,
    };
  }
}

export const campaignFollowService = new CampaignFollowService();
