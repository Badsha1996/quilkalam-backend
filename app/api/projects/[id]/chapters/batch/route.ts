import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const batchChapterSchema = z.object({
  chapters: z.array(
    z.object({
      parentItemId: z.string().uuid().optional(),
      itemType: z.string().default("chapter"),
      name: z.string().min(1),
      description: z.string().optional(),
      content: z.string().optional(),
      metadata: z.any().optional(),
      orderIndex: z.number(),
    })
  ),
});

// POST - Add multiple chapters at once
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const projectId = params.id;
    const body = await request.json();
    const { chapters } = batchChapterSchema.parse(body);

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

    const insertedChapters = [];

    // Insert chapters one by one to handle dependencies
    for (const chapter of chapters) {
      let depthLevel = 0;
      if (chapter.parentItemId) {
        const parent = await sql`
          SELECT depth_level FROM published_items WHERE id = ${chapter.parentItemId}
        `;
        if (parent.length > 0) {
          depthLevel = parent[0].depth_level + 1;
        }
      }

      const wordCount = chapter.content
        ? chapter.content.trim().split(/\s+/).filter(w => w.length > 0).length
        : 0;

      const result = await sql`
        INSERT INTO published_items (
          project_id, parent_item_id, item_type, name, description,
          content, metadata, order_index, depth_level, word_count
        ) VALUES (
          ${projectId}, ${chapter.parentItemId || null}, ${chapter.itemType},
          ${chapter.name}, ${chapter.description || null}, ${chapter.content || null},
          ${chapter.metadata ? JSON.stringify(chapter.metadata) : null},
          ${chapter.orderIndex}, ${depthLevel}, ${wordCount}
        )
        RETURNING *
      `;

      insertedChapters.push(result[0]);
    }

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
      chapters: insertedChapters,
      count: insertedChapters.length,
    });
  } catch (error: any) {
    console.error("Batch create chapters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create chapters" },
      { status: 400 }
    );
  }
}

// PUT - Update multiple chapters at once
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

    const updates = body.updates as Array<{
      id: string;
      name?: string;
      description?: string;
      content?: string;
      orderIndex?: number;
      metadata?: any;
    }>;

    const updatedChapters = [];

    for (const update of updates) {
      const setParts: string[] = [];
      const queryParams: any[] = [];
      
      if (update.name !== undefined) {
        setParts.push(`name = ${setParts.length + 1}`);
        queryParams.push(update.name);
      }
      if (update.description !== undefined) {
        setParts.push(`description = ${setParts.length + 1}`);
        queryParams.push(update.description);
      }
      if (update.orderIndex !== undefined) {
        setParts.push(`order_index = ${setParts.length + 1}`);
        queryParams.push(update.orderIndex);
      }
      
      if (update.content !== undefined) {
        const wordCount = update.content
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 0).length;
        setParts.push(`content = ${setParts.length + 1}`);
        queryParams.push(update.content);
        setParts.push(`word_count = ${setParts.length + 1}`);
        queryParams.push(wordCount);
      }
      
      if (update.metadata !== undefined) {
        setParts.push(`metadata = ${setParts.length + 1}`);
        queryParams.push(JSON.stringify(update.metadata));
      }
      
      setParts.push(`updated_at = NOW()`);
      queryParams.push(update.id);
      queryParams.push(projectId);

      if (setParts.length > 1) { // More than just updated_at
        const query = `
          UPDATE published_items
          SET ${setParts.join(", ")}
          WHERE id = ${queryParams.length - 1} AND project_id = ${queryParams.length}
          RETURNING *
        `;
        
        const result = await sql(query, queryParams);
        
        if (result.length > 0) {
          updatedChapters.push(result[0]);
        }
      }
    }

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
      chapters: updatedChapters,
      count: updatedChapters.length,
    });
  } catch (error: any) {
    console.error("Batch update chapters error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update chapters" },
      { status: 400 }
    );
  }
}