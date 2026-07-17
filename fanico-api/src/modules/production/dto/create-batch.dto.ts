import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBatchDto {
  @ApiProperty({ description: 'Shop the batch runs in', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({
    description: 'Wash-program / grouping label (free string)',
    example: 'cotton_60',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Equipment assigned to the batch',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @ApiProperty({
    description:
      'Ticket item ids to batch. Must be unbatched, in this shop, and share ' +
      'the same service category.',
    type: [String],
    example: ['3f1c...uuid', '9a2d...uuid'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  ticketItemIds: string[];
}
