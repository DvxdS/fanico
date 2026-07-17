import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { BatchStage } from '../entities/batch.entity';

class PaginationQuery {
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

export class ListBatchesQueryDto extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Filter by shop', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ enum: BatchStage, description: 'Filter by current stage' })
  @IsOptional()
  @IsEnum(BatchStage)
  stage?: BatchStage;
}

export class ListEquipmentQueryDto extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Filter by shop', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;
}
