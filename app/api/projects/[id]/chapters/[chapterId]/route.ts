import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateChapterSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  metadata: z.any().optional(),
  orderIndex: z.number().optional(),
});

// GET single chapter
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const { id: projectId, chapterId } = params;

    const result = await sql`
      SELECT *
      FROM published_items
      WHERE id = ${chapterId} AND project_id = ${projectId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ chapter: result[0] });
  } catch (error: any) {
    console.error("Get chapter error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch chapter" },
      { status: 500 }
    );
  }
}

// PUT - Update chapter
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const user = requireAuth(request);
    const { id: projectId, chapterId } = params;
    const body = await request.json();
    const data = updateChapterSchema.parse(body);

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

    // Build update query
    const setParts: string[] = [];
    const queryParams: any[] = [];

    if (data.name !== undefined) {
      setParts.push(`name = ${setParts.length + 1}`);
      queryParams.push(data.name);
    }
    if (data.description !== undefined) {
      setParts.push(`description = ${setParts.length + 1}`);
      queryParams.push(data.description);
    }
    if (data.content !== undefined) {
      setParts.push(`content = ${setParts.length + 1}`);
      queryParams.push(data.content);

      // Calculate word count
      const wordCount = data.content
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0).length;
      setParts.push(`word_count = ${setParts.length + 1}`);
      queryParams.push(wordCount);
    }
    if (data.metadata !== undefined) {
      setParts.push(`metadata = ${setParts.length + 1}`);
      queryParams.push(JSON.stringify(data.metadata));
    }
    if (data.orderIndex !== undefined) {
      setParts.push(`order_index = ${setParts.length + 1}`);
      queryParams.push(data.orderIndex);
    }

    if (setParts.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    setParts.push(`updated_at = NOW()`);
    queryParams.push(chapterId);
    queryParams.push(projectId);

    const query = `
      UPDATE published_items
      SET ${setParts.join(", ")}
      WHERE id = ${queryParams.length - 1} AND project_id = ${queryParams.length}
      RETURNING *
    `;

    const result = await sql(query, queryParams);

    // Update project word count
    await sql`
      UPDATE published_projects
      SET 
        word_count = (
          SELECT COALESCE(SUM(word_count), 0)
          FROM published_items
          WHERE project_id = ${projectId}
        ),
        updated_at = NOW()
      WHERE id = ${projectId}
    `;

    return NextResponse.json({
      success: true,
      chapter: result[0],
    });
  } catch (error: any) {
    console.error("Update chapter error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update chapter" },
      { status: 400 }
    );
  }
}

// DELETE chapter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const user = requireAuth(request);
    const { id: projectId, chapterId } = params;

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

    // Delete chapter (cascade will delete child items)
    await sql`
      DELETE FROM published_items
      WHERE id = ${chapterId} AND project_id = ${projectId}
    `;

    // Update project word count
    await sql`
      UPDATE published_projects
      SET 
        word_count = (
          SELECT COALESCE(SUM(word_count), 0)
          FROM published_items
          WHERE project_id = ${projectId}
        ),
        updated_at = NOW()
      WHERE id = ${projectId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete chapter error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete chapter" },
      { status: 400 }
    );
  }
}