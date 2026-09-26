import { describe, expect, it, vi } from "vitest";
import { CampaignFollowService } from "./campaign-follow.service";

describe("CampaignFollowService", () => {
  it("creates an idempotent follow per campaign and email", () => {
    const service = new CampaignFollowService();
    const first = service.follow({ campaignId: "campaign-1", email: "Person@Example.com" }, 100);
    const second = service.follow({ campaignId: "campaign-1", email: " person@example.com " }, 200);

    expect(second.id).toBe(first.id);
    expect(service.getFollowers("campaign-1")).toHaveLength(1);
    expect(second.updatedAt).toBe(200);
  });

  it("keeps follows for different campaigns independent", () => {
    const service = new CampaignFollowService();
    service.follow({ campaignId: "campaign-1", email: "person@example.com" });
    service.follow({ campaignId: "campaign-2", email: "person@example.com" });

    expect(service.getFollowers("campaign-1")).toHaveLength(1);
    expect(service.getFollowers("campaign-2")).toHaveLength(1);
    expect(service.unfollow("campaign-1", "person@example.com")).toBe(true);
    expect(service.getFollow("campaign-2", "person@example.com")).not.toBeNull();
  });

  it("validates email addresses", () => {
    const service = new CampaignFollowService();
    expect(() => service.follow({ campaignId: "campaign-1", email: "not-an-email" })).toThrow("valid email");
  });

  it("notifies only followers who enabled the selected preference", async () => {
    const service = new CampaignFollowService();
    service.follow({ campaignId: "campaign-1", email: "one@example.com" });
    service.follow({
      campaignId: "campaign-1",
      email: "two@example.com",
      preferences: { milestoneUpdates: false },
    });
    const sendEmail = vi.fn().mockResolvedValue(true);

    const count = await service.notifyFollowers(
      "campaign-1",
      "Milestone reached",
      "<p>Progress</p>",
      "milestoneUpdates",
      { sendEmail },
    );

    expect(count).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "one@example.com" }));
  });
});
