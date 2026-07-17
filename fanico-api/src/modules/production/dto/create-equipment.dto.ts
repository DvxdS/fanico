import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { EquipmentType } from '../entities/equipment.entity';

export class CreateEquipmentDto {
  @ApiProperty({ description: 'Shop the equipment belongs to', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Display name', example: 'Washer #1' })
  @IsString()
  name: string;

  @ApiProperty({ enum: EquipmentType, example: EquipmentType.WASHER })
  @IsEnum(EquipmentType)
  type: EquipmentType;

  @ApiPropertyOptional({ description: 'Capacity in kg', example: 12 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacityKg?: number;
}
