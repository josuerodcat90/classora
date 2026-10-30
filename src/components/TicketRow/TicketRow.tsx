import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import {
	AlertCircle,
	CalendarDays,
	CheckCircle2,
	ChevronsUp,
	Clock3,
	Equal,
	Shield,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';
import { severities, states } from '../../utils';
import type { TicketRowProps } from './TicketRow.types';
import './TicketRow.css';

dayjs.extend(relativeTime);
dayjs.locale('es');

const stateIcons = {
	REPORTED: AlertCircle,
	IN_PROGRESS: Clock3,
	PENDING_SECURITY: Shield,
	DONE: CheckCircle2,
};
const severityIcons = {
	CRITICAL: ChevronsUp,
	HIGH: ChevronUp,
	MEDIUM: Equal,
	LOW: ChevronDown,
};

export function TicketRow({ ticket, canEdit, pending, save }: TicketRowProps) {
	const [editing, setEditing] = useState(false);
	const [date, setDate] = useState(ticket.dueDate?.slice(0, 10) ?? '');
	const StateIcon = stateIcons[ticket.state];
	const SeverityIcon = severityIcons[ticket.severity];
	const absolute = dayjs(ticket.lastModified).format(
		'D [de] MMMM [de] YYYY, HH:mm',
	);
	return (
		<article className='ticket'>
			<div>
				<span className='muted'>{ticket.key}</span>
				<h3>{ticket.asset}</h3>
				<div className='meta'>
					<span className={`pill ${ticket.state.toLowerCase()}`}>
						<StateIcon
							size={13}
							aria-hidden='true'
						/>
						{states[ticket.state]}
					</span>
					<span className={`pill ${ticket.severity.toLowerCase()}`}>
						<SeverityIcon
							size={13}
							aria-hidden='true'
						/>
						{severities[ticket.severity]}
					</span>
					<span className='muted'>
						Actualizado{' '}
						<time
							dateTime={ticket.lastModified}
							title={absolute}
							aria-label={`${dayjs(ticket.lastModified).fromNow()}, ${absolute}`}
						>
							{dayjs(ticket.lastModified).fromNow()}
						</time>
					</span>
				</div>
			</div>
			<div className='action'>
				<span>
					{ticket.dueDate
						? dayjs(ticket.dueDate.slice(0, 10)).format(
								'D MMM YYYY',
							)
						: 'Sin fecha límite'}
				</span>
				{canEdit && ticket.state !== 'DONE' && !editing && (
					<button
						className='icon-button'
						type='button'
						disabled={pending}
						onClick={() => {
							setDate(ticket.dueDate?.slice(0, 10) ?? '');
							setEditing(true);
						}}
						aria-label={`Editar fecha límite de ${ticket.key}`}
						title='Editar fecha límite'
					>
						<CalendarDays
							size={17}
							aria-hidden='true'
						/>
					</button>
				)}
				{editing && canEdit && (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							if (!date || !canEdit) return;
							save(
								ticket.id,
								new Date(`${date}T00:00:00Z`).toISOString(),
							);
							setEditing(false);
						}}
					>
						<label
							className='sr-only'
							htmlFor={`date-${ticket.id}`}
						>
							Fecha límite para {ticket.key}
						</label>
						<input
							id={`date-${ticket.id}`}
							type='date'
							required
							value={date}
							disabled={pending}
							onChange={(event) => setDate(event.target.value)}
						/>
						<button disabled={pending}>Guardar</button>
						<button
							type='button'
							onClick={() => setEditing(false)}
						>
							Cancelar
						</button>
					</form>
				)}
				{pending && <span role='status'>Guardando…</span>}
			</div>
		</article>
	);
}
