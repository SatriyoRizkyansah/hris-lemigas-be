import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.module.js';

@Injectable()
export class UnitScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kumpulkan id unit milik koordinator + seluruh unit anak (sub koordinator).
   */
  async getScopedUnitIds(rootUnitId: string): Promise<string[]> {
    const ids: string[] = [];
    const queue: string[] = [rootUnitId];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (ids.includes(current)) continue;
      ids.push(current);

      const children = await this.prisma.unitKerja.findMany({
        where: { parent_unit_id: current, status_aktif: 'AKTIF' },
        select: { id: true },
      });

      for (const child of children) {
        queue.push(child.id);
      }
    }

    return ids;
  }

  /**
   * Cari unit koordinator paling atas dari sebuah unit (menelusuri parent).
   */
  async resolveRootCoordinator(unitId: string): Promise<string | null> {
    let current = await this.prisma.unitKerja.findUnique({
      where: { id: unitId },
    });

    while (current) {
      if (current.tipe_unit === 'KOORDINATOR') {
        return current.id;
      }
      if (!current.parent_unit_id) return null;
      current = await this.prisma.unitKerja.findUnique({
        where: { id: current.parent_unit_id },
      });
    }

    return null;
  }

  /**
   * Validasi apakah unit target berada dalam lingkup unit koordinator.
   */
  async isUnitInScope(
    targetUnitId: string,
    rootUnitId: string,
  ): Promise<boolean> {
    const scoped = await this.getScopedUnitIds(rootUnitId);
    return scoped.includes(targetUnitId);
  }
}
