import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type RouteContext<P> = { params: P | Promise<P> };

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: projectId } = await context.params;

    // Get project details (only public projects in this endpoint)
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

    if (!projectResult || projectResult.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectResult[0];

    // Get items
    const items = await sql`
      SELECT *
      FROM published_items
      WHERE project_id = ${projectId}
      ORDER BY order_index ASC
    `;

    // Increment view count (async fire-and-forget is fine, but await to ensure DB update)
    await sql`
      UPDATE published_projects
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = ${projectId}
    `;

    return NextResponse.json({
      project,
      items: items || [],
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
  context: RouteContext<{ id: string }>
) {
  try {
    const user = requireAuth(request);
    const { id: projectId } = await context.params;
    const body = await request.json();

    // Check ownership
    const projectResult = await sql`
      SELECT user_id FROM published_projects WHERE id = ${projectId}
    `;

    if (!projectResult || projectResult.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (projectResult[0].user_id !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build parameterized UPDATE dynamically
    const setParts: string[] = [];
    const params: any[] = [];

    const pushParam = (val: any) => {
      params.push(val);
      return params.length; // 1-based index used in $n placeholders
    };

    if (body.title !== undefined) {
      const idx = pushParam(body.title);
      setParts.push(`title = $${idx}`);
    }
    if (body.description !== undefined) {
      const idx = pushParam(body.description);
      setParts.push(`description = $${idx}`);
    }
    if (body.genre !== undefined) {
      const idx = pushParam(body.genre);
      setParts.push(`genre = $${idx}`);
    }
    if (body.coverImage !== undefined) {
      const idx = pushParam(body.coverImage);
      setParts.push(`cover_image_url = $${idx}`);
    }
    if (body.backImage !== undefined) {
      const idx = pushParam(body.backImage);
      setParts.push(`back_image_url = $${idx}`);
    }
    if (body.categories !== undefined) {
      const idx = pushParam(body.categories);
      setParts.push(`categories = $${idx}`);
    }
    if (body.tags !== undefined) {
      const idx = pushParam(body.tags);
      setParts.push(`tags = $${idx}`);
    }

    // Always update updated_at if any real update present
    if (setParts.length > 0) {
      setParts.push(`updated_at = NOW()`);
      // append projectId as final param for WHERE
      const projectIdParamIndex = pushParam(projectId);

      const query = `
        UPDATE published_projects
        SET ${setParts.join(", ")}
        WHERE id = $${projectIdParamIndex}
        RETURNING *
      `;

      // Execute parameterized raw query (your `sql` helper should accept (query, params))
      // If your `sql` helper is strictly tagged-template only, tell me which library so I can adapt.
      const updated = await sql(query, params);

      // Optionally return the updated project
      if (updated && updated.length > 0) {
        return NextResponse.json({ success: true, project: updated[0] });
      } else {
        return NextResponse.json({ success: true });
      }
    }

    // Nothing to update
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
  context: RouteContext<{ id: string }>
) {
  try {
    const user = requireAuth(request);
    const { id: projectId } = await context.params;

    // Check ownership
    const projectResult = await sql`
      SELECT user_id FROM published_projects WHERE id = ${projectId}
    `;

    if (!projectResult || projectResult.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (projectResult[0].user_id !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
