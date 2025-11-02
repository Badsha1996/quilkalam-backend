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
    const { displayName, email, bio, profileImage } = updateUserSchema.parse(body);

    let profileImageUrl = undefined;

    // Upload profile image if provided
    if (profileImage) {
      const uploadResult = await uploadImage(profileImage, "quilkalam/profiles");
      profileImageUrl = uploadResult.url;
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (displayName !== undefined) {
      updates.push(`display_name = $${updates.length + 1}`);
      values.push(displayName);
    }
    if (email !== undefined) {
      updates.push(`email = $${updates.length + 1}`);
      values.push(email);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${updates.length + 1}`);
      values.push(bio);
    }
    if (profileImageUrl) {
      updates.push(`profile_image_url = $${updates.length + 1}`);
      values.push(profileImageUrl);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);

    const result = await sql`
      UPDATE users
      SET ${sql.unsafe(updates.join(", "))}
      WHERE id = ${user.userId}
      RETURNING id, phone_number, display_name, email, profile_image_url, bio
    `;

    return NextResponse.json({ success: true, user: result[0] });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 400 }
    );
  }
}