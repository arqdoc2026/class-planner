import { NextResponse } from "next/server";
import { getAttachmentUrl } from "../../../../lib/actions/attachment-actions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAttachmentUrl(id);
  if (!result.success || !result.url) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.redirect(result.url);
}
