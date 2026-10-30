import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../../domain/ticket.types';
import { TicketRow } from './TicketRow';

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

describe('TicketRow', () => {
	it('displays ticket metadata and an accessible modification time', () => {
		const { container } = render(
			<TicketRow
				ticket={ticket}
				canEdit={false}
				pending={false}
				save={vi.fn()}
			/>,
		);
		expect(screen.getByText('SEC-1')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: 'Payments' }),
		).toBeInTheDocument();
		expect(screen.getByText('Reportado')).toBeInTheDocument();
		expect(screen.getByText('Alta')).toBeInTheDocument();
		expect(screen.getByText('Sin fecha límite')).toBeInTheDocument();
		expect(container.querySelector('time')).toHaveAttribute(
			'datetime',
			ticket.lastModified,
		);
		expect(container.querySelector('time')).toHaveAttribute(
			'title',
			expect.stringMatching(/^1 de enero de 2026, \d{2}:\d{2}$/),
		);
		expect(
			screen.queryByRole('button', { name: /Editar fecha/ }),
		).not.toBeInTheDocument();
	});

	it('hides editing for completed tickets and disables it while pending', () => {
		const { rerender } = render(
			<TicketRow
				ticket={{ ...ticket, state: 'DONE' }}
				canEdit
				pending={false}
				save={vi.fn()}
			/>,
		);
		expect(
			screen.queryByRole('button', { name: /Editar fecha/ }),
		).not.toBeInTheDocument();
		rerender(
			<TicketRow
				ticket={ticket}
				canEdit
				pending
				save={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		).toBeDisabled();
		expect(screen.getByRole('status')).toHaveTextContent('Guardando…');
	});

	it('cancels a draft and saves a selected date as UTC', () => {
		const save = vi.fn();
		render(
			<TicketRow
				ticket={{ ...ticket, dueDate: '2027-01-10T00:00:00Z' }}
				canEdit
				pending={false}
				save={save}
			/>,
		);
		expect(screen.getByText('10 ene 2027')).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		);
		const date = screen.getByLabelText('Fecha límite para SEC-1');
		expect(date).toHaveValue('2027-01-10');
		fireEvent.change(date, { target: { value: '2027-01-20' } });
		fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(save).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		);
		expect(screen.getByLabelText('Fecha límite para SEC-1')).toHaveValue(
			'2027-01-10',
		);
		fireEvent.change(screen.getByLabelText('Fecha límite para SEC-1'), {
			target: { value: '2027-01-20' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
		expect(save).toHaveBeenCalledExactlyOnceWith(
			'1',
			'2027-01-20T00:00:00.000Z',
		);
		expect(
			screen.queryByLabelText('Fecha límite para SEC-1'),
		).not.toBeInTheDocument();
	});

	it('disables the date and save controls if an open editor becomes pending', () => {
		const save = vi.fn();
		const { rerender } = render(
			<TicketRow
				ticket={ticket}
				canEdit
				pending={false}
				save={save}
			/>,
		);
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Editar fecha límite de SEC-1',
			}),
		);
		rerender(
			<TicketRow
				ticket={ticket}
				canEdit
				pending
				save={save}
			/>,
		);
		expect(screen.getByLabelText('Fecha límite para SEC-1')).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
		expect(save).not.toHaveBeenCalled();
	});
});
