import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SumberDana } from '../../common/enums/hris.enum.js';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

export class AlokasiQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ description: 'Filter pegawai' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_pegawai?: string;

  @ApiPropertyOptional({
    description: 'Filter unit kerja (termasuk anak unit)',
  })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_unit_kerja?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  periode_bulan?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  periode_tahun?: number;

  @ApiPropertyOptional({ enum: SumberDana })
  @IsEnum(SumberDana)
  @IsOptional()
  sumber_dana?: SumberDana;
}

export class CreateAlokasiDto {
  @ApiProperty({ description: 'ID pegawai TA' })
  @IsUUID()
  id_pegawai: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  periode_bulan: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  periode_tahun: number;

  @ApiProperty({ enum: SumberDana, example: SumberDana.RO })
  @IsEnum(SumberDana)
  sumber_dana: SumberDana;

  @ApiPropertyOptional({
    description: 'Wajib jika sumber_dana = RO',
  })
  @IsUUID()
  @IsOptional()
  id_ro?: string;

  @ApiPropertyOptional({
    description: 'Wajib jika sumber_dana = OPERASIONAL',
  })
  @IsUUID()
  @IsOptional()
  id_dana_operasional?: string;

  @ApiProperty({
    example: 9000000,
    description: 'Jumlah alokasi Rupiah (integer)',
  })
  @IsInt()
  @Min(1)
  jumlah: number;

  @ApiPropertyOptional({ example: 'Alokasi gaji TA bulan Januari' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  keterangan?: string;
}

export class UpdateAlokasiDto {
  @ApiPropertyOptional({ enum: SumberDana })
  @IsEnum(SumberDana)
  @IsOptional()
  sumber_dana?: SumberDana;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_ro?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_dana_operasional?: string;

  @ApiPropertyOptional({ example: 9000000 })
  @IsInt()
  @Min(1)
  @IsOptional()
  jumlah?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  keterangan?: string;
}

export class AlokasiItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  periode_bulan: number;

  @ApiProperty()
  periode_tahun: number;

  @ApiProperty()
  sumber_dana: string;

  @ApiProperty({ example: 9000000 })
  jumlah: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  keterangan?: string | null;

  @ApiPropertyOptional({ nullable: true })
  id_pegawai?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_pegawai?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nip_nik?: string | null;

  @ApiPropertyOptional({ nullable: true })
  tipe_pegawai?: string | null;

  @ApiPropertyOptional({ nullable: true })
  gaji_bulanan?: number | null;

  @ApiPropertyOptional({ nullable: true })
  id_unit_kerja?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_unit_kerja?: string | null;

  @ApiPropertyOptional({ nullable: true })
  id_ro?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_ro?: string | null;

  @ApiPropertyOptional({ nullable: true })
  id_dana_operasional?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_dibuat_oleh?: string | null;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class RekapItemDto {
  @ApiProperty()
  id_pegawai: string;

  @ApiProperty()
  nama_pegawai: string;

  @ApiPropertyOptional({ nullable: true })
  nip_nik?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_unit_kerja?: string | null;

  @ApiProperty()
  gaji_bulanan: number;

  @ApiProperty()
  total_alokasi: number;

  @ApiProperty()
  alokasi_ro: number;

  @ApiProperty()
  alokasi_operasional: number;

  @ApiProperty()
  sisa_gaji: number;

  @ApiPropertyOptional({ type: [AlokasiItemDto] })
  detail?: AlokasiItemDto[];
}
