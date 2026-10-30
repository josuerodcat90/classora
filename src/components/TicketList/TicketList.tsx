import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TicketRow } from '../TicketRow';
import type { TicketListProps } from './TicketList.types';
import './TicketList.css';

export function TicketList({
	tickets,
	permissionsError,
	canEdit,
	pending,
	params,
	onPage,
	onSave,
}: TicketListProps) {
	const total = tickets.data?.pagination.totalElements ?? 0;
	const pages = Math.ceil(total / params.limit);
	const current = Math.floor(params.offset / params.limit) + 1;
	const pageNumbers = Array.from(
		{ length: Math.min(pages, 7) },
		(_, i) => Math.max(1, Math.min(current - 3, pages - 6)) + i,
	);
	return (
		<section
			className='list'
			aria-labelledby='results'
		>
			<div className='list-head'>
				<div>
					<h2 id='results'>Todos los tickets</h2>
					<p>{total} resultados</p>
				</div>
			</div>
			{tickets.isPending && (
				<p
					className='message'
					role='status'
				>
					Cargando tickets…
				</p>
			)}
			{tickets.isError && (
				<p
					className='message'
					role='alert'
				>
					No se pudieron cargar los tickets.{' '}
					<button onClick={() => tickets.refetch()}>
						Reintentar
					</button>
				</p>
			)}
			{permissionsError && (
				<p
					className='message'
					role='alert'
				>
					No se pudieron cargar los permisos. La edición no está
					disponible.
				</p>
			)}
			{tickets.isSuccess && tickets.data.data.length === 0 && (
				<p className='message'>No se encontraron tickets.</p>
			)}
			<div
				className='list-rows'
				role='region'
				aria-label='Tickets'
				tabIndex={0}
			>
				{tickets.data?.data.map((ticket) => (
					<TicketRow
						key={ticket.id}
						ticket={ticket}
						canEdit={canEdit}
						pending={pending.includes(ticket.id)}
						save={onSave}
					/>
				))}
			</div>
			{tickets.isSuccess && pages > 0 && (
				<div className='footer'>
					<p>
						{Math.min(params.offset + 1, total)}–
						{Math.min(
							params.offset + tickets.data.data.length,
							total,
						)}{' '}
						de {total} tickets
					</p>
					<nav
						className='pages'
						aria-label='Paginación'
					>
						<button
							aria-label='Página anterior'
							disabled={current <= 1}
							onClick={() => onPage((current - 2) * params.limit)}
						>
							<ChevronLeft size={16} />
						</button>
						{pageNumbers.map((page) => (
							<button
								key={page}
								aria-label={`Página ${page}`}
								aria-current={
									page === current ? 'page' : undefined
								}
								onClick={() =>
									onPage((page - 1) * params.limit)
								}
							>
								{page}
							</button>
						))}
						<button
							aria-label='Página siguiente'
							disabled={current >= pages}
							onClick={() => onPage(current * params.limit)}
						>
							<ChevronRight size={16} />
						</button>
					</nav>
				</div>
			)}
		</section>
	);
}
