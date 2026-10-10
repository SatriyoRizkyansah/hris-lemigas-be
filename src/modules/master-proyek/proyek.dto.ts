import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

export class RoInputDto {
  @ApiProperty({ example: 'Operasional Pengeboran' })
  @IsString()
  @MaxLength(200)
  nama_ro: string;

  @ApiPropertyOptional({ example: 'RO-2026-001' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'kode_ro hanya boleh huruf, angka, dan strip',
  })
  @MaxLength(30)
  kode_ro?: string;

  @ApiProperty({ description: 'ID unit koordinator pemilik RO' })
  @IsUUID()
  id_unit_koordinator: string;

  @ApiProperty({ example: 500000000 })
  @IsInt()
  @Min(1)
  plafon: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  rekening_id?: string;
}

export class ProyekQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  tahun_fiscal?: number;
}

export class CreateProyekDto {
  @ApiProperty({ example: 'PRJ-2026-001' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'kode_proyek hanya boleh huruf, angka, dan strip',
  })
  @MaxLength(30)
  kode_proyek: string;

  @ApiProperty({ example: 'Pengembangan Infrastruktur Migas' })
  @IsString()
  @MaxLength(200)
  nama_proyek: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @ApiPropertyOptional({ example: 'APBN 2026' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  sumber_pendanaan?: string;

  @ApiPropertyOptional({
    example: 1000000000,
    description: 'Nilai kontrak total',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  nilai_kontrak?: number;

  @ApiPropertyOptional({ example: 750000000, description: 'Total direct cost' })
  @IsInt()
  @Min(0)
  @IsOptional()
  total_direct_cost?: number;

  @ApiPropertyOptional({
    example: 250000000,
    description: 'Total margin yang akan didistribusikan ke 5 kamar',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  total_margin?: number;

  @ApiPropertyOptional({
    type: [RoInputDto],
    description: 'Daftar RO awal — total plafon harus = total_direct_cost',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoInputDto)
  @IsOptional()
  ro_list?: RoInputDto[];
}

export class UpdateProyekDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  nama_proyek?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  tahun_fiscal?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  sumber_pendanaan?: string;

  @ApiPropertyOptional({ example: 1000000000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  nilai_kontrak?: number;

  @ApiPropertyOptional({ example: 750000000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  total_direct_cost?: number;

  @ApiPropertyOptional({ example: 250000000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  total_margin?: number;
}

export class ProyekItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kode_proyek: string;

  @ApiProperty()
  nama_proyek: string;

  @ApiProperty()
  tahun_fiscal: number;

  @ApiPropertyOptional({ nullable: true })
  sumber_pendanaan?: string | null;

  @ApiPropertyOptional({ example: 1000000000 })
  nilai_kontrak?: number;

  @ApiPropertyOptional({ example: 750000000 })
  total_direct_cost?: number;

  @ApiPropertyOptional({ example: 250000000 })
  total_margin?: number;

  @ApiPropertyOptional()
  jumlah_ro?: number;

  @ApiPropertyOptional()
  total_plafon_ro?: number;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}
