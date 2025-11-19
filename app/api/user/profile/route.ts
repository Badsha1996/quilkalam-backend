import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { updateUserSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const result = await sql`
      SELECT id, phone_number, display_name, email, profile_image_url, bio, created_at
      FROM users
      WHERE id = ${user.userId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: result[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 401 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { displayName, email, bio, profileImage } =
      updateUserSchema.parse(body);

    let profileImageUrl: string | undefined;
    if (profileImage) {
      const uploadResult = await uploadImage(
        profileImage,
        "quilkalam/profiles"
      );
      profileImageUrl = uploadResult.url;
    }

    // Build update query pieces
    const setParts: string[] = [];
    const params: any[] = [];

    const pushParam = (val: any) => {
      params.push(val);
      return params.length; // 1-based index for $ placeholders
    };

    if (displayName !== undefined) {
      const idx = pushParam(displayName);
      setParts.push(`display_name = $${idx}`);
    }
    if (email !== undefined) {
      const idx = pushParam(email);
      setParts.push(`email = $${idx}`);
    }
    if (bio !== undefined) {
      const idx = pushParam(bio);
      setParts.push(`bio = $${idx}`);
    }
    if (profileImageUrl !== undefined) {
      const idx = pushParam(profileImageUrl);
      setParts.push(`profile_image_url = $${idx}`);
    }

    if (setParts.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Always update updated_at
    setParts.push(`updated_at = NOW()`);

    // Append the user id as the final param for WHERE
    const userIdParamIndex = pushParam(user.userId);

    // Build final SQL string with positional placeholders
    const query = `
      UPDATE users
      SET ${setParts.join(", ")}
      WHERE id = $${userIdParamIndex}
      RETURNING id, phone_number, display_name, email, profile_image_url, bio
    `;

    // Execute query. Many Neon/pg helpers accept (queryString, paramsArray).
    // If your `sql` helper accepts (query, params), the next line will work:
    const result = await sql(query, params);

    // If your `sql` helper only supports tagged templates, see note below.
    return NextResponse.json({ success: true, user: result[0] });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 400 }
    );
  }
}
