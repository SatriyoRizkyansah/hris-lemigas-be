import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

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
