import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTicketItemDto {
  @ApiProperty({ description: 'Service being sold', format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ description: 'Quantity (items, kg, or sets)', example: 3 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description:
      'Override unit price in XOF. Omit to use the shop price override, ' +
      'else the service base price.',
    example: 1500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceXof?: number;

  @ApiPropertyOptional({
    description: 'Free-form modifiers snapshot',
    example: { starch: 'light', express: true },
  })
  @IsOptional()
  @IsObject()
  modifiers?: Record<string, unknown>;
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Shop the ticket belongs to', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Customer the ticket is for', format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Promised pickup time (ISO 8601)',
    example: '2026-07-20T17:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  promisedPickupAt?: string;

  @ApiPropertyOptional({ description: 'Free-text notes', example: 'Handle with care' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Initial line items (can also be added later while DRAFT)',
    type: [CreateTicketItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketItemDto)
  items?: CreateTicketItemDto[];
}
