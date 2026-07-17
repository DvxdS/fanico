import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ALL_STAFF,
  FRONT_DESK,
  MANAGERS,
  PRODUCTION,
} from '../../common/constants/role-groups';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddTicketItemDto } from './dto/add-ticket-item.dto';
import { AddTicketPhotoDto } from './dto/add-ticket-photo.dto';
import {
  CancelTicketDto,
  CloseOnCreditDto,
  DisputeTicketDto,
} from './dto/reason.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { RecordPaymentsDto } from '../payments/dto/record-payment.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles(...FRONT_DESK)
  @ApiOperation({ summary: 'Create a new ticket in DRAFT status' })
  @ApiResponse({ status: 201, description: 'Draft ticket created' })
  @ApiResponse({ status: 400, description: 'Invalid shop/customer/service or bad payload' })
  create(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(orgId, user.userId, dto);
  }

  @Patch(':id')
  @Roles(...FRONT_DESK)
  @ApiOperation({ summary: 'Update a DRAFT ticket (notes, promised pickup)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket updated' })
  @ApiResponse({ status: 400, description: 'Ticket is not editable (not DRAFT)' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  update(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(orgId, id, dto);
  }

  @Post(':id/items')
  @Roles(...FRONT_DESK)
  @ApiOperation({ summary: 'Add a line item to a DRAFT ticket' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 201, description: 'Item added, total recomputed' })
  @ApiResponse({ status: 400, description: 'Ticket not DRAFT, or service not in org' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  addItem(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketItemDto,
  ) {
    return this.ticketsService.addItem(orgId, id, dto);
  }

  @Post(':id/photos')
  @Roles(...FRONT_DESK)
  @ApiOperation({ summary: 'Attach a photo (path/URL only in this step)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 201, description: 'Photo attached' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  addPhoto(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketPhotoDto,
  ) {
    return this.ticketsService.addPhoto(orgId, id, user.userId, dto);
  }

  @Post(':id/commit')
  @HttpCode(200)
  @Roles(...FRONT_DESK)
  @Audit('ticket', AuditAction.TRANSITION)
  @ApiOperation({ summary: 'Commit a DRAFT ticket -> OPEN (needs item + intake photo)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket committed to OPEN' })
  @ApiResponse({ status: 400, description: 'Invalid transition or guard not met' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  commit(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.commit(orgId, id, user.userId);
  }

  @Post(':id/to-production')
  @HttpCode(200)
  @Roles(...PRODUCTION)
  @Audit('ticket', AuditAction.TRANSITION)
  @ApiOperation({
    summary: 'OPEN -> IN_PRODUCTION (interim manual transition; Step 3 automates via batches)',
  })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket moved to IN_PRODUCTION' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  toProduction(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.toProduction(orgId, id, user.userId);
  }

  @Post(':id/ready')
  @HttpCode(200)
  @Roles(...PRODUCTION)
  @Audit('ticket', AuditAction.TRANSITION)
  @ApiOperation({
    summary: 'IN_PRODUCTION -> READY (interim manual transition; Step 3 automates via batches)',
  })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket marked READY' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  markReady(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.markReady(orgId, id, user.userId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(...MANAGERS)
  @Audit('ticket', AuditAction.TRANSITION)
  @ApiOperation({ summary: 'Cancel an OPEN ticket (manager+)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  cancel(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTicketDto,
  ) {
    return this.ticketsService.cancel(orgId, id, user.userId, dto.reason);
  }

  @Post(':id/dispute')
  @HttpCode(200)
  @Roles(...FRONT_DESK)
  @Audit('ticket', AuditAction.TRANSITION)
  @ApiOperation({ summary: 'Open a dispute on a ticket (any state except closed/archived)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket marked DISPUTED' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing reason' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  dispute(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeTicketDto,
  ) {
    return this.ticketsService.dispute(orgId, id, user.userId, dto.reason);
  }

  @Post(':id/payments')
  @HttpCode(201)
  @Roles(...FRONT_DESK)
  @Audit('payment', AuditAction.CREATE)
  @ApiOperation({ summary: 'Record one or more payments (may auto-close a READY ticket)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 201, description: 'Payment(s) recorded' })
  @ApiResponse({ status: 400, description: 'Ticket not payable in its current state' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  recordPayments(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentsDto,
  ) {
    return this.ticketsService.recordPayments(orgId, id, user.userId, dto);
  }

  @Post(':id/close-on-credit')
  @HttpCode(200)
  @Roles(...MANAGERS)
  @Audit('ticket', AuditAction.TRANSITION)
  @ApiOperation({ summary: 'READY -> PARTIALLY_CLOSED, releasing before full payment (manager+)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket partially closed on credit' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing reason' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  closeOnCredit(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseOnCreditDto,
  ) {
    return this.ticketsService.closeOnCredit(orgId, id, user.userId, dto.reason);
  }

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'List tickets (org-scoped) with filters + pagination' })
  @ApiResponse({ status: 200, description: 'Paged list of tickets' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.findAll(orgId, query);
  }

  @Get('by-number/:number')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Fetch a ticket by its human-readable number' })
  @ApiParam({ name: 'number', description: 'Ticket number, e.g. PLT-2026-0001' })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findByNumber(
    @CurrentOrgId() orgId: string,
    @Param('number') ticketNumber: string,
  ) {
    return this.ticketsService.findByNumber(orgId, ticketNumber);
  }

  @Get(':id')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Fetch a ticket by id (with items, photos, payments, events)' })
  @ApiParam({ name: 'id', description: 'Ticket id (uuid)' })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.findOne(orgId, id);
  }
}
