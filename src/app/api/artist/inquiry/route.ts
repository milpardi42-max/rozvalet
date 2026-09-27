import { NextResponse } from "next/server";
import crypto from "crypto";
import { getContent, updateCollection } from "@/lib/data/store";
import { withNoStore } from "@/lib/http";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";
import type { ClientInquiry } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/artist/inquiry — submits a client project quote / commission inquiry for an artist
 */
export async function POST(req: Request) {
  const rlKey = `inquiry:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
  }
  recordAttempt(rlKey);

  const body = (await req.json().catch(() => null)) as {
    artistId?: string;
    artistSlug?: string;
    serviceId?: string;
    serviceTitle?: { fa: string; en: string };
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    projectType: string;
    scopeOrDimensions?: string;
    estimatedBudget?: string;
    message: string;
  } | null;

  if (!body || !body.clientName || !body.clientPhone || !body.message) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, withNoStore({ status: 400 }));
  }

  const content = await getContent();

  // Find artist by id or slug or fallback to first available
  let idx = -1;
  if (body.artistId) {
    idx = content.artists.findIndex((a) => a.id === body.artistId);
  }
  if (idx === -1 && body.artistSlug) {
    idx = content.artists.findIndex((a) => a.slug === body.artistSlug);
  }
  if (idx === -1) {
    idx = content.artists.findIndex((a) => (a.services?.length ?? 0) > 0);
  }
  if (idx === -1) idx = 1; // Fallback to first designer

  const artist = content.artists[idx];
  const newInquiry: ClientInquiry = {
    id: `inq-${crypto.randomBytes(6).toString("hex")}`,
    artistId: artist.id,
    serviceId: body.serviceId,
    serviceTitle: body.serviceTitle,
    clientName: body.clientName.trim(),
    clientEmail: body.clientEmail?.trim() || "",
    clientPhone: body.clientPhone.trim(),
    projectType: body.projectType || "سفارش پروژه اختصاصی",
    scopeOrDimensions: body.scopeOrDimensions,
    estimatedBudget: body.estimatedBudget,
    message: body.message.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const inquiries = [newInquiry, ...(artist.inquiries ?? [])];
  const updatedArtist = { ...artist, inquiries };
  const allArtists = content.artists.map((a, i) => (i === idx ? updatedArtist : a));

  await updateCollection("artists", allArtists);

  return NextResponse.json({ ok: true, inquiry: newInquiry }, withNoStore());
}
