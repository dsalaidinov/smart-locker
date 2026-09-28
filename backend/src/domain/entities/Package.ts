import { v4 as uuidv4 } from 'uuid';
import { LockerSize } from '../value-objects/LockerSize';

/**
 * Package entity — represents a physical package to be stored.
 * Immutable after creation: only `id` and `size` are needed.
 */
export class Package {
  public readonly id: string;
  public readonly size: LockerSize;

  constructor(id: string, size: LockerSize) {
    this.id = id;
    this.size = size;
  }

  static create(size: LockerSize): Package {
    return new Package(uuidv4(), size);
  }
}

