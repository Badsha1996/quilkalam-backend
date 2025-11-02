import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { toggleFollowSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { followingId } = toggleFollowSchema.parse(body);

    if (followingId === user.userId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if already following
    const existing = await sql`
      SELECT id FROM follows 
      WHERE follower_id = ${user.userId} AND following_id = ${followingId}
    `;

    if (existing.length > 0) {
      // Unfollow
      await sql`
        DELETE FROM follows 
        WHERE follower_id = ${user.userId} AND following_id = ${followingId}
      `;

      return NextResponse.json({ success: true, following: false });
    } else {
      // Follow
      await sql`
        INSERT INTO follows (follower_id, following_id)
        VALUES (${user.userId}, ${followingId})
      `;

      return NextResponse.json({ success: true, following: true });
    }
  } catch (error: any) {
    console.error("Toggle follow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle follow" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "followers" or "following"
    const userId = searchParams.get("userId") || user.userId;

    if (type === "followers") {
      const followers = await sql`
        SELECT 
          u.id,
          u.display_name,
          u.profile_image_url,
          u.bio,
          f.created_at as followed_at
        FROM follows f
        LEFT JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = ${userId}
        ORDER BY f.created_at DESC
      `;

      return NextResponse.json({ users: followers });
    } else {
      const following = await sql`
        SELECT 
          u.id,
          u.display_name,
          u.profile_image_url,
          u.bio,
          f.created_at as followed_at
        FROM follows f
        LEFT JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = ${userId}
        ORDER BY f.created_at DESC
      `;

      return NextResponse.json({ users: following });
    }
  } catch (error: any) {
    console.error("Get follows error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch follows" },
      { status: 400 }
    );
  }
}