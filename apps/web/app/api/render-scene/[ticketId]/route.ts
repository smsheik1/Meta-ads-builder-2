import fs from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { readRenderSceneTicket } from '@/features/export/renderSceneTicketStore';

export const runtime = 'nodejs';

type RenderSceneTicketRouteContext = {
  params: Promise<{
    ticketId: string;
  }>;
};

export async function GET(_request: Request, { params }: RenderSceneTicketRouteContext) {
  const { ticketId } = await params;
  const ticket = await readRenderSceneTicket(ticketId);

  if (!ticket) {
    return NextResponse.json({ error: 'That video download link expired. Try Download video again.' }, { status: 404 });
  }

  try {
    const file = await fs.readFile(ticket.filePath);

    return new NextResponse(file, {
      headers: {
        'content-type': 'video/mp4',
        'content-disposition': `attachment; filename="${ticket.filename}"`,
        'x-wiggly-render-platform': ticket.scene.platform,
      },
    });
  } catch (error) {
    console.error('[create-v2 render-scene ticket file download]', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Prepared video file is not available. Try Download video again.',
    }, { status: 500 });
  }
}
