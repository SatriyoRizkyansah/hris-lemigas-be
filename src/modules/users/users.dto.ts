import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { StatusAktif } from '../../common/enums/hris.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined.js';

export class UserQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role)
  @IsOptional()
  @EmptyToUndefined()
  role?: Role;

  @ApiPropertyOptional({ enum: StatusAktif })
  @IsEnum(StatusAktif)
  @IsOptional()
  @EmptyToUndefined()
  status?: StatusAktif;
}

export class CreateUserDto {
  @ApiProperty({ example: 'koordinator.sdm@lemigas.esdm.go.id' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Koordinator SDM' })
  @IsString()
  nama: string;

  @ApiProperty({ minLength: 6, example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, example: Role.Koordinator })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({
    enum: Role,
    isArray: true,
    description: 'Role tambahan selain role default',
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  @IsOptional()
  roles?: Role[];

  @ApiPropertyOptional({
    description: 'Unit kerja (koordinator unit aktif)',
  })
  @IsUUID()
  @IsOptional()
  id_unit_kerja?: string;

  @ApiPropertyOptional({ enum: StatusAktif, default: StatusAktif.AKTIF })
  @IsEnum(StatusAktif)
  @IsOptional()
  status?: StatusAktif;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @EmptyToUndefined()
  nama?: string;

  @ApiPropertyOptional({ minLength: 6 })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Role default' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    enum: Role,
    isArray: true,
    description:
      'Daftar role (termasuk default). Jika diisi, akan sync UserRole',
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  @IsOptional()
  roles?: Role[];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id_unit_kerja?: string;

  @ApiPropertyOptional({ enum: StatusAktif })
  @IsEnum(StatusAktif)
  @IsOptional()
  status?: StatusAktif;
}

export class UserItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  nama: string;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional({ nullable: true })
  nama_role?: string | null;

  @ApiProperty({ isArray: true, example: ['SUPERADMIN', 'KEUANGAN'] })
  roles: string[];

  @ApiPropertyOptional({ isArray: true })
  roles_detail?: Array<{ id: string; kode: string; nama: string }>;

  @ApiPropertyOptional({ nullable: true })
  id_unit_kerja?: string | null;

  @ApiPropertyOptional({ nullable: true })
  nama_unit_kerja?: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}
