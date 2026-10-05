import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { TipeUnit } from '../../common/enums/hris.enum.js';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

export class UnitKerjaQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ enum: TipeUnit })
  @IsEnum(TipeUnit)
  @IsOptional()
  @EmptyToUndefined()
  tipe_unit?: TipeUnit;

  @ApiPropertyOptional({ description: 'Filter parent unit' })
  @IsUUID()
  @IsOptional()
  @EmptyToUndefined()
  id_parent_unit?: string;
}

export class CreateUnitKerjaDto {
  @ApiProperty({ example: 'KOOR-01' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'kode_unit hanya boleh huruf, angka, dan strip',
  })
  @MaxLength(30)
  kode_unit: string;

  @ApiProperty({ example: 'Koordinator Sumber Daya Manusia' })
  @IsString()
  @MaxLength(200)
  nama_unit: string;

  @ApiProperty({ enum: TipeUnit, example: TipeUnit.KOORDINATOR })
  @IsEnum(TipeUnit)
  tipe_unit: TipeUnit;

  @ApiPropertyOptional({
    description: 'Parent unit (wajib untuk SUB_KOORDINATOR)',
  })
  @IsUUID()
  @IsOptional()
  id_parent_unit?: string;

  @ApiPropertyOptional({ description: 'ID pegawai kepala unit' })
  @IsUUID()
  @IsOptional()
  id_kepala_unit?: string;

  @ApiPropertyOptional({ example: 'Bertanggung jawab atas SDM' })
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  deskripsi?: string;
}

export class UpdateUnitKerjaDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  nama_unit?: string;

  @ApiPropertyOptional({ enum: TipeUnit })
  @IsEnum(TipeUnit)
  @IsOptional()
  tipe_unit?: TipeUnit;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_parent_unit?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_kepala_unit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  deskripsi?: string;

  @ApiPropertyOptional({ enum: ['AKTIF', 'NONAKTIF'] })
  @IsEnum(['AKTIF', 'NONAKTIF'] as const)
  @IsOptional()
  status_aktif?: 'AKTIF' | 'NONAKTIF';
}

export class UnitKerjaItemDto {
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
  id_kepala_unit?: string | null;

  @ApiPropertyOptional({ nullable: true })
  kepala_unit_nama?: string | null;

  @ApiPropertyOptional({ nullable: true })
  deskripsi?: string | null;

  @ApiProperty()
  status_aktif: string;

  @ApiPropertyOptional()
  jumlah_pegawai_aktif?: number;

  @ApiPropertyOptional()
  jumlah_sub_unit?: number;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class UnitKerjaTreeNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kode_unit: string;

  @ApiProperty()
  nama_unit: string;

  @ApiProperty()
  tipe_unit: string;

  @ApiPropertyOptional({ nullable: true })
  kepala_unit_nama?: string | null;

  @ApiProperty()
  status_aktif: string;

  @ApiPropertyOptional({ type: [UnitKerjaTreeNodeDto] })
  children?: UnitKerjaTreeNodeDto[];
}
