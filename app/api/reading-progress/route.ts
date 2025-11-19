import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { updateReadingProgressSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      // Get specific project progress
      const result = await sql`
        SELECT * FROM reading_history
        WHERE user_id = ${user.userId} AND project_id = ${projectId}
      `;

      return NextResponse.json({ 
        progress: result.length > 0 ? result[0] : null 
      });
    } else {
      // Get all reading history
      const history = await sql`
        SELECT 
          rh.*,
          p.title,
          p.cover_image_url,
          p.back_image_url,
          p.type,
          p.author_name
        FROM reading_history rh
        LEFT JOIN published_projects p ON rh.project_id = p.id
        WHERE rh.user_id = ${user.userId}
        ORDER BY rh.last_read_at DESC
        LIMIT 50
      `;

      return NextResponse.json({ history });
    }
  } catch (error: any) {
    console.error("Get reading progress error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reading progress" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { projectId, lastReadItemId, progressPercentage } = 
      updateReadingProgressSchema.parse(body);

    // Upsert reading progress
    await sql`
      INSERT INTO reading_history (user_id, project_id, last_read_item_id, progress_percentage)
      VALUES (${user.userId}, ${projectId}, ${lastReadItemId || null}, ${progressPercentage})
      ON CONFLICT (user_id, project_id)
      DO UPDATE SET
        last_read_item_id = EXCLUDED.last_read_item_id,
        progress_percentage = EXCLUDED.progress_percentage,
        last_read_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update reading progress error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update reading progress" },
      { status: 400 }
    );
  }
}