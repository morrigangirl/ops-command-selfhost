import { describe, expect, it } from 'vitest';
import { validateManagerDrop } from '@/lib/people-dnd';
import type { Person } from '@/lib/types';

function makePerson(overrides: Partial<Person> & Pick<Person, 'id' | 'name'>): Person {
  return {
    id: overrides.id,
    name: overrides.name,
    role: overrides.role || 'Role',
    active: overrides.active ?? true,
    managerId: overrides.managerId ?? null,
    last1on1: null,
    lastStrategicDeepDive: null,
    lastHumanCheckin: null,
    default1on1CadenceDays: 7,
    defaultStrategyCadenceDays: 30,
    defaultCheckinCadenceDays: 14,
  };
}

describe('validateManagerDrop', () => {
  const people: Person[] = [
    makePerson({ id: 'a', name: 'A', managerId: null }),
    makePerson({ id: 'b', name: 'B', managerId: 'a' }),
    makePerson({ id: 'c', name: 'C', managerId: 'b' }),
    makePerson({ id: 'd', name: 'D', managerId: null, active: false }),
  ];

  it('rejects self drop', () => {
    expect(validateManagerDrop('a', 'a', people)).toEqual({ valid: false, reason: 'same-person' });
  });

  it('rejects descendant cycle', () => {
    expect(validateManagerDrop('a', 'c', people)).toEqual({ valid: false, reason: 'would-create-cycle' });
  });

  it('rejects inactive source or target', () => {
    expect(validateManagerDrop('d', 'a', people)).toEqual({ valid: false, reason: 'inactive-source-or-target' });
    expect(validateManagerDrop('a', 'd', people)).toEqual({ valid: false, reason: 'inactive-source-or-target' });
  });

  it('rejects same manager assignment', () => {
    expect(validateManagerDrop('b', 'a', people)).toEqual({ valid: false, reason: 'already-reports-to-target' });
  });

  it('accepts valid reassignment', () => {
    expect(validateManagerDrop('c', 'a', people)).toEqual({ valid: true, reason: 'valid' });
  });
});
