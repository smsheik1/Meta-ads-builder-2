import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AdScene } from '../create/scene';
import { createDownloadFilename, createRenderSnapshot } from '../render/adSceneRender';

export type RenderSceneTicket = {
  id: string;
  scene: AdScene;
  filename: string;
  filePath: string;
  createdAt: number;
};

const getRenderTicketDir = () => (
  path.join(process.cwd(), 'tmp', 'create-v2-render-tickets')
);

const getRenderFileDir = () => (
  path.join(process.cwd(), 'tmp', 'create-v2-render-files')
);

const getRenderTicketPath = (ticketId: string) => (
  path.join(getRenderTicketDir(), `${ticketId}.json`)
);

const sanitizeTicketId = (value: string) => (
  value.toLowerCase().replace(/[^a-z0-9-]+/g, '').slice(0, 80)
);

export const createRenderSceneTicket = async (
  scene: AdScene,
  file: Buffer,
  now = Date.now(),
) => {
  await fs.mkdir(getRenderTicketDir(), { recursive: true });
  await fs.mkdir(getRenderFileDir(), { recursive: true });

  const snapshot = createRenderSnapshot(scene);
  const id = crypto.randomUUID();
  const filename = createDownloadFilename(snapshot.scene);
  const filePath = path.join(getRenderFileDir(), `${id}.mp4`);
  const ticket: RenderSceneTicket = {
    id,
    scene: snapshot.scene,
    filename,
    filePath,
    createdAt: now,
  };

  await fs.writeFile(filePath, file);
  await fs.writeFile(getRenderTicketPath(ticket.id), JSON.stringify(ticket), 'utf8');

  return ticket;
};

export const readRenderSceneTicket = async (ticketId: string) => {
  const safeTicketId = sanitizeTicketId(ticketId);
  if (!safeTicketId || safeTicketId !== ticketId) return null;

  try {
    const raw = await fs.readFile(getRenderTicketPath(safeTicketId), 'utf8');
    return JSON.parse(raw) as RenderSceneTicket;
  } catch {
    return null;
  }
};

export const deleteRenderSceneTicket = async (ticketId: string) => {
  const safeTicketId = sanitizeTicketId(ticketId);
  if (!safeTicketId || safeTicketId !== ticketId) return;

  const ticket = await readRenderSceneTicket(safeTicketId);
  await fs.rm(getRenderTicketPath(safeTicketId), { force: true });
  if (ticket?.filePath) {
    await fs.rm(ticket.filePath, { force: true });
  }
};
