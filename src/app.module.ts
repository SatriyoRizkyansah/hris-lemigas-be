import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MasterPegawaiModule } from './modules/master-pegawai/pegawai.module.js';
import { MasterUnitKerjaModule } from './modules/master-unit/unit-kerja.module.js';
import { MasterProyekModule } from './modules/master-proyek/proyek.module.js';
import { MasterRoModule } from './modules/master-ro/ro.module.js';
import { MasterDanaOperasionalModule } from './modules/master-dana-operasional/dana-operasional.module.js';
import { SkModule } from './modules/sk/sk.module.js';
import { AlokasiGajiModule } from './modules/alokasi-gaji/alokasi-gaji.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { MyProfileModule } from './modules/my-profile/my-profile.module.js';
import { FileModule } from './modules/file/file.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { PengaturanMarginModule } from './modules/pengaturan-margin/pengaturan-margin.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    MasterPegawaiModule,
    MasterUnitKerjaModule,
    MasterProyekModule,
    MasterRoModule,
    MasterDanaOperasionalModule,
    SkModule,
    AlokasiGajiModule,
    DashboardModule,
    UsersModule,
    MyProfileModule,
    FileModule,
    FinanceModule,
    PengaturanMarginModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
