import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

export class CreateDanaOperasionalDto {
  @ApiProperty({ description: 'ID unit koordinator pemilik dana operasional' })
  @IsUUID()
  id_unit_koordinator: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @ApiProperty({
    example: 200000000,
    description: 'Total plafon dana operasional Rupiah (integer)',
  })
  @IsInt()
  @Min(0)
  total_plafon: number;
}

export class UpdateDanaOperasionalDto {
  @ApiPropertyOptional({
    example: 250000000,
    description: 'Total plafon baru Rupiah (integer)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  total_plafon?: number;
}

export class DanaOperasionalItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tahun_fiscal: number;

  @ApiProperty()
  total_plafon: number;

  @ApiPropertyOptional()
  total_terpakai?: number;

  @ApiPropertyOptional()
  sisa_saldo?: number;

  @ApiPropertyOptional({ nullable: true })
  id_unit_koordinator?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_unit_koordinator?: string | null;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class CreateDanaTransaksiDto {
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

export class UpdateDanaTransaksiDto {
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
