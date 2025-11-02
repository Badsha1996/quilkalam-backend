import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { toggleLikeSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { projectId } = toggleLikeSchema.parse(body);

    // Check if already liked
    const existing = await sql`
      SELECT id FROM likes 
      WHERE project_id = ${projectId} AND user_id = ${user.userId}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM likes 
        WHERE project_id = ${projectId} AND user_id = ${user.userId}
      `;

      await sql`
        UPDATE published_projects
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = ${projectId}
      `;

      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await sql`
        INSERT INTO likes (project_id, user_id)
        VALUES (${projectId}, ${user.userId})
      `;

      await sql`
        UPDATE published_projects
        SET like_count = like_count + 1
        WHERE id = ${projectId}
      `;

      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error: any) {
    console.error("Toggle like error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle like" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT id FROM likes
      WHERE project_id = ${projectId} AND user_id = ${user.userId}
    `;

    return NextResponse.json({ liked: result.length > 0 });
  } catch (error: any) {
    return NextResponse.json({ liked: false });
  }
}