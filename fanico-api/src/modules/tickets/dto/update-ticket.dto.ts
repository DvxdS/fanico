import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Body for PATCH /tickets/:id — editable only while the ticket is DRAFT. */
export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'Promised pickup time (ISO 8601)',
    example: '2026-07-20T17:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  promisedPickupAt?: string;

  @ApiPropertyOptional({ description: 'Free-text notes', example: 'Customer will pay on pickup' })
  @IsOptional()
  @IsString()
  notes?: string;
}
