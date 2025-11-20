import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { publishProjectSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const data = publishProjectSchema.parse(body);

    let coverImageUrl = data.coverImage;
    let backImageUrl = data.backImage;

    // Upload cover image if provided
    if (data.coverImage && data.coverImage.startsWith("data:")) {
      const uploadResult = await uploadImage(
        data.coverImage,
        "quilkalam/covers"
      );
      coverImageUrl = uploadResult.url;
    }

    if (data.backImage && data.backImage.startsWith("data:")) {
      const uploadResult = await uploadImage(
        data.backImage,
        "quilkalam/covers"
      );
      backImageUrl = uploadResult.url;
    }

    // Insert project
    const projectResult = await sql`
      INSERT INTO published_projects (
        user_id, type, title, description, genre, author_name,
        cover_image_url,back_image_url, word_count, isbn, publisher, publication_date,
        price, language, copyright_text, categories, tags,
        is_public, allow_comments, allow_downloads
      ) VALUES (
        ${user.userId}, ${data.type}, ${data.title}, ${
      data.description || null
    },
        ${data.genre || null}, ${data.authorName || null}, ${
      coverImageUrl || null
    },${backImageUrl || null},
        ${data.wordCount}, ${data.isbn || null}, ${data.publisher || null},
        ${data.publicationDate || null}, ${data.price || null}, ${
      data.language
    },
        ${data.copyrightText || null}, ${data.categories || []}, ${
      data.tags || []
    },
        ${data.isPublic}, ${data.allowComments}, ${data.allowDownloads}
      )
      RETURNING id, created_at
    `;

    const project = projectResult[0];

    // Insert items
    const itemIdMap = new Map<string, string>();

    for (const item of data.items) {
      const parentId = item.parentItemId
        ? itemIdMap.get(item.parentItemId)
        : null;

      const itemResult = await sql`
        INSERT INTO published_items (
          project_id, parent_item_id, item_type, name, description,
          content, metadata, order_index, depth_level, word_count
        ) VALUES (
          ${project.id}, ${parentId}, ${item.itemType}, ${item.name},
          ${item.description || null}, ${item.content || null},
          ${item.metadata ? JSON.stringify(item.metadata) : null},
          ${item.orderIndex}, ${item.depthLevel}, ${item.wordCount}
        )
        RETURNING id
      `;

      if (item.parentItemId) {
        itemIdMap.set(item.parentItemId, itemResult[0].id);
      }
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      publishedAt: project.created_at,
    });
  } catch (error: any) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish project" },
      { status: 400 }
    );
  }
}

// api/projects/publish
// i will pass userId 
// it should give me all projects that in db
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    
  } catch (e) {}
}
