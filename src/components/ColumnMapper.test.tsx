import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ColumnMapper from './ColumnMapper';

describe('ColumnMapper', () => {
  it('calls onChange with the updated mapping when a source column is selected', async () => {
    const onChange = vi.fn();
    render(
      <ColumnMapper
        sourceHeaders={['First Name', 'Last Name']}
        targetFields={[{ key: 'firstName', label: 'First Name', required: true }]}
        mapping={{}}
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Map First Name' }));
    await userEvent.click(await screen.findByRole('option', { name: 'First Name' }));
    expect(onChange).toHaveBeenCalledWith({ firstName: 'First Name' });
  });

  it('calls onChange with undefined when "— none —" is selected', async () => {
    const onChange = vi.fn();
    render(
      <ColumnMapper
        sourceHeaders={['Phone']}
        targetFields={[{ key: 'phone', label: 'Phone', required: true }]}
        mapping={{ phone: 'Phone' }}
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Map Phone' }));
    await userEvent.click(await screen.findByRole('option', { name: '— none —' }));
    expect(onChange).toHaveBeenCalledWith({ phone: undefined });
  });

  it('marks required fields with an asterisk', () => {
    render(
      <ColumnMapper
        sourceHeaders={['Phone']}
        targetFields={[{ key: 'phone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }]}
        mapping={{}}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Phone').parentElement?.textContent).toContain('*');
    expect(screen.getByText('Email').parentElement?.textContent).not.toContain('*');
  });
});
