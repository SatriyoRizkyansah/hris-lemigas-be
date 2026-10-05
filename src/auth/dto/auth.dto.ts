import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@lemigas.esdm.go.id' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class AksesItemDto {
  @ApiProperty({ example: 'eyJhbGciOiJI...' })
  token!: string;

  @ApiProperty({ example: 'Operator' })
  akses!: string;
}

export class LoginUserDto {
  @ApiProperty({ example: '012ace5b-e8fe-4411-8d05-deb79e2979ae' })
  id_pegawai!: string;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  nama!: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg' })
  foto?: string;

  @ApiProperty({ type: [AksesItemDto] })
  akses!: AksesItemDto[];
}
