import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DueDateModal } from './DueDateModal';

describe('DueDateModal', () => {
	it('locks the page at its current position and restores it on unmount', () => {
		const scrollTo = vi
			.spyOn(window, 'scrollTo')
			.mockImplementation(() => {});
		const originalScrollY = Object.getOwnPropertyDescriptor(
			window,
			'scrollY',
		);
		Object.defineProperty(window, 'scrollY', {
			configurable: true,
			value: 240,
		});
		document.body.style.position = 'relative';
		const { unmount } = render(
			<DueDateModal
				ticketKey='SEC-1'
				initialDate=''
				onClose={vi.fn()}
				onSave={vi.fn()}
				disabled={false}
			/>,
		);
		expect(document.body.style.position).toBe('fixed');
		expect(document.body.style.top).toBe('-240px');
		unmount();
		expect(document.body.style.position).toBe('relative');
		expect(document.body.style.top).toBe('');
		expect(scrollTo).toHaveBeenCalledWith(0, 240);
		document.body.style.position = '';
		if (originalScrollY)
			Object.defineProperty(window, 'scrollY', originalScrollY);
		scrollTo.mockRestore();
	});
	it('requires a valid date and submits the selected value', () => {
		const save = vi.fn();
		render(
			<DueDateModal
				ticketKey='SEC-1'
				initialDate=''
				onClose={vi.fn()}
				onSave={save}
				disabled={false}
			/>,
		);
		const dialog = screen.getByRole('dialog', {
			name: 'Editar fecha límite',
		});
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveFocus();
		const input = screen.getByLabelText('Fecha límite para SEC-1');
		expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
		fireEvent.blur(input);
		expect(
			screen.getByText('Selecciona una fecha válida.'),
		).toBeInTheDocument();
		fireEvent.change(input, { target: { value: '2027-01-20' } });
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
		expect(save).toHaveBeenCalledWith('2027-01-20');
	});
	it.each(['Cancelar', 'Cerrar', 'Escape'])(
		'closes without saving through %s',
		(action) => {
			const close = vi.fn();
			render(
				<DueDateModal
					ticketKey='SEC-1'
					initialDate=''
					onClose={close}
					onSave={vi.fn()}
					disabled={false}
				/>,
			);
			if (action === 'Escape')
				fireEvent.keyDown(screen.getByRole('dialog'), {
					key: 'Escape',
				});
			else fireEvent.click(screen.getByRole('button', { name: action }));
			expect(close).toHaveBeenCalledOnce();
		},
	);
});
