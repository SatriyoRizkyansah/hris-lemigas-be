import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  TipePegawai,
  StatusAktif,
  TaKategori,
} from '../../common/enums/hris.enum.js';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

// ─── QUERY ──────────────────────────────────────────────────────────────────

export class PegawaiQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ enum: TipePegawai })
  @IsEnum(TipePegawai)
  @IsOptional()
  @EmptyToUndefined()
  tipe_pegawai?: TipePegawai;

  @ApiPropertyOptional({ enum: StatusAktif })
  @IsEnum(StatusAktif)
  @IsOptional()
  @EmptyToUndefined()
  status_aktif?: StatusAktif;

  @ApiPropertyOptional({ description: 'Filter id unit kerja' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_unit_kerja?: string;
}

// ─── CREATE / UPDATE ────────────────────────────────────────────────────────

export class CreatePegawaiDto {
  @ApiProperty({ example: '197001011990031001' })
  @IsString()
  nip_nik: string;

  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  nama: string;

  @ApiProperty({ enum: TipePegawai, example: TipePegawai.TA })
  @IsEnum(TipePegawai)
  tipe_pegawai: TipePegawai;

  @ApiPropertyOptional({ example: 'Analis Migas' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  jabatan?: string;

  @ApiPropertyOptional({ example: 'budi@lemigas.esdm.go.id' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  email?: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  telepon?: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  tanggal_mulai: string;

  @ApiPropertyOptional({ enum: StatusAktif, default: StatusAktif.AKTIF })
  @IsEnum(StatusAktif)
  @IsOptional()
  status_aktif?: StatusAktif;

  // ── Khusus TA ──
  @ApiPropertyOptional({ example: 'Geofisika' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  bidang_keahlian?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  kontrak_mulai?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  kontrak_selesai?: string;

  @ApiPropertyOptional({
    example: 15000000,
    description: 'Gaji/honorarium bulanan dalam Rupiah (integer)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  gaji_bulanan?: number;

  @ApiPropertyOptional({
    enum: TaKategori,
    default: TaKategori.BIASA,
    description: 'Kategori TA: BIASA atau RO',
  })
  @IsEnum(TaKategori)
  @IsOptional()
  ta_kategori?: TaKategori;

  @ApiPropertyOptional({ description: 'Unit kerja aktif' })
  @IsUUID()
  @IsOptional()
  id_unit_kerja?: string;
}

export class UpdatePegawaiDto {
  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  nama?: string;

  @ApiPropertyOptional({ enum: TipePegawai })
  @IsEnum(TipePegawai)
  @IsOptional()
  tipe_pegawai?: TipePegawai;

  @ApiPropertyOptional({ example: 'Analis Migas' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  jabatan?: string;

  @ApiPropertyOptional({ example: 'budi@lemigas.esdm.go.id' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  email?: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  telepon?: string;

  @ApiPropertyOptional({ enum: StatusAktif })
  @IsEnum(StatusAktif)
  @IsOptional()
  status_aktif?: StatusAktif;

  @ApiPropertyOptional({ example: 'Geofisika' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  bidang_keahlian?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  kontrak_mulai?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  kontrak_selesai?: string;

  @ApiPropertyOptional({ example: 15000000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  gaji_bulanan?: number;

  @ApiPropertyOptional({ enum: TaKategori })
  @IsEnum(TaKategori)
  @IsOptional()
  ta_kategori?: TaKategori;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_unit_kerja?: string;
}

// ─── RESPONSE ───────────────────────────────────────────────────────────────

export class UnitKerjaRingkasDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kode_unit: string;

  @ApiProperty()
  nama_unit: string;

  @ApiProperty()
  tipe_unit: string;

  @ApiPropertyOptional({ nullable: true })
  parent_unit_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  kepala_unit_nama?: string | null;
}

export class PegawaiItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nip_nik: string;

  @ApiProperty()
  nama: string;

  @ApiProperty()
  tipe_pegawai: string;

  @ApiPropertyOptional({ nullable: true })
  jabatan?: string | null;

  @ApiPropertyOptional({ nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  telepon?: string | null;

  @ApiProperty()
  tanggal_mulai: Date;

  @ApiProperty()
  status_aktif: string;

  @ApiPropertyOptional({ nullable: true })
  bidang_keahlian?: string | null;

  @ApiPropertyOptional({ nullable: true })
  kontrak_mulai?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  kontrak_selesai?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  gaji_bulanan?: number | null;

  @ApiPropertyOptional()
  ta_kategori?: string;

  @ApiPropertyOptional({ type: UnitKerjaRingkasDto, nullable: true })
  unit_kerja?: UnitKerjaRingkasDto | null;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class SkRiwayatItemDto {
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

  @ApiProperty()
  status_aktif: string;

  @ApiPropertyOptional({ type: UnitKerjaRingkasDto })
  unit_kerja?: UnitKerjaRingkasDto;
}

export class PenempatanItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pegawai_id: string;

  @ApiProperty({ type: UnitKerjaRingkasDto })
  unit_kerja: UnitKerjaRingkasDto;

  @ApiPropertyOptional({ nullable: true })
  jabatan?: string | null;

  @ApiProperty()
  tmt: Date;

  @ApiPropertyOptional({ nullable: true })
  tanggal_selesai?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  no_sk?: string | null;

  @ApiPropertyOptional({ nullable: true })
  file_sk?: string | null;

  @ApiProperty()
  status_aktif: string;

  @ApiProperty()
  is_homebase: boolean;

  @ApiPropertyOptional({ nullable: true })
  keterangan?: string | null;

  @ApiProperty()
  created_at: Date;
}

export class CreatePenempatanDto {
  @ApiProperty({ description: 'Unit kerja tujuan' })
  @IsUUID()
  unit_kerja_id: string;

  @ApiPropertyOptional({ example: 'Analis Migas' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  jabatan?: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  tmt: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  tanggal_selesai?: string;

  @ApiPropertyOptional({ example: 'SK/001/2024' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  no_sk?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  keterangan?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  is_homebase?: boolean;
}

export class UpdatePenempatanDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  unit_kerja_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  jabatan?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  tmt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  tanggal_selesai?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  no_sk?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  keterangan?: string;

  @ApiPropertyOptional({ enum: StatusAktif })
  @IsEnum(StatusAktif)
  @IsOptional()
  status_aktif?: StatusAktif;

  @ApiPropertyOptional()
  @IsOptional()
  is_homebase?: boolean;
}

export class PegawaiDetailDto extends PegawaiItemDto {
  @ApiProperty({ type: [SkRiwayatItemDto] })
  riwayat_sk: SkRiwayatItemDto[];

  @ApiProperty({ type: [PenempatanItemDto] })
  riwayat_penempatan: PenempatanItemDto[];
}
