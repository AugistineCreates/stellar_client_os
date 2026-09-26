import { campaignFollowService } from "@/services/campaign-follow.service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return Response.json({ campaignId: id, followerCount: campaignFollowService.getFollowers(id).length });
  }

  try {
    const follow = campaignFollowService.getFollow(id, email);
    return Response.json({ campaignId: id, following: Boolean(follow), follow });
  } catch {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as {
      email?: string;
      walletAddress?: string;
      preferences?: {
        milestoneUpdates?: boolean;
        verificationUpdates?: boolean;
        completionUpdates?: boolean;
      };
    };
    const follow = campaignFollowService.follow({
      campaignId: id,
      email: body.email ?? "",
      walletAddress: body.walletAddress,
      preferences: body.preferences,
    });
    return Response.json({ success: true, following: true, follow }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to follow campaign" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = new URL(request.url).searchParams.get("email");
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });

  try {
    const removed = campaignFollowService.unfollow(id, email);
    if (!removed) return Response.json({ error: "Follow not found" }, { status: 404 });
    return Response.json({ success: true, following: false });
  } catch {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }
}
