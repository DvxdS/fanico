import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum QcResult {
  PASS = 'pass',
  FAIL = 'fail',
}

export class QcBatchDto {
  @ApiProperty({
    enum: QcResult,
    description: 'QC outcome. pass -> READY; fail -> reverts to IRONING',
    example: QcResult.PASS,
  })
  @IsEnum(QcResult)
  result: QcResult;

  @ApiPropertyOptional({
    description: 'Required when result is fail — why QC failed',
    example: 'Collar still stained',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
