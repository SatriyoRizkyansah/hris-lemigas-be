import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.module.js';
import { AksiAudit } from '../enums/hris.enum.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tabel: string;
    recordId: string;
    aksi: AksiAudit;
    dilakukanOleh: string;
    dataSebelum?: unknown;
    dataSesudah?: unknown;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tabel: params.tabel,
        record_id: params.recordId,
        aksi: params.aksi,
        dilakukan_oleh: params.dilakukanOleh,
        data_sebelum: (params.dataSebelum ?? null) as object,
        data_sesudah: (params.dataSesudah ?? null) as object,
      },
    });
  }
}
