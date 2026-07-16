import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PhotoContext } from '../entities/ticket-photo.entity';

export class AddTicketPhotoDto {
  @ApiProperty({
    description: 'Path or URL to the stored image (upload wiring lands in Step 4)',
    example: 'uploads/tickets/PLT-2026-0001/overview.jpg',
  })
  @IsString()
  storagePath: string;

  @ApiProperty({
    enum: PhotoContext,
    description: 'What the photo documents',
    example: PhotoContext.INTAKE_OVERVIEW,
  })
  @IsEnum(PhotoContext)
  context: PhotoContext;

  @ApiPropertyOptional({ description: 'Optional caption', example: 'Front view at intake' })
  @IsOptional()
  @IsString()
  caption?: string;
}
