import {
  BadRequestException,
  Controller,
  Delete,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseDelete } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { FileService } from '../../common/services/file.service.js';
import { deleted } from '../../common/utils/response.util.js';

@ApiTags('SK')
@Controller('/api/sk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkDeleteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly fileService: FileService,
  ) {}

  @Delete(':id')
  @ApiRoles('Hapus SK', [Role.Superadmin])
  @ApiStandartResponseDelete()
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const sk = await this.prisma.sk.findUnique({ where: { id } });
    if (!sk) throw new NotFoundException('SK tidak ditemukan');

    if (sk.status_aktif === 'AKTIF') {
      throw new BadRequestException(
        'SK aktif tidak dapat dihapus. Nonaktifkan terlebih dahulu.',
      );
    }

    await this.prisma.sk.delete({ where: { id } });
    await this.fileService.delete(sk.file_sk ?? undefined);

    await this.audit.log({
      tabel: 'sk',
      recordId: id,
      aksi: AksiAudit.DELETE,
      dilakukanOleh: user.sub,
      dataSebelum: sk,
    });

    return deleted('Berhasil menghapus SK');
  }
}
