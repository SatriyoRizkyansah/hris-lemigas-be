import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';
import { createReadStream, existsSync } from 'fs';
import { join, normalize } from 'path';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function lookupMime(filePath: string): string {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

@Controller()
@ApiTags('File')
export class FileController {
  @Get('api/uploaded/*path')
  getFile(@Req() req: express.Request, @Res() res: express.Response) {
    const rawPath = (req.params as any).path;
    const joined = Array.isArray(rawPath)
      ? rawPath.join('/')
      : String(rawPath ?? '');
    // normalize and strip leading uploads/ if present (DB stores uploads/dokumen/...)
    let safePath = normalize(joined).replace(/^(\.\.(\/|\\|$))+/, '');
    // remove leading slash
    safePath = safePath.replace(/^\/+/, '');
    if (safePath.startsWith('uploads/'))
      safePath = safePath.slice('uploads/'.length);
    const filePath = join(process.cwd(), 'uploads', safePath);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File tidak ditemukan');
    }
    const mimeType = lookupMime(filePath);
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=7776000',
    });
    const stream = createReadStream(filePath);
    return stream.pipe(res);
  }
}
