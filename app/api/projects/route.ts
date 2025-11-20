import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const genre = searchParams.get("genre");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");

    const offset = (page - 1) * limit;

    // Build WHERE conditions and parameters
    let whereConditions: string[] = ["is_public = TRUE", "status = 'published'"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereConditions.push(`type = $${paramIndex++}`);
      queryParams.push(type);
    }

    if (genre) {
      whereConditions.push(`genre = $${paramIndex++}`);
      queryParams.push(genre);
    }

    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM published_projects
      WHERE ${whereClause}
    `;
    const countResult = await sql(countQuery, queryParams);
    const total = parseInt(countResult[0].total);

    // Get projects with user info
    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;
    
    const projectsQuery = `
      SELECT 
        p.*,
        u.display_name as author_display_name,
        u.profile_image_url as author_profile_image
      FROM published_projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
      ORDER BY p.published_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    
    const projects = await sql(projectsQuery, [...queryParams, limit, offset]);

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}