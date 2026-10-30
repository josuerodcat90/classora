import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TicketListParams } from '../../domain';
import { TicketFilters } from './TicketFilters';

const params: TicketListParams = {
	offset: 0,
	limit: 20,
	q: '',
	state: 'REPORTED',
	severity: 'HIGH',
	sort: 'LAST_MODIFIED',
	direction: 'DESC',
};

describe('TicketFilters', () => {
	it('renders controlled values and forwards search, filter and reset interactions', () => {
		const onSearch = vi.fn();
		const onFilter = vi.fn();
		const onReset = vi.fn();
		render(
			<TicketFilters
				params={params}
				search='draft'
				onSearch={onSearch}
				onFilter={onFilter}
				onReset={onReset}
			/>,
		);

		expect(
			screen.getByRole('complementary', { name: 'Filtros' }),
		).toBeInTheDocument();
		expect(screen.getByLabelText('Buscar')).toHaveValue('draft');
		expect(screen.getByLabelText('Buscar')).toHaveAttribute(
			'maxLength',
			'256',
		);
		expect(screen.getByLabelText('Estado')).toHaveValue('REPORTED');
		expect(screen.getByLabelText('Severidad')).toHaveValue('HIGH');
		expect(screen.getByLabelText('Ordenar por')).toHaveValue(
			'LAST_MODIFIED',
		);
		expect(screen.getByLabelText('Dirección')).toHaveValue('DESC');
		fireEvent.change(screen.getByLabelText('Buscar'), {
			target: { value: 'asset' },
		});
		expect(onSearch).toHaveBeenCalledWith('asset');
		fireEvent.change(screen.getByLabelText('Estado'), {
			target: { value: 'DONE' },
		});
		fireEvent.change(screen.getByLabelText('Severidad'), {
			target: { value: 'LOW' },
		});
		fireEvent.change(screen.getByLabelText('Ordenar por'), {
			target: { value: 'TARGET_DATE' },
		});
		fireEvent.change(screen.getByLabelText('Dirección'), {
			target: { value: 'ASC' },
		});
		expect(onFilter.mock.calls).toEqual([
			[{ state: 'DONE' }],
			[{ severity: 'LOW' }],
			[{ sort: 'TARGET_DATE' }],
			[{ direction: 'ASC' }],
		]);
		fireEvent.click(
			screen.getByRole('button', { name: 'Restablecer filtros' }),
		);
		expect(onReset).toHaveBeenCalledOnce();
	});
});
