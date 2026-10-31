import { useState } from 'react';
import dayjs from 'dayjs';
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
import { DueDateModal } from '../DueDateModal';
import type { TicketRowProps } from './TicketRow.types';
import './TicketRow.css';

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
	if (editing && (!canEdit || ticket.state === 'DONE')) setEditing(false);
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
				</div>
			</div>
			<div className='ticket-date'>
				<span className='muted'>Fecha objetivo</span>
				<span>
					{dayjs(ticket.targetDate.slice(0, 10)).format('DD/MM/YYYY')}
				</span>
			</div>
			<div className='ticket-date'>
				<span className='muted'>Fecha límite</span>
				<span>
					{ticket.dueDate
						? dayjs(ticket.dueDate.slice(0, 10)).format(
								'DD/MM/YYYY',
							)
						: 'Sin fecha límite'}
				</span>
			</div>
			<div className='ticket-date'>
				<span className='muted'>Última actualización</span>
				<time
					dateTime={ticket.lastModified}
					title={absolute}
					aria-label={absolute}
				>
					{dayjs(ticket.lastModified).format(
						'DD/MM/YYYY - HH:mm [h]',
					)}
				</time>
			</div>
			<div className='action'>
				{canEdit && ticket.state !== 'DONE' && (
					<button
						className='icon-button'
						type='button'
						disabled={pending}
						onClick={() => setEditing(true)}
						aria-label={`Editar fecha límite de ${ticket.key}`}
						title='Editar fecha límite'
					>
						<CalendarDays
							size={17}
							aria-hidden='true'
						/>
					</button>
				)}
				{editing && canEdit && ticket.state !== 'DONE' && (
					<DueDateModal
						ticketKey={ticket.key}
						initialDate={ticket.dueDate?.slice(0, 10) ?? ''}
						disabled={pending}
						onClose={() => setEditing(false)}
						onSave={(date) => {
							save(
								ticket.id,
								new Date(`${date}T00:00:00Z`).toISOString(),
							);
						}}
					/>
				)}
				{pending && <span role='status'>Guardando…</span>}
			</div>
		</article>
	);
}
