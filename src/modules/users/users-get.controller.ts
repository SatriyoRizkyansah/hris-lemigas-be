import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseArrayWithPagination } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { paginated } from '../../common/utils/response.util.js';
import { UserQueryDto, UserItemDto } from './users.dto.js';

@ApiTags('Users')
@Controller('/api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersGetController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiRoles('Get daftar user', [Role.Superadmin])
  @ApiStandartResponseArrayWithPagination(UserItemDto)
  async getData(@Query() query: UserQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.query) {
      where.OR = [
        { nama: { contains: query.query, mode: 'insensitive' } },
        { email: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          role: { select: { id: true, kode: true, nama: true } },
          unit_kerja: { select: { id: true, nama_unit: true } },
        },
        orderBy: { nama: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: UserItemDto[] = items.map((item) => ({
      id: item.id,
      email: item.email,
      nama: item.nama,
      role: item.role?.kode ?? '',
      nama_role: item.role?.nama ?? null,
      id_unit_kerja: item.unit_kerja?.id ?? null,
      nama_unit_kerja: item.unit_kerja?.nama_unit ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return paginated(
      'Berhasil mengambil data user',
      data,
      query.page,
      query.limit,
      total,
    );
  }
}
