import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { queues } from "@/lib/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const { scheduledFor } = await request.json();

  if (!scheduledFor) {
    return NextResponse.json({ error: "Chybí datum a čas." }, { status: 400 });
  }

  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: "Datum musí být v budoucnosti." }, { status: 400 });
  }

  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  if (content.status !== "approved") {
    return NextResponse.json({ error: "Obsah musí být nejprve schválen." }, { status: 400 });
  }

  const delay = scheduledDate.getTime() - Date.now();

  await queues.publishing.add(
    "publish",
    { contentId: id },
    {
      delay,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      jobId: `publish:${id}`,
    }
  );

  await prisma.content.update({
    where: { id },
    data: { status: "scheduled", scheduledFor: scheduledDate },
  });

  return NextResponse.json({ ok: true, scheduledFor: scheduledDate.toISOString() });
}
