import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const comments = await sql`
      SELECT 
        c.*,
        u.display_name,
        u.profile_image_url
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.project_id = ${projectId}
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { projectId, content, parentCommentId } = createCommentSchema.parse(body);

    const result = await sql`
      INSERT INTO comments (project_id, user_id, parent_comment_id, content)
      VALUES (${projectId}, ${user.userId}, ${parentCommentId || null}, ${content})
      RETURNING *
    `;

    // Update comment count
    await sql`
      UPDATE published_projects
      SET comment_count = comment_count + 1
      WHERE id = ${projectId}
    `;

    return NextResponse.json({ success: true, comment: result[0] });
  } catch (error: any) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // Check ownership
    const comment = await sql`
      SELECT user_id, project_id FROM comments WHERE id = ${commentId}
    `;

    if (comment.length === 0) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (comment[0].user_id !== user.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await sql`DELETE FROM comments WHERE id = ${commentId}`;

    // Update comment count
    await sql`
      UPDATE published_projects
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = ${comment[0].project_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 400 }
    );
  }
}