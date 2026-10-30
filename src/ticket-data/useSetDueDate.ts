import {
	useMutation,
	useMutationState,
	useQueryClient,
	type QueryKey,
	type QueryClient,
} from '@tanstack/react-query';
import type { Ticket } from '../domain/ticket.types';
import type { TicketListParams } from '../ticket-filters/ticketListParams';
import { ApiError, ticketKeys, type TicketPage } from './ticketQueries';

const pendingByClient = new WeakMap<QueryClient, Set<string>>();

type Input = { id: string; dueDate: string };
type Snapshot = {
	key: QueryKey;
	ticket: Ticket;
	index: number;
	removed: boolean;
};

export function usePendingTicketIds() {
	return useMutationState({
		filters: { mutationKey: ['tickets', 'setDueDate'], status: 'pending' },
		select: (mutation) => (mutation.state.variables as Input).id,
	});
}

export function useSetDueDate(token: string) {
	const client = useQueryClient();
	return useMutation({
		mutationKey: ['tickets', 'setDueDate'],
		mutationFn: async ({ id, dueDate }: Input): Promise<Ticket> => {
			const response = await fetch(
				new URL(
					`/api/v1/tickets/${encodeURIComponent(id)}`,
					window.location.origin,
				),
				{
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ dueDate }),
				},
			);
			if (!response.ok) throw new ApiError(response.status);
			return response.json() as Promise<Ticket>;
		},
		onMutate: async ({ id, dueDate }) => {
			let pending = pendingByClient.get(client);
			if (!pending) {
				pending = new Set();
				pendingByClient.set(client, pending);
			}
			if (pending.has(id))
				throw new Error('An update for this ticket is already pending');
			pending.add(id);
			await client.cancelQueries({ queryKey: ticketKeys.lists });
			const snapshots: Snapshot[] = [];
			for (const [key, page] of client.getQueriesData<TicketPage>({
				queryKey: ticketKeys.lists,
			})) {
				if (!page || key[2] !== token) continue;
				const index = page.data.findIndex((ticket) => ticket.id === id);
				if (index < 0) continue;
				const ticket = page.data[index];
				const updated = {
					...ticket,
					dueDate,
					state:
						ticket.state === 'REPORTED'
							? ('IN_PROGRESS' as const)
							: ticket.state,
				};
				const params = key[3] as TicketListParams;
				const removed =
					params.state !== 'ALL' && params.state !== updated.state;
				snapshots.push({ key, ticket, index, removed });
				client.setQueryData<TicketPage>(key, {
					...page,
					data: removed
						? page.data.filter((item) => item.id !== id)
						: page.data.map((item) =>
								item.id === id ? updated : item,
							),
					pagination: removed
						? {
								...page.pagination,
								totalElements:
									page.pagination.totalElements - 1,
							}
						: page.pagination,
				});
			}
			return { snapshots };
		},
		onSuccess: (updated, { id, dueDate }, context) => {
			for (const snapshot of context?.snapshots ?? []) {
				client.setQueryData<TicketPage>(snapshot.key, (page) => {
					if (!page) return page;
					return {
						...page,
						data: page.data.map((ticket) =>
							ticket.id === id && ticket.dueDate === dueDate
								? updated
								: ticket,
						),
					};
				});
			}
		},
		onError: (_error, { id, dueDate }, context) => {
			for (const snapshot of context?.snapshots ?? []) {
				client.setQueryData<TicketPage>(snapshot.key, (page) => {
					if (!page) return page;
					const current = page.data.find((item) => item.id === id);
					if (!snapshot.removed && current?.dueDate !== dueDate)
						return page;
					if (snapshot.removed && current) return page;
					const data = snapshot.removed
						? [...page.data]
						: page.data.map((item) =>
								item.id === id ? snapshot.ticket : item,
							);
					if (snapshot.removed)
						data.splice(snapshot.index, 0, snapshot.ticket);
					return {
						...page,
						data,
						pagination: snapshot.removed
							? {
									...page.pagination,
									totalElements:
										page.pagination.totalElements + 1,
								}
							: page.pagination,
					};
				});
			}
		},
		onSettled: (_data, _error, { id }, context) => {
			if (!context) return;
			const pending = pendingByClient.get(client);
			pending?.delete(id);
			if (pending?.size === 0)
				return client.invalidateQueries({ queryKey: ticketKeys.lists });
		},
	});
}
