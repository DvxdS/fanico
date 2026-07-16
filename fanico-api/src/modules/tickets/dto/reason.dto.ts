import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Body for POST /tickets/:id/dispute — a reason is mandatory. */
export class DisputeTicketDto {
  @ApiProperty({ description: 'Why the ticket is being disputed', example: 'Garment returned stained' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/** Body for POST /tickets/:id/close-on-credit — a reason is mandatory. */
export class CloseOnCreditDto {
  @ApiProperty({
    description: 'Why the ticket is being released before full payment',
    example: 'Regular customer, will settle balance tomorrow',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/** Body for POST /tickets/:id/cancel — reason optional. */
export class CancelTicketDto {
  @ApiPropertyOptional({ description: 'Optional cancellation reason', example: 'Customer changed their mind' })
  @IsOptional()
  @IsString()
  reason?: string;
}
