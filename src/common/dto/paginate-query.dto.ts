import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PaginateQuery {
  @ApiProperty({ required: false, description: 'Pencarian / filter bebas' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ type: Number, default: 10, required: false })
  @IsNumber({ maxDecimalPlaces: 0 }, { message: 'Limit harus berupa angka' })
  @Min(1, { message: 'Limit minimal 1' })
  @Type(() => Number)
  limit = 10;

  @ApiProperty({ type: Number, default: 1, required: false })
  @IsNumber({ maxDecimalPlaces: 0 }, { message: 'Page harus berupa angka' })
  @Min(1, { message: 'Page minimal 1' })
  @Type(() => Number)
  page = 1;
}
