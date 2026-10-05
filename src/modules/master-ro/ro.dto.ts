import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}
