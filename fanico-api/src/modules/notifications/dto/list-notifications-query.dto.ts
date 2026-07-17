import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { NotificationStatus } from '../entities/notification.entity';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by event type',
    example: 'ticket.ready',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

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
