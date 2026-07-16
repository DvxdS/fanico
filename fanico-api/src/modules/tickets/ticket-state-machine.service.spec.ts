import { EntityManager } from 'typeorm';
import { TicketStateMachineService } from './ticket-state-machine.service';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketItem } from './entities/ticket-item.entity';
import { TicketPhoto } from './entities/ticket-photo.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { PaymentsService } from '../payments/payments.service';
import { InvalidTicketTransitionException } from '../../common/exceptions/invalid-ticket-transition.exception';

const ACTOR = 'user-1';

function makeTicket(status: TicketStatus, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    status,
    totalXof: 5000,
    paidXof: 0,
    ...overrides,
  } as Ticket;
}

describe('TicketStateMachineService', () => {
  let service: TicketStateMachineService;
  let payments: { sumForTicket: jest.Mock };
  let manager: {
    count: jest.Mock;
    save: jest.Mock;
    insert: jest.Mock;
  };

  beforeEach(() => {
    payments = { sumForTicket: jest.fn() };
    service = new TicketStateMachineService(payments as unknown as PaymentsService);
    manager = {
      count: jest.fn(),
      save: jest.fn(async (_entity: unknown, t: unknown) => t),
      insert: jest.fn(async () => undefined),
    };
  });

  const em = () => manager as unknown as EntityManager;

  function expectEventWritten(to: TicketStatus) {
    expect(manager.insert).toHaveBeenCalledWith(
      TicketEvent,
      expect.objectContaining({
        payload: expect.objectContaining({ to }),
        actorUserId: ACTOR,
      }),
    );
  }

  // --- commit: DRAFT -> OPEN ------------------------------------------------
  describe('commit (DRAFT -> OPEN)', () => {
    it('succeeds with >=1 item and an intake_overview photo', async () => {
      manager.count
        .mockResolvedValueOnce(1) // items
        .mockResolvedValueOnce(1); // intake_overview photos
      const ticket = makeTicket(TicketStatus.DRAFT);

      const result = await service.commit(em(), ticket, ACTOR);

      expect(result.status).toBe(TicketStatus.OPEN);
      expect(result.openedByUserId).toBe(ACTOR);
      expect(manager.count).toHaveBeenCalledWith(TicketItem, expect.anything());
      expect(manager.count).toHaveBeenCalledWith(TicketPhoto, expect.anything());
      expectEventWritten(TicketStatus.OPEN);
    });

    it('throws when there are no items', async () => {
      manager.count.mockResolvedValueOnce(0);
      await expect(
        service.commit(em(), makeTicket(TicketStatus.DRAFT), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });

    it('throws when there is no intake_overview photo', async () => {
      manager.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      await expect(
        service.commit(em(), makeTicket(TicketStatus.DRAFT), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });

    it('throws when not in DRAFT', async () => {
      await expect(
        service.commit(em(), makeTicket(TicketStatus.OPEN), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });

  // --- toProduction: OPEN -> IN_PRODUCTION ---------------------------------
  describe('toProduction (OPEN -> IN_PRODUCTION)', () => {
    it('succeeds from OPEN', async () => {
      const result = await service.toProduction(
        em(),
        makeTicket(TicketStatus.OPEN),
        ACTOR,
      );
      expect(result.status).toBe(TicketStatus.IN_PRODUCTION);
      expectEventWritten(TicketStatus.IN_PRODUCTION);
    });

    it('throws when not OPEN', async () => {
      await expect(
        service.toProduction(em(), makeTicket(TicketStatus.DRAFT), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });

  // --- markReady: IN_PRODUCTION -> READY -----------------------------------
  describe('markReady (IN_PRODUCTION -> READY)', () => {
    it('succeeds from IN_PRODUCTION', async () => {
      const result = await service.markReady(
        em(),
        makeTicket(TicketStatus.IN_PRODUCTION),
        ACTOR,
      );
      expect(result.status).toBe(TicketStatus.READY);
      expectEventWritten(TicketStatus.READY);
    });

    it('throws when not IN_PRODUCTION', async () => {
      await expect(
        service.markReady(em(), makeTicket(TicketStatus.OPEN), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });

  // --- close: READY|PARTIALLY_CLOSED -> CLOSED -----------------------------
  describe('close (-> CLOSED)', () => {
    it('closes a READY ticket when payments equal total', async () => {
      payments.sumForTicket.mockResolvedValue(5000);
      const ticket = makeTicket(TicketStatus.READY);
      const result = await service.close(em(), ticket, ACTOR);
      expect(result.status).toBe(TicketStatus.CLOSED);
      expect(result.closedByUserId).toBe(ACTOR);
      expect(result.pickedUpAt).toBeInstanceOf(Date);
      expectEventWritten(TicketStatus.CLOSED);
    });

    it('closes from PARTIALLY_CLOSED once fully paid', async () => {
      payments.sumForTicket.mockResolvedValue(5000);
      const result = await service.close(
        em(),
        makeTicket(TicketStatus.PARTIALLY_CLOSED),
        ACTOR,
      );
      expect(result.status).toBe(TicketStatus.CLOSED);
    });

    it('throws when payments do not equal total', async () => {
      payments.sumForTicket.mockResolvedValue(3000);
      await expect(
        service.close(em(), makeTicket(TicketStatus.READY), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });

    it('throws when not READY/PARTIALLY_CLOSED', async () => {
      await expect(
        service.close(em(), makeTicket(TicketStatus.OPEN), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });

  // --- closeOnCredit: READY -> PARTIALLY_CLOSED ----------------------------
  describe('closeOnCredit (READY -> PARTIALLY_CLOSED)', () => {
    it('succeeds from READY with a reason', async () => {
      const result = await service.closeOnCredit(
        em(),
        makeTicket(TicketStatus.READY),
        ACTOR,
        'regular customer',
      );
      expect(result.status).toBe(TicketStatus.PARTIALLY_CLOSED);
      expectEventWritten(TicketStatus.PARTIALLY_CLOSED);
    });

    it('throws without a reason', async () => {
      await expect(
        service.closeOnCredit(em(), makeTicket(TicketStatus.READY), ACTOR, '  '),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });

    it('throws when not READY', async () => {
      await expect(
        service.closeOnCredit(em(), makeTicket(TicketStatus.OPEN), ACTOR, 'x'),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });

  // --- cancel: OPEN -> CANCELLED -------------------------------------------
  describe('cancel (OPEN -> CANCELLED)', () => {
    it('succeeds from OPEN', async () => {
      const result = await service.cancel(
        em(),
        makeTicket(TicketStatus.OPEN),
        ACTOR,
        'customer left',
      );
      expect(result.status).toBe(TicketStatus.CANCELLED);
      expectEventWritten(TicketStatus.CANCELLED);
    });

    it('throws when not OPEN', async () => {
      await expect(
        service.cancel(em(), makeTicket(TicketStatus.READY), ACTOR),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });

  // --- dispute: any except CLOSED/ARCHIVED/DISPUTED -> DISPUTED -------------
  describe('dispute (-> DISPUTED)', () => {
    it('succeeds from OPEN with a reason', async () => {
      const result = await service.dispute(
        em(),
        makeTicket(TicketStatus.OPEN),
        ACTOR,
        'garment damaged',
      );
      expect(result.status).toBe(TicketStatus.DISPUTED);
      expectEventWritten(TicketStatus.DISPUTED);
    });

    it('throws from CLOSED', async () => {
      await expect(
        service.dispute(em(), makeTicket(TicketStatus.CLOSED), ACTOR, 'x'),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });

    it('throws without a reason', async () => {
      await expect(
        service.dispute(em(), makeTicket(TicketStatus.OPEN), ACTOR, ''),
      ).rejects.toBeInstanceOf(InvalidTicketTransitionException);
    });
  });
});
