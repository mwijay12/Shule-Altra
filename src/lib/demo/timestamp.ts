/**
 * @fileOverview Lightweight Firestore-compatible Timestamp used by the offline demo datastore.
 */

export class DemoTimestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now(): DemoTimestamp {
    return DemoTimestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): DemoTimestamp {
    return DemoTimestamp.fromMillis(date.getTime());
  }

  static fromMillis(millis: number): DemoTimestamp {
    const seconds = Math.floor(millis / 1000);
    const nanoseconds = Math.floor((millis - seconds * 1000) * 1e6);
    return new DemoTimestamp(seconds, nanoseconds);
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  isEqual(other: DemoTimestamp): boolean {
    return this.toMillis() === other.toMillis();
  }

  toJSON(): { __type: 'timestamp'; ms: number } {
    return { __type: 'timestamp', ms: this.toMillis() };
  }

  toString(): string {
    return `Timestamp(seconds=${this.seconds}, nanoseconds=${this.nanoseconds})`;
  }
}

/** Alias so application code can keep using `Timestamp` semantics. */
export { DemoTimestamp as Timestamp };

export interface ServerTimestampSentinel {
  __type: 'serverTimestamp';
}
export interface IncrementSentinel {
  __type: 'increment';
  value: number;
}
export interface ArrayUnionSentinel {
  __type: 'arrayUnion';
  values: any[];
}
export interface DeleteFieldSentinel {
  __type: 'deleteField';
}

export function serverTimestamp(): ServerTimestampSentinel {
  return { __type: 'serverTimestamp' };
}

export function increment(value: number): IncrementSentinel {
  return { __type: 'increment', value };
}

export function arrayUnion(...values: any[]): ArrayUnionSentinel {
  return { __type: 'arrayUnion', values };
}

export function arrayRemove(...values: any[]): ArrayUnionSentinel {
  return { __type: 'arrayUnion', values: values.map((v) => ({ __remove: v })) };
}

export function deleteField(): DeleteFieldSentinel {
  return { __type: 'deleteField' };
}

export function isTimestamp(value: any): value is DemoTimestamp {
  return value instanceof DemoTimestamp;
}

export function isSentinel(value: any): boolean {
  return !!value && typeof value === 'object' && typeof value.__type === 'string';
}
