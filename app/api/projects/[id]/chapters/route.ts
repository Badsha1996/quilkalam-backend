import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createChapterSchema = z.object({
  parentItemId: z.string().uuid().optional(),
  itemType: z.string().default("chapter"),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),
  metadata: z.any().optional(),
  orderIndex: z.number().default(0),
});

// GET all chapters for a project
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;

    const chapters = await sql`
      SELECT *
      FROM published_items
      WHERE project_id = ${projectId}
      ORDER BY order_index ASC, created_at ASC
    `;

    return NextResponse.json({ chapters });
  } catch (error: any) {
    console.error("Get chapters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

// POST - Add new chapter
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    const { id: projectId } = await context.params;
    const body = await request.json();
    const data = createChapterSchema.parse(body);

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

    // Calculate depth level
    let depthLevel = 0;
    if (data.parentItemId) {
      const parent = await sql`
        SELECT depth_level FROM published_items WHERE id = ${data.parentItemId}
      `;
      if (parent.length > 0) {
        depthLevel = parent[0].depth_level + 1;
      }
    }

    // Calculate word count
    const wordCount = data.content
      ? data.content.trim().split(/\s+/).filter(w => w.length > 0).length
      : 0;

    // Insert chapter
    const result = await sql`
      INSERT INTO published_items (
        project_id, parent_item_id, item_type, name, description,
        content, metadata, order_index, depth_level, word_count
      ) VALUES (
        ${projectId}, ${data.parentItemId || null}, ${data.itemType},
        ${data.name}, ${data.description || null}, ${data.content || null},
        ${data.metadata ? JSON.stringify(data.metadata) : null},
        ${data.orderIndex}, ${depthLevel}, ${wordCount}
      )
      RETURNING *
    `;

    // Update project word count and updated_at
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
    console.error("Create chapter error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create chapter" },
      { status: 400 }
    );
  }
}