import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class OpenDrawerDto {
  @ApiProperty({ description: 'Shop the drawer is opened in', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Cash float in the drawer at open, in XOF', example: 20000 })
  @IsInt()
  @Min(0)
  startingAmountXof: number;

  @ApiPropertyOptional({ description: 'Optional note', example: 'Morning shift' })
  @IsOptional()
  @IsString()
  notes?: string;
}
