import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TicketListParams } from '../../domain';
import type { Ticket } from '../../domain/ticket.types';
import type { TicketListProps } from './TicketList.types';
import { TicketList } from './TicketList';

const params: TicketListParams = {
	offset: 0,
	limit: 1,
	q: '',
	state: 'ALL',
	severity: 'ALL',
	sort: 'LAST_MODIFIED',
	direction: 'DESC',
};
const ticket: Ticket = {
	id: '1',
	key: 'SEC-1',
	asset: 'Payments',
	assignedTeam: null,
	assignee: 'Ana',
	severity: 'HIGH',
	state: 'REPORTED',
	targetDate: '2027-01-20T00:00:00Z',
	dueDate: null,
	lastModified: '2026-01-01T12:00:00Z',
};
const refetch = vi.fn();
function query(overrides: object = {}): TicketListProps['tickets'] {
	return {
		isPending: false,
		isError: false,
		isSuccess: true,
		data: {
			data: [ticket],
			pagination: { offset: 0, limit: 1, totalElements: 3 },
		},
		refetch,
		...overrides,
	} as unknown as TicketListProps['tickets'];
}
function props(overrides: Partial<TicketListProps> = {}): TicketListProps {
	return {
		tickets: query(),
		permissionsError: false,
		canEdit: true,
		pending: [],
		params,
		onPage: vi.fn(),
		onSave: vi.fn(),
		...overrides,
	};
}

describe('TicketList', () => {
	it('shows loading, error retry, and permissions error', () => {
		refetch.mockClear();
		const { rerender } = render(
			<TicketList
				{...props({
					tickets: query({
						isPending: true,
						isSuccess: false,
						data: undefined,
					}),
				})}
			/>,
		);
		expect(screen.getByRole('status')).toHaveTextContent(
			'Cargando tickets…',
		);
		rerender(
			<TicketList
				{...props({
					tickets: query({
						isError: true,
						isSuccess: false,
						data: undefined,
					}),
					permissionsError: true,
				})}
			/>,
		);
		expect(screen.getAllByRole('alert')).toHaveLength(2);
		expect(
			screen.getByText(/La edición no está disponible/),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
		expect(refetch).toHaveBeenCalledOnce();
	});

	it('shows empty results without pagination', () => {
		render(
			<TicketList
				{...props({
					tickets: query({
						data: {
							data: [],
							pagination: {
								offset: 0,
								limit: 1,
								totalElements: 0,
							},
						},
					}),
				})}
			/>,
		);
		expect(screen.getByText('0 resultados')).toBeInTheDocument();
		expect(
			screen.getByText('No se encontraron tickets.'),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('navigation', { name: 'Paginación' }),
		).not.toBeInTheDocument();
	});

	it('renders rows and forwards pagination offsets with boundary states', () => {
		const onPage = vi.fn();
		const { rerender } = render(
			<TicketList {...props({ onPage, pending: ['1'] })} />,
		);
		expect(screen.getByText('3 resultados')).toBeInTheDocument();
		expect(screen.getByText('1–1 de 3 tickets')).toBeInTheDocument();
		expect(
			screen.getByRole('region', { name: 'Tickets' }),
		).toContainElement(screen.getByText('SEC-1'));
		expect(
			screen.getByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: 'Página anterior' }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: 'Página 1' }),
		).toHaveAttribute('aria-current', 'page');
		fireEvent.click(
			screen.getByRole('button', { name: 'Página siguiente' }),
		);
		fireEvent.click(screen.getByRole('button', { name: 'Página 3' }));
		expect(onPage.mock.calls).toEqual([[1], [2]]);
		rerender(
			<TicketList
				{...props({ onPage, params: { ...params, offset: 2 } })}
			/>,
		);
		expect(
			screen.getByRole('button', { name: 'Página siguiente' }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: 'Página 3' }),
		).toHaveAttribute('aria-current', 'page');
		fireEvent.click(
			screen.getByRole('button', { name: 'Página anterior' }),
		);
		expect(onPage).toHaveBeenLastCalledWith(1);
	});

	it('forwards permission and save to each row', () => {
		const onSave = vi.fn();
		const { rerender } = render(
			<TicketList {...props({ canEdit: false, onSave })} />,
		);
		expect(
			screen.queryByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		).not.toBeInTheDocument();
		rerender(<TicketList {...props({ onSave })} />);
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		);
		fireEvent.change(screen.getByLabelText('Fecha límite para SEC-1'), {
			target: { value: '2027-01-20' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
		expect(onSave).toHaveBeenCalledExactlyOnceWith(
			'1',
			'2027-01-20T00:00:00.000Z',
		);
	});
});
