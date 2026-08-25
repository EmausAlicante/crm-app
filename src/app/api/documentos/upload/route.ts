import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Client-side direct-to-blob upload: the file goes straight from the browser
// to Vercel Blob storage, bypassing the Server Action body size limit (and
// Vercel's serverless function payload cap) that made large catalog PDFs fail.
//
// Every uploader in the app requests a pathname under one of these fixed
// folders — reject anything else so this token endpoint can't be used to
// write arbitrary files/content-types/paths into the app's Blob store.
const FOLDER_RULES: { prefix: string; contentTypes: string[] }[] = [
  { prefix: "logos/", contentTypes: ["image/*"] },
  { prefix: "recordings/", contentTypes: ["audio/*"] },
  {
    prefix: "documentos/",
    contentTypes: [
      "application/pdf",
      "image/*",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  { prefix: "bancario/", contentTypes: ["application/pdf", "image/*"] },
  { prefix: "lopd/", contentTypes: ["application/pdf", "image/*"] },
];

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const rule = FOLDER_RULES.find((r) => pathname.startsWith(r.prefix));
        if (!rule) throw new Error("Ruta de subida no permitida.");
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 100 * 1024 * 1024,
          allowedContentTypes: rule.contentTypes,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
