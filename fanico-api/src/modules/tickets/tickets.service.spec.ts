import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';

/**
 * Cross-org isolation: a user from Org A must not be able to fetch a ticket
 * belonging to Org B, even with a guessed UUID. Every read is scoped by orgId,
 * so a foreign ticket resolves to null -> 404. (Fuller multi-org integration
 * suite lands in Step 5.)
 */
describe('TicketsService — org scoping', () => {
  let ticketRepo: { findOne: jest.Mock };
  let service: TicketsService;

  beforeEach(() => {
    ticketRepo = { findOne: jest.fn() };
    service = new TicketsService(
      ticketRepo as unknown as Repository<Ticket>,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('findOne always filters by orgId and 404s on a foreign ticket', async () => {
    // Org B's ticket is invisible to Org A -> repo returns null.
    ticketRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('org-A', 'guessed-uuid-from-org-B'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(ticketRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'guessed-uuid-from-org-B', orgId: 'org-A' },
      }),
    );
  });

  it('findByNumber always filters by orgId and 404s on a foreign ticket', async () => {
    ticketRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findByNumber('org-A', 'PLT-2026-0001'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(ticketRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: 'org-A', ticketNumber: 'PLT-2026-0001' },
      }),
    );
  });
});
