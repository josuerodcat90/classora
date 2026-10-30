import type { Severity, TicketState } from '../../domain/ticket.types';
import type { TicketListParams } from '../../domain';
import { severities, states } from '../../utils';
import type { TicketFiltersProps } from './TicketFilters.types';
import './TicketFilters.css';

export function TicketFilters({
	params,
	search,
	onSearch,
	onFilter,
	onReset,
}: TicketFiltersProps) {
	return (
		<aside
			className='ticket-filters'
			aria-labelledby='filters'
		>
			<h2 id='filters'>Filtros</h2>
			<p className='muted'>
				Los filtros se aplican al cambiar; la búsqueda espera a que
				termines de escribir.
			</p>
			<label>
				Buscar
				<input
					type='search'
					value={search}
					maxLength={256}
					placeholder='Identificador o activo'
					onChange={(event) => onSearch(event.target.value)}
				/>
			</label>
			<label>
				Estado
				<select
					value={params.state}
					onChange={(event) =>
						onFilter({
							state: event.target.value as TicketState | 'ALL',
						})
					}
				>
					<option value='ALL'>Todos</option>
					{Object.entries(states).map(([value, label]) => (
						<option
							key={value}
							value={value}
						>
							{label}
						</option>
					))}
				</select>
			</label>
			<label>
				Severidad
				<select
					value={params.severity}
					onChange={(event) =>
						onFilter({
							severity: event.target.value as Severity | 'ALL',
						})
					}
				>
					<option value='ALL'>Todas</option>
					{Object.entries(severities).map(([value, label]) => (
						<option
							key={value}
							value={value}
						>
							{label}
						</option>
					))}
				</select>
			</label>
			<label>
				Ordenar por
				<select
					value={params.sort}
					onChange={(event) =>
						onFilter({
							sort: event.target
								.value as TicketListParams['sort'],
						})
					}
				>
					<option value='LAST_MODIFIED'>Última modificación</option>
					<option value='TARGET_DATE'>Fecha objetivo</option>
				</select>
			</label>
			<label>
				Dirección
				<select
					value={params.direction}
					onChange={(event) =>
						onFilter({
							direction: event.target
								.value as TicketListParams['direction'],
						})
					}
				>
					<option value='DESC'>Descendente</option>
					<option value='ASC'>Ascendente</option>
				</select>
			</label>
			<button
				className='reset'
				onClick={onReset}
			>
				Restablecer filtros
			</button>
		</aside>
	);
}
