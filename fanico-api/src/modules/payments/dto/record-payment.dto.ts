import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment-record.entity';

export class RecordPaymentDto {
  @ApiProperty({
    enum: PaymentMethod,
    description: 'How the customer paid',
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Amount in XOF', example: 4500 })
  @IsInt()
  @IsPositive()
  amountXof: number;

  @ApiPropertyOptional({
    description: 'Human-typed reference (e.g. mobile-money txn id) — never validated',
    example: 'WAVE-8843201',
  })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ description: 'Optional note', example: 'Deposit at intake' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPaymentsDto {
  @ApiProperty({
    description: 'One or more payments to record against the ticket',
    type: [RecordPaymentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecordPaymentDto)
  payments: RecordPaymentDto[];
}
