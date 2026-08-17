import type { CaptureSession, CaptureStatus } from '../shared/types.js';
import { SESSION_ID_PREFIX } from '../shared/constants.js';

let sessionCounter = 0;

const VALID_TRANSITIONS: Record<CaptureStatus, readonly CaptureStatus[]> = {
  IDLE: ['CAPTURING'],
  CAPTURING: ['STITCHING', 'ERROR'],
  STITCHING: ['READY', 'ERROR'],
  READY: ['IDLE', 'CAPTURING'],
  ERROR: ['IDLE', 'CAPTURING'],
};

export class CaptureSessionManager {
  private session: CaptureSession | null = null;

  get current(): CaptureSession | null {
    return this.session;
  }

  get isActive(): boolean {
    return this.session?.status === 'CAPTURING' || this.session?.status === 'STITCHING';
  }

  start(tabId: number): CaptureSession {
    this.session = {
      id: `${SESSION_ID_PREFIX}${Date.now()}-${++sessionCounter}`,
      tabId,
      status: 'IDLE',
      startedAt: Date.now(),
    };

    this.transition('CAPTURING');
    return this.session;
  }

  transition(next: CaptureStatus): void {
    if (!this.session) {
      throw new Error('No active capture session.');
    }

    const allowed = VALID_TRANSITIONS[this.session.status];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid transition: ${this.session.status} -> ${next}`);
    }

    this.session = { ...this.session, status: next };
  }

  fail(): void {
    if (this.session && (this.session.status === 'CAPTURING' || this.session.status === 'STITCHING')) {
      this.session = { ...this.session, status: 'ERROR' };
    }
  }

  resetToIdle(): void {
    if (this.session && (this.session.status === 'READY' || this.session.status === 'ERROR')) {
      this.session = { ...this.session, status: 'IDLE' };
    }
  }

  validateSession(sessionId: string): boolean {
    return this.session?.id === sessionId;
  }
}
