import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';
import { SumberDana } from '../../common/enums/hris.enum.js';

export class SkQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ description: 'Filter pegawai' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_pegawai?: string;

  @ApiPropertyOptional({ description: 'Filter unit kerja' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_unit_kerja?: string;

  @ApiPropertyOptional({ description: 'Hanya SK aktif' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  status_aktif?: string;
}

export class CreateSkDto {
  @ApiProperty({ example: 'SK/001/LEMIGAS/2026' })
  @IsString()
  @Matches(/^[A-Za-z0-9/._-]+$/, {
    message: 'nomor_sk hanya boleh huruf, angka, dan karakter / . _ -',
  })
  @MaxLength(100)
  nomor_sk: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  tanggal_sk: string;

  @ApiProperty({ example: '2026-02-01' })
  @IsDateString()
  tanggal_efektif: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  tanggal_selesai?: string;

  @ApiProperty({ description: 'ID pegawai pemegang SK' })
  @IsUUID()
  id_pegawai: string;

  @ApiProperty({ description: 'ID unit kerja tujuan' })
  @IsUUID()
  id_unit_kerja: string;

  @ApiPropertyOptional({ example: 'Analis Migas Ahli Muda' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  jabatan?: string;

  @ApiPropertyOptional({
    description: 'File PDF SK (akan diupload via endpoint upload)',
  })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  file_sk?: string;

  @ApiPropertyOptional({
    example: 12000000,
    description: 'Gaji bulanan per SK',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  gaji_bulanan?: number;

  @ApiPropertyOptional({
    enum: SumberDana,
    description: 'Default sumber dana TA',
  })
  @IsEnum(SumberDana)
  @IsOptional()
  sumber_dana_default?: SumberDana;

  @ApiPropertyOptional({ description: 'Default RO id jika sumber RO' })
  @IsUUID()
  @IsOptional()
  ro_id_default?: string;

  @ApiPropertyOptional({
    description: 'Default dana operasional id jika sumber OPERASIONAL',
  })
  @IsUUID()
  @IsOptional()
  dana_operasional_id_default?: string;
}

export class UpdateSkDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  nomor_sk?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  tanggal_sk?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  tanggal_efektif?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  tanggal_selesai?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_unit_kerja?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  jabatan?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  file_sk?: string;

  @ApiPropertyOptional({ example: 12000000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  gaji_bulanan?: number;

  @ApiPropertyOptional({ enum: SumberDana })
  @IsEnum(SumberDana)
  @IsOptional()
  sumber_dana_default?: SumberDana;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  ro_id_default?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  dana_operasional_id_default?: string;
}

export class ActivateSkDto {
  @ApiProperty({ description: 'Aktifkan (true) atau nonaktifkan (false) SK' })
  status: boolean;
}

export class SkItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nomor_sk: string;

  @ApiProperty()
  tanggal_sk: Date;

  @ApiProperty()
  tanggal_efektif: Date;

  @ApiPropertyOptional({ nullable: true })
  tanggal_selesai?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  jabatan?: string | null;

  @ApiPropertyOptional({ nullable: true })
  file_sk?: string | null;

  @ApiPropertyOptional({ nullable: true })
  gaji_bulanan?: number | null;

  @ApiPropertyOptional({ nullable: true, enum: ['RO', 'OPERASIONAL'] })
  sumber_dana_default?: string | null;

  @ApiPropertyOptional({ nullable: true })
  ro_id_default?: string | null;

  @ApiPropertyOptional({ nullable: true })
  dana_operasional_id_default?: string | null;

  @ApiProperty()
  status_aktif: string;

  @ApiPropertyOptional({ nullable: true })
  id_pegawai?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_pegawai?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nip_nik?: string | null;

  @ApiPropertyOptional({ nullable: true })
  id_unit_kerja?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_unit_kerja?: string | null;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}
