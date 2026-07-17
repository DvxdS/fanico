import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when a batch stage transition is not permitted (e.g. advancing past
 * READY, or a QC action from the wrong stage). Surfaces as HTTP 400 with a
 * clear message — never a silent no-op or 500.
 */
export class InvalidBatchTransitionException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
