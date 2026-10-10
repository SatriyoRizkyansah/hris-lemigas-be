import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

export class CreateMasterRekeningDto {
  @ApiProperty({ example: 'Bank Mandiri' })
  @IsString()
  @MaxLength(100)
  nama_bank: string;

  @ApiProperty({ example: '1010002727772' })
  @IsString()
  @MaxLength(100)
  nomor_rekening: string;

  @ApiProperty({ example: 'RPL 019 BLU LEMIGAS UNTUK OPS P.' })
  @IsString()
  @MaxLength(200)
  nama_rekening: string;
}

export class UpdateMasterRekeningDto {
  @ApiPropertyOptional({ example: 'Bank Mandiri' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nama_bank?: string;

  @ApiPropertyOptional({ example: '1010002727772' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nomor_rekening?: string;

  @ApiPropertyOptional({ example: 'RPL 019 BLU LEMIGAS UNTUK OPS P.' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nama_rekening?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  status_aktif?: boolean;
}

export class RekonsiliasiQueryDto {
  @ApiPropertyOptional({ example: 'uuid-rekening' })
  @IsUUID()
  @IsOptional()
  rekening_id?: string;

  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @IsOptional()
  tahun_fiscal?: number;
}

export class CreateRekonsiliasiBankDto {
  @ApiProperty({ description: 'ID rekening fisik' })
  @IsUUID()
  rekening_id: string;

  @ApiProperty({
    example: 106397603988,
    description: 'Saldo rekening koran dalam Rupiah',
  })
  @IsInt()
  @Min(0)
  saldo_bank: number;

  @ApiPropertyOptional({ example: 'Pajak belum disetor' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @MaxLength(500)
  keterangan?: string;

  @ApiPropertyOptional({
    example: '2026-10-10',
    description: 'Default hari ini',
  })
  @IsDateString()
  @IsOptional()
  tanggal_rekonsiliasi?: string;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Default tahun dari tanggal rekonsiliasi',
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @IsOptional()
  tahun_fiscal?: number;
}
