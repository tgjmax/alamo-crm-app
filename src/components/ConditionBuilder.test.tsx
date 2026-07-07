import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ConditionBuilder from './ConditionBuilder';
import { GroupCondition, GroupFieldMeta } from '../api/groups.api';

const FIELDS: GroupFieldMeta[] = [
  { key: 'airlineCode', label: 'Airline', type: 'string', operators: ['equals', 'contains', 'in'] },
  { key: 'amount', label: 'Amount', type: 'number', operators: ['equals', 'greaterThan', 'lessThan', 'between'] },
  { key: 'date', label: 'Booking date', type: 'date', operators: ['equals', 'greaterThan', 'lessThan', 'between'] },
  { key: 'paymentType', label: 'Payment type', type: 'enum', enumValues: ['card', 'check', 'cash'], operators: ['equals', 'in'] },
  { key: 'customerVerified', label: 'Customer verified', type: 'boolean', operators: ['equals'] },
];
const USERS = [{ id: 'u1', name: 'Anna' }];

// The component is fully controlled, so the test harness must own state and
// feed onChange back into the conditions prop — a bare spy would freeze the
// inputs and multi-character typing could never accumulate.
function Harness({ initial, onChange }: { initial: GroupCondition[]; onChange: (next: GroupCondition[]) => void }) {
  const [conditions, setConditions] = useState(initial);
  return (
    <ConditionBuilder
      fields={FIELDS}
      users={USERS}
      conditions={conditions}
      onChange={(next) => {
        setConditions(next);
        onChange(next);
      }}
    />
  );
}

function setup(conditions: GroupCondition[] = []) {
  const onChange = vi.fn();
  render(<Harness initial={conditions} onChange={onChange} />);
  return onChange;
}

async function pick(name: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('ConditionBuilder', () => {
  it('adds a default condition (first field, first operator, empty value)', async () => {
    const onChange = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add condition' }));
    expect(onChange).toHaveBeenCalledWith([{ field: 'airlineCode', operator: 'equals', value: '' }]);
  });

  it('only offers the field-type operators, and typing a string value emits it', async () => {
    const onChange = setup([{ field: 'airlineCode', operator: 'equals', value: '' }]);
    await userEvent.click(screen.getByRole('combobox', { name: 'Condition 1 operator' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['equals', 'contains', 'in']);
    await userEvent.click(options[0]);

    await userEvent.type(screen.getByRole('textbox', { name: 'Condition 1 value' }), 'Q');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'airlineCode', operator: 'equals', value: 'Q' }]);
  });

  it('switching field resets operator and value; number between renders two inputs', async () => {
    const onChange = setup([{ field: 'airlineCode', operator: 'contains', value: 'QR' }]);
    await pick('Condition 1 field', 'Amount');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'amount', operator: 'equals', value: 0 }]);

    onChange.mockClear();
    render(<Harness initial={[{ field: 'amount', operator: 'between', value: [0, 0] }]} onChange={onChange} />);
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Condition 1 value from' }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Condition 1 value from' }), '10');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'amount', operator: 'between', value: [10, 0] }]);
    expect(screen.getByRole('spinbutton', { name: 'Condition 1 value to' })).toBeInTheDocument();
  });

  it('enum in renders one checkbox per value; boolean renders a Yes/No select', async () => {
    const onChange = setup([{ field: 'paymentType', operator: 'in', value: [] }]);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Condition 1 value cash' }));
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'paymentType', operator: 'in', value: ['cash'] }]);

    onChange.mockClear();
    render(<Harness initial={[{ field: 'customerVerified', operator: 'equals', value: false }]} onChange={onChange} />);
    await pick('Condition 1 value', 'Yes');
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'customerVerified', operator: 'equals', value: true }]);
  });

  it('removes a condition', async () => {
    const onChange = setup([
      { field: 'airlineCode', operator: 'equals', value: 'QR' },
      { field: 'amount', operator: 'equals', value: 5 },
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove condition 1' }));
    expect(onChange).toHaveBeenCalledWith([{ field: 'amount', operator: 'equals', value: 5 }]);
  });
});
