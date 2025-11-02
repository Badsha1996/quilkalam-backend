import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Get project details
    const projectResult = await sql`
      SELECT 
        p.*,
        u.display_name as author_display_name,
        u.profile_image_url as author_profile_image,
        u.bio as author_bio
      FROM published_projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ${projectId} AND p.is_public = TRUE
    `;

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectResult[0];

    // Get items
    const items = await sql`
      SELECT *
      FROM published_items
      WHERE project_id = ${projectId}
      ORDER BY order_index ASC
    `;

    // Increment view count
    await sql`
      UPDATE published_projects
      SET view_count = view_count + 1
      WHERE id = ${projectId}
    `;

    return NextResponse.json({
      project,
      items,
    });
  } catch (error: any) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const projectId = params.id;
    const body = await request.json();

    // Check ownership
    const projectResult = await sql`
      SELECT user_id FROM published_projects WHERE id = ${projectId}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (projectResult[0].user_id !== user.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update project metadata
    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) {
      updates.push(`title = ${updates.length + 1}`);
      values.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push(`description = ${updates.length + 1}`);
      values.push(body.description);
    }
    if (body.genre !== undefined) {
      updates.push(`genre = ${updates.length + 1}`);
      values.push(body.genre);
    }
    if (body.coverImage !== undefined) {
      updates.push(`cover_image_url = ${updates.length + 1}`);
      values.push(body.coverImage);
    }
    if (body.categories !== undefined) {
      updates.push(`categories = ${updates.length + 1}`);
      values.push(body.categories);
    }
    if (body.tags !== undefined) {
      updates.push(`tags = ${updates.length + 1}`);
      values.push(body.tags);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      await sql`
        UPDATE published_projects
        SET ${sql.unsafe(updates.join(", "))}
        WHERE id = ${projectId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update project" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const projectId = params.id;

    // Check ownership
    const projectResult = await sql`
      SELECT user_id FROM published_projects WHERE id = ${projectId}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (projectResult[0].user_id !== user.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete project (cascade will delete items)
    await sql`
      DELETE FROM published_projects WHERE id = ${projectId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete project" },
      { status: 400 }
    );
  }
}