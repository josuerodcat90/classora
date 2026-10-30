import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
	useCurrentUser,
	useTickets,
	usePendingTicketIds,
	useSetDueDate,
	useTicketListParams,
} from '../../hooks';
import { TicketFilters, TicketList } from '../../components';
import type { TicketsPageProps } from './TicketsPage.types';
import './TicketsPage.css';

export function TicketsPage({ token = 'mock-editor' }: TicketsPageProps) {
	const { params, setFilters, setPage, reset } = useTicketListParams();
	const location = useLocation();
	const [searchState, setSearchState] = useState({
		location,
		value: params.q,
	});
	if (searchState.location !== location) {
		setSearchState({ location, value: params.q });
	}
	const search =
		searchState.location === location ? searchState.value : params.q;
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const tickets = useTickets(params, token);
	const user = useCurrentUser(token);
	const mutation = useSetDueDate(token);
	const pending = usePendingTicketIds();

	useEffect(() => {
		clearTimeout(timer.current);
		return () => clearTimeout(timer.current);
	}, [location]);

	function changeSearch(value: string) {
		setSearchState({ location, value });
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setFilters({ q: value }), 350);
	}

	function updateFilter(patch: Parameters<typeof setFilters>[0]) {
		clearTimeout(timer.current);
		setFilters({ ...patch, q: search });
	}

	function changePage(offset: number) {
		clearTimeout(timer.current);
		if (search !== params.q) setFilters({ q: search });
		else setPage(offset);
	}

	function resetFilters() {
		clearTimeout(timer.current);
		setSearchState({ location, value: '' });
		reset();
	}

	function save(id: string, dueDate: string) {
		toast('Guardando fecha límite…');
		mutation.mutate(
			{ id, dueDate },
			{
				onSuccess: () => toast.success('Fecha límite actualizada'),
				onError: () =>
					toast.error('No se pudo actualizar la fecha límite'),
			},
		);
	}

	return (
		<>
			<header className='app-header'>
				<strong>
					<span className='brand-mark'>◈</span> Classora{' '}
					<span className='muted'>/ Tickets</span>
				</strong>
				<span className='muted'>Espacio de trabajo</span>
			</header>
			<main className='app-main'>
				<div className='eyebrow'>GESTIÓN DE INCIDENCIAS</div>
				<h1>Tickets</h1>
				<p>Encuentra lo importante y mantén el trabajo al día.</p>
				<div className='layout'>
					<TicketFilters
						params={params}
						search={search}
						onSearch={changeSearch}
						onFilter={updateFilter}
						onReset={resetFilters}
					/>
					<TicketList
						tickets={tickets}
						permissionsError={user.isError}
						canEdit={
							user.data?.permissions.includes('tickets.update') ??
							false
						}
						pending={pending}
						params={params}
						onPage={changePage}
						onSave={save}
					/>
				</div>
			</main>
			<Toaster />
		</>
	);
}
