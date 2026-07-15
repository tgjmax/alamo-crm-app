import { describe, expect, it } from 'vitest';
import { ticketingName } from './ticketingName';

describe('ticketingName', () => {
  it('formats last name / first + middle', () => {
    expect(ticketingName({ firstName: 'Jane', middleName: 'Ann', lastName: 'Smith' })).toBe('Smith/Jane Ann');
  });

  it('omits the middle name when blank', () => {
    expect(ticketingName({ firstName: 'Jane', middleName: '', lastName: 'Smith' })).toBe('Smith/Jane');
    expect(ticketingName({ firstName: 'Jane', lastName: 'Smith' })).toBe('Smith/Jane');
  });

  it('trims padded name parts so no trailing space leaks into the joined given name', () => {
    expect(ticketingName({ firstName: 'Jane', middleName: 'Ann ', lastName: 'Smith' })).toBe('Smith/Jane Ann');
    expect(ticketingName({ firstName: ' Jane', middleName: 'Ann', lastName: 'Smith' })).toBe('Smith/Jane Ann');
  });
});
