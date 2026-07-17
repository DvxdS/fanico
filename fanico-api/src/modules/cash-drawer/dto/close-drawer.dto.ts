import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CloseDrawerDto {
  @ApiProperty({
    description: 'Counted cash in the drawer at close, in XOF',
    example: 41500,
  })
  @IsInt()
  @Min(0)
  endingAmountXof: number;

  @ApiPropertyOptional({ description: 'Optional note', example: 'Handover to evening shift' })
  @IsOptional()
  @IsString()
  notes?: string;
}
