import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service.js';
import { FundService } from './services/fund.service.js';
import { UnitScopeService } from './services/unit-scope.service.js';
import { FileService } from './services/file.service.js';
import { AlokasiValidationService } from './services/alokasi-validation.service.js';

@Global()
@Module({
  providers: [
    AuditService,
    FundService,
    UnitScopeService,
    FileService,
    AlokasiValidationService,
  ],
  exports: [
    AuditService,
    FundService,
    UnitScopeService,
    FileService,
    AlokasiValidationService,
  ],
})
export class CommonModule {}
