import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

// This endpoint should be protected in production or removed after initial setup
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    const authHeader = request.headers.get("x-init-secret");
    if (authHeader !== process.env.INIT_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await initializeDatabase();

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
    });
  } catch (error: any) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize database" },
      { status: 500 }
    );
  }
}