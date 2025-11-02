import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

type RouteContext<P> = { params: P | Promise<P> };

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
  context: RouteContext<{ id: string }>
) {
  try {
    const user = requireAuth(request);
    const { id: projectId } = await context.params;
    const body = await request.json();
    const { chapters } = batchChapterSchema.parse(body);

    // Check ownership
    const projectResult = await sql`
      SELECT user_id FROM published_projects WHERE id = ${projectId}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (projectResult[0].user_id !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const insertedChapters: any[] = [];

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
        ? chapter.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length
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

    if (projectResult.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (projectResult[0].user_id !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updates = (body.updates || []) as Array<{
      id: string;
      name?: string;
      description?: string;
      content?: string;
      orderIndex?: number;
      metadata?: any;
    }>;

    const updatedChapters: any[] = [];

    for (const update of updates) {
      // Build parameterized set parts
      const setParts: string[] = [];
      const queryParams: any[] = [];

      const pushParam = (value: any) => {
        queryParams.push(value);
        return queryParams.length; // 1-based index for positional params in the constructed raw SQL
      };

      if (update.name !== undefined) {
        const idx = pushParam(update.name);
        setParts.push(`name = $${idx}`);
      }
      if (update.description !== undefined) {
        const idx = pushParam(update.description);
        setParts.push(`description = $${idx}`);
      }
      if (update.orderIndex !== undefined) {
        const idx = pushParam(update.orderIndex);
        setParts.push(`order_index = $${idx}`);
      }

      if (update.content !== undefined) {
        const wordCount = update.content
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        const idxContent = pushParam(update.content);
        setParts.push(`content = $${idxContent}`);
        const idxWC = pushParam(wordCount);
        setParts.push(`word_count = $${idxWC}`);
      }

      if (update.metadata !== undefined) {
        const idx = pushParam(JSON.stringify(update.metadata));
        setParts.push(`metadata = $${idx}`);
      }

      // Always update updated_at
      setParts.push(`updated_at = NOW()`);

      // Only proceed if there are actual fields to set (besides updated_at)
      if (setParts.length > 0) {
        // Append id and projectId as final params
        const idParamIndex = pushParam(update.id);
        const projectIdParamIndex = pushParam(projectId);

        // Build raw SQL string with positional params ($1, $2, ...)
        const query = `
          UPDATE published_items
          SET ${setParts.join(", ")}
          WHERE id = $${idParamIndex} AND project_id = $${projectIdParamIndex}
          RETURNING *
        `;

        // Depending on your `sql` helper, you may be able to pass raw query + params.
        // If your `sql` helper only supports tagged templates, replace this block with
        // an appropriate API (e.g., using pg client). I'm keeping a generic interface here:
        const result = await sql(query, queryParams);

        if (result && result.length > 0) {
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
