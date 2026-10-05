import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

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

  @ApiPropertyOptional()
  jumlah_ro?: number;

  @ApiPropertyOptional()
  total_plafon_ro?: number;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}
