import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { z } from "zod";

const uploadSchema = z.object({
  image: z.string().min(1),
  folder: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { image, folder } = uploadSchema.parse(body);

    const result = await uploadImage(
      image,
      folder || "quilkalam/uploads"
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 400 }
    );
  }
}