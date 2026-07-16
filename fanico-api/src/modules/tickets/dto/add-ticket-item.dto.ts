import { CreateTicketItemDto } from './create-ticket.dto';

/** Body for POST /tickets/:id/items — same shape as a create-time line item. */
export class AddTicketItemDto extends CreateTicketItemDto {}
