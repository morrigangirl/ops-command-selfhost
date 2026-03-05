import type { Person } from './types';

export type DropValidationReason =
  | 'valid'
  | 'missing-source-or-target'
  | 'same-person'
  | 'inactive-source-or-target'
  | 'would-create-cycle'
  | 'already-reports-to-target';

export interface DropValidationResult {
  valid: boolean;
  reason: DropValidationReason;
}

function wouldCreateCycle(personId: string, managerId: string, people: Person[]): boolean {
  let current: string | null = managerId;
  const visited = new Set<string>();

  while (current) {
    if (current === personId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const person = people.find((p) => p.id === current);
    current = person?.managerId || null;
  }

  return false;
}

export function validateManagerDrop(
  sourceId: string,
  targetId: string,
  people: Person[],
): DropValidationResult {
  const source = people.find((p) => p.id === sourceId);
  const target = people.find((p) => p.id === targetId);

  if (!source || !target) {
    return { valid: false, reason: 'missing-source-or-target' };
  }

  if (source.id === target.id) {
    return { valid: false, reason: 'same-person' };
  }

  if (!source.active || !target.active) {
    return { valid: false, reason: 'inactive-source-or-target' };
  }

  if (source.managerId === target.id) {
    return { valid: false, reason: 'already-reports-to-target' };
  }

  if (wouldCreateCycle(source.id, target.id, people)) {
    return { valid: false, reason: 'would-create-cycle' };
  }

  return { valid: true, reason: 'valid' };
}
