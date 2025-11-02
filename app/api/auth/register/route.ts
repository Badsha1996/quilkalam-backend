import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, password, displayName } = registerSchema.parse(body);

    // Check if user exists
    const existingUser = await sql`
      SELECT id FROM users WHERE phone_number = ${phoneNumber}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await sql`
      INSERT INTO users (phone_number, password_hash, display_name)
      VALUES (${phoneNumber}, ${passwordHash}, ${displayName || null})
      RETURNING id, phone_number, display_name, created_at
    `;

    const user = result[0];

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
      },
      token,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 400 }
    );
  }
}