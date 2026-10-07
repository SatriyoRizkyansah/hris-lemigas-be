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
import { StatusRo } from '../../common/enums/hris.enum.js';

export class RoQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ description: 'Filter proyek' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_proyek?: string;

  @ApiPropertyOptional({ description: 'Filter unit koordinator' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_unit_koordinator?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  tahun_fiscal?: number;
}

export class CreateRoDto {
  @ApiProperty({ example: 'RO-2026-001' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'kode_ro hanya boleh huruf, angka, dan strip',
  })
  @MaxLength(30)
  kode_ro: string;

  @ApiProperty({ example: 'RO Infrastruktur 2026' })
  @IsString()
  @MaxLength(200)
  nama_ro: string;

  @ApiProperty({ description: 'ID proyek sumber RO' })
  @IsUUID()
  id_proyek: string;

  @ApiProperty({ description: 'ID unit koordinator pemilik RO' })
  @IsUUID()
  id_unit_koordinator: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @ApiProperty({
    example: 500000000,
    description: 'Total plafon Rupiah (integer)',
  })
  @IsInt()
  @Min(0)
  total_plafon: number;

  @ApiPropertyOptional({ example: 'KONTRAK/2026/001' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(100)
  no_kontrak?: string;

  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(150)
  pj?: string;

  @ApiPropertyOptional({ example: 'SK-RO-001' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(100)
  no_sk?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  mulai_sk?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  berakhir_sk?: string;

  @ApiPropertyOptional({ enum: StatusRo, default: StatusRo.AKTIF })
  @IsEnum(StatusRo)
  @IsOptional()
  status_ro?: StatusRo;
}

export class UpdateRoDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  nama_ro?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  total_plafon?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(100)
  no_kontrak?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(150)
  pj?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(100)
  no_sk?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  mulai_sk?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  berakhir_sk?: string;

  @ApiPropertyOptional({ enum: StatusRo })
  @IsEnum(StatusRo)
  @IsOptional()
  status_ro?: StatusRo;
}

export class RoItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kode_ro: string;

  @ApiProperty()
  nama_ro: string;

  @ApiProperty()
  tahun_fiscal: number;

  @ApiProperty()
  total_plafon: number;

  @ApiPropertyOptional()
  total_terpakai?: number;

  @ApiPropertyOptional()
  sisa_saldo?: number;

  @ApiPropertyOptional({ nullable: true })
  id_proyek?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_proyek?: string | null;

  @ApiPropertyOptional({ nullable: true })
  id_unit_koordinator?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_unit_koordinator?: string | null;

  @ApiPropertyOptional({ nullable: true })
  no_kontrak?: string | null;

  @ApiPropertyOptional({ nullable: true })
  pj?: string | null;

  @ApiPropertyOptional({ nullable: true })
  file_rab?: string | null;

  @ApiPropertyOptional()
  status_ro?: string;

  @ApiPropertyOptional({ nullable: true })
  no_sk?: string | null;

  @ApiPropertyOptional({ nullable: true })
  mulai_sk?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  berakhir_sk?: Date | null;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class CreateRoTransaksiDto {
  @ApiProperty({ example: 'Beli ATK' })
  @IsString()
  @MaxLength(200)
  nama_kegiatan: string;

  @ApiPropertyOptional({ example: 'KWT-001' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(100)
  no_kuitansi?: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  tanggal: string;

  @ApiPropertyOptional({ example: 1500000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  debit?: number;

  @ApiPropertyOptional({ example: 10000000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  kredit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(255)
  keterangan?: string;
}

export class UpdateRoTransaksiDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(200)
  nama_kegiatan?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(100)
  no_kuitansi?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  tanggal?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  debit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  kredit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(255)
  keterangan?: string;
}

export class RoTransaksiItemDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  ro_id: string;
  @ApiProperty()
  nama_kegiatan: string;
  @ApiPropertyOptional({ nullable: true })
  no_kuitansi?: string | null;
  @ApiProperty()
  tanggal: Date;
  @ApiProperty()
  debit: number;
  @ApiProperty()
  kredit: number;
  @ApiPropertyOptional({ nullable: true })
  keterangan?: string | null;
  @ApiProperty()
  created_at: Date;
}

export class RoDetailDto extends RoItemDto {
  @ApiProperty({ type: [RoTransaksiItemDto] })
  transaksi_list: RoTransaksiItemDto[];
  @ApiProperty()
  total_debit: number;
  @ApiProperty()
  total_kredit: number;
  @ApiProperty()
  saldo_ledger: number;
  @ApiProperty({ type: [Object] })
  alokasi_list: any[];
}
