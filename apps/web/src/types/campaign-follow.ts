export interface CampaignFollowPreferences {
  milestoneUpdates: boolean;
  verificationUpdates: boolean;
  completionUpdates: boolean;
}

export interface CampaignFollow {
  id: string;
  campaignId: string;
  email: string;
  walletAddress?: string;
  preferences: CampaignFollowPreferences;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCampaignFollowInput {
  campaignId: string;
  email: string;
  walletAddress?: string;
  preferences?: Partial<CampaignFollowPreferences>;
}
