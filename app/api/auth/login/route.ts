import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyPassword, generateToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, password } = loginSchema.parse(body);

    // Find user
    const result = await sql`
      SELECT id, phone_number, password_hash, display_name, email, profile_image_url, bio
      FROM users
      WHERE phone_number = ${phoneNumber} AND is_active = TRUE
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = result[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      phoneNumber: user.phone_number,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        displayName: user.display_name,
        email: user.email,
        profileImage: user.profile_image_url,
        bio: user.bio,
      },
      token,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 400 }
    );
  }
}