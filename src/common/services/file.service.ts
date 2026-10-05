import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { promises as fs } from 'fs';

export interface UploadedFileLike {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class FileService {
  async uploadSk(file?: UploadedFileLike): Promise<string> {
    if (!file) {
      throw new BadRequestException('File SK tidak ditemukan');
    }

    const extension = extname(file.originalname).toLowerCase();
    if (extension !== '.pdf') {
      throw new BadRequestException('File SK harus berformat PDF');
    }

    const filename = `${randomUUID()}${extension}`;
    const uploadDir = `uploads/dokumen/sk`;

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(`${uploadDir}/${filename}`, file.buffer);

    return `${uploadDir}/${filename}`;
  }

  async delete(path?: string | null): Promise<void> {
    if (!path) return;
    try {
      await fs.unlink(path);
    } catch {
      /* file sudah tidak ada */
    }
  }
}
