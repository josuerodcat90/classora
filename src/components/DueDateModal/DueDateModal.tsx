import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { DueDateModalProps } from './DueDateModal.types';
import './DueDateModal.css';

export function DueDateModal({
	ticketKey,
	initialDate,
	disabled,
	onClose,
	onSave,
}: DueDateModalProps) {
	const [date, setDate] = useState(initialDate);
	const [touched, setTouched] = useState(false);
	const titleId = useId();
	const errorId = useId();
	const inputId = useId();
	const dialog = useRef<HTMLDivElement>(null);
	const closing = useRef(false);
	const valid =
		/^\d{4}-\d{2}-\d{2}$/.test(date) &&
		!Number.isNaN(Date.parse(date)) &&
		new Date(date).toISOString().slice(0, 10) === date;
	useEffect(() => {
		const previous = document.activeElement as HTMLElement | null;
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		const body = document.body;
		const previousStyle = {
			position: body.style.position,
			top: body.style.top,
			left: body.style.left,
			width: body.style.width,
		};
		Object.assign(body.style, {
			position: 'fixed',
			top: `-${scrollY}px`,
			left: `-${scrollX}px`,
			width: '100%',
		});
		const root = document.getElementById('root');
		const wasInert = root?.inert;
		if (root) root.inert = true;
		dialog.current?.focus();
		return () => {
			if (root) root.inert = Boolean(wasInert);
			Object.assign(body.style, previousStyle);
			if (scrollX || scrollY) window.scrollTo(scrollX, scrollY);
			previous?.focus({ preventScroll: true });
		};
	}, []);
	function close() {
		if (closing.current) return;
		closing.current = true;
		const overlay = dialog.current?.parentElement;
		if (
			!overlay ||
			typeof overlay.animate !== 'function' ||
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
		) {
			onClose();
			return;
		}
		const animation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 200,
			easing: 'ease-in-out',
			fill: 'forwards',
		});
		animation.onfinish = onClose;
	}
	function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
		if (event.key !== 'Tab') return;
		const elements = Array.from(
			dialog.current?.querySelectorAll<HTMLElement>(
				'button:not(:disabled), input:not(:disabled)',
			) ?? [],
		);
		if (!elements.length) return;
		const first = elements[0],
			last = elements[elements.length - 1];
		if (
			event.shiftKey &&
			(document.activeElement === first ||
				document.activeElement === dialog.current)
		) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
	return createPortal(
		<div className='due-modal-overlay'>
			<div
				ref={dialog}
				className='due-modal'
				role='dialog'
				tabIndex={-1}
				aria-modal='true'
				aria-labelledby={titleId}
				onKeyDown={keyDown}
			>
				<div className='due-modal-header'>
					<div>
						<h2 id={titleId}>Editar fecha límite</h2>
						<p>Ticket {ticketKey}</p>
					</div>
					<button
						type='button'
						className='due-modal-close'
						aria-label='Cerrar'
						onClick={close}
					>
						<X
							size={20}
							aria-hidden='true'
						/>
					</button>
				</div>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (valid && !disabled && !closing.current) {
							onSave(date);
							close();
						}
					}}
				>
					<label htmlFor={inputId}>
						Fecha límite para {ticketKey}
					</label>
					<input
						id={inputId}
						type='date'
						required
						value={date}
						disabled={disabled}
						aria-invalid={touched && !valid}
						aria-describedby={
							touched && !valid ? errorId : undefined
						}
						onChange={(event) => setDate(event.target.value)}
						onBlur={() => setTouched(true)}
					/>
					{touched && !valid && (
						<span
							id={errorId}
							className='due-modal-error'
							role='status'
						>
							Selecciona una fecha válida.
						</span>
					)}
					<div className='due-modal-actions'>
						<button
							type='button'
							onClick={close}
						>
							Cancelar
						</button>
						<button
							type='submit'
							disabled={!valid || disabled}
						>
							Guardar
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body,
	);
}
