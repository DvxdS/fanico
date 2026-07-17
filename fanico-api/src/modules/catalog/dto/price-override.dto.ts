import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreatePriceOverrideDto {
  @ApiProperty({ description: 'Shop the override applies to', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Service being overridden', format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ description: 'Shop-specific base price in XOF', example: 2000 })
  @IsInt()
  @Min(0)
  basePriceXof: number;
}

export class UpdatePriceOverrideDto {
  @ApiProperty({ description: 'New shop-specific base price in XOF', example: 2200 })
  @IsInt()
  @Min(0)
  basePriceXof: number;
}

export class ListPriceOverridesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by shop', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ description: 'Page size (default 20, max 100)', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Rows to skip (default 0)', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
