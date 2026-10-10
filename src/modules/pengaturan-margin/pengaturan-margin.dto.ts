import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class PengaturanMarginItemDto {
  @ApiProperty()
  id: string;
  @ApiProperty({
    enum: [
      'P1_PNS_NON_PNS',
      'P2_KP3',
      'OPS_KANTOR',
      'OPS_KP3',
      'MULOS_SPI',
      'LAINNYA',
    ],
  })
  kategori_kamar: string;
  @ApiProperty()
  nama_kamar: string;
  @ApiProperty()
  persentase: number;
  @ApiProperty()
  unit_kerja_id: string;
  @ApiPropertyOptional()
  nama_unit?: string;
  @ApiPropertyOptional()
  kode_unit?: string;
  @ApiPropertyOptional()
  rekening_id?: string | null;
  @ApiPropertyOptional()
  nama_rekening?: string | null;
  @ApiPropertyOptional()
  nama_bank?: string | null;
  @ApiPropertyOptional()
  nomor_rekening?: string | null;
}

export class UpdatePengaturanMarginDto {
  @ApiPropertyOptional({ example: 'P1 PNS & Non PNS' })
  @IsString()
  @IsOptional()
  nama_kamar?: string;

  @ApiPropertyOptional({ example: 48, description: 'Persentase 0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  persentase?: number;

  @ApiPropertyOptional({ description: 'Unit koordinator pemilik wallet' })
  @IsUUID()
  @IsOptional()
  unit_kerja_id?: string;

  @ApiPropertyOptional({
    description: 'Master rekening tujuan distribusi margin',
  })
  @IsUUID()
  @IsOptional()
  rekening_id?: string;
}
