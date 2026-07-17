import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ExpenseCategory } from '../entities/expense.entity';
import { PaymentMethod } from '../../payments/entities/payment-record.entity';

export class CreateExpenseDto {
  @ApiPropertyOptional({
    description: 'Shop the expense belongs to; omit for an org-wide expense',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.DETERGENT_SOFTENER })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: 'Amount in XOF', example: 8000 })
  @IsInt()
  @IsPositive()
  amountXof: number;

  @ApiProperty({ enum: PaymentMethod, description: 'How it was paid', example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Expense date (YYYY-MM-DD)', example: '2026-07-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({ example: 'SODECI' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'Monthly water bill' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Path/URL to a receipt photo', example: 'uploads/expenses/x.jpg' })
  @IsOptional()
  @IsString()
  photoPath?: string;
}
