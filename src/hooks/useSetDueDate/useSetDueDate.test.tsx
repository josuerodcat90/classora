import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../mocks/ticket-api';
import { ticketKeys } from '../../utils';
import type { TicketPage } from '../../domain';
import { useSetDueDate } from './useSetDueDate';
import { usePendingTicketIds, useTickets } from '..';

const server = setupServer();
const params = {
	offset: 0,
	limit: 20,
	q: '',
	state: 'ALL' as const,
	severity: 'ALL' as const,
	sort: 'LAST_MODIFIED' as const,
	direction: 'DESC' as const,
};
const ticket = {
	id: 'ticket-1024',
	key: 'SEC-1024',
	asset: 'payments-api',
	assignedTeam: 'Security',
	assignee: 'analyst@example.com',
	severity: 'HIGH' as const,
	state: 'REPORTED' as const,
	targetDate: '2026-11-30T23:59:59Z',
	dueDate: null,
	lastModified: '2026-10-01T12:00:00Z',
};
const initial: TicketPage = {
	data: [ticket],
	pagination: { offset: 0, limit: 20, totalElements: 1 },
};
const date = '2026-11-15T10:00:00Z';

beforeAll(() => server.listen());
beforeEach(() => server.resetHandlers(...createMockHandlers()));
afterAll(() => server.close());

function setup(token: string) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	const key = ticketKeys.list(params, token);
	client.setQueryData(key, initial);
	function wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>
				{children}
			</QueryClientProvider>
		);
	}
	return {
		client,
		key,
		...renderHook(() => useSetDueDate(token), { wrapper }),
	};
}

describe('useSetDueDate', () => {
	it('updates the date and state optimistically, then reconciles on success', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		server.use(
			http.patch('/api/v1/tickets/:id', async () => {
				await gate;
				return Response.json({
					...ticket,
					dueDate: date,
					state: 'IN_PROGRESS',
				});
			}),
		);
		const { result, client, key } = setup('mock-editor');
		act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
		await waitFor(() =>
			expect(client.getQueryData<TicketPage>(key)?.data[0]).toMatchObject(
				{ dueDate: date, state: 'IN_PROGRESS' },
			),
		);
		release();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('reconciles inactive cached data with the server response', async () => {
		const serverTicket = {
			...ticket,
			dueDate: date,
			state: 'IN_PROGRESS',
			lastModified: '2026-10-03T00:00:01Z',
		};
		server.use(
			http.patch('/api/v1/tickets/:id', () =>
				Response.json(serverTicket),
			),
		);
		const { result, client, key } = setup('mock-editor');
		act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(client.getQueryData<TicketPage>(key)?.data[0]).toEqual(
			serverTicket,
		);
	});

	it('removes a changed ticket from a REPORTED list and restores it on failure', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		server.use(
			http.patch('/api/v1/tickets/:id', async () => {
				await gate;
				return new Response(null, { status: 409 });
			}),
		);
		const { result, client, key } = setup('mock-editor');
		const filteredKey = ticketKeys.list(
			{ ...params, state: 'REPORTED' },
			'mock-editor',
		);
		client.setQueryData(filteredKey, initial);
		act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
		await waitFor(() =>
			expect(client.getQueryData<TicketPage>(filteredKey)?.data).toEqual(
				[],
			),
		);
		expect(
			client.getQueryData<TicketPage>(filteredKey)?.pagination
				.totalElements,
		).toBe(0);
		expect(client.getQueryData<TicketPage>(key)?.data[0]).toMatchObject({
			state: 'IN_PROGRESS',
			dueDate: date,
		});
		release();
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(client.getQueryData(filteredKey)).toEqual(initial);
		expect(client.getQueryData(key)).toEqual(initial);
	});

	it('rejects a second edit of a ticket while its first edit is pending', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let calls = 0;
		server.use(
			http.patch('/api/v1/tickets/:id', async () => {
				calls++;
				await gate;
				return new Response(null, { status: 409 });
			}),
		);
		const { result, client, key } = setup('mock-editor');
		act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
		await waitFor(() => expect(calls).toBe(1));
		act(() =>
			result.current.mutate({
				id: ticket.id,
				dueDate: '2026-11-16T10:00:00Z',
			}),
		);
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			'An update for this ticket is already pending',
		);
		expect(calls).toBe(1);
		release();
		await waitFor(() => expect(client.isMutating()).toBe(0));
		expect(client.getQueryData(key)).toEqual(initial);
	});

	it('exposes pending ticket IDs so the UI can disable only those edits', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		server.use(
			http.patch('/api/v1/tickets/:id', async () => {
				await gate;
				return Response.json({
					...ticket,
					dueDate: date,
					state: 'IN_PROGRESS',
				});
			}),
		);
		const { result, client } = setup('mock-editor');
		function wrapper({ children }: { children: ReactNode }) {
			return (
				<QueryClientProvider client={client}>
					{children}
				</QueryClientProvider>
			);
		}
		const pending = renderHook(() => usePendingTicketIds(), { wrapper });
		expect(pending.result.current).toEqual([]);
		act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
		await waitFor(() =>
			expect(pending.result.current).toEqual([ticket.id]),
		);
		release();
		await waitFor(() => expect(pending.result.current).toEqual([]));
	});

	it('does not refetch a list while another ticket update is pending', async () => {
		const gates: Array<() => void> = [];
		let fetches = 0;
		const other = { ...ticket, id: 'ticket-1026', key: 'SEC-1026' };
		const page = {
			...initial,
			data: [ticket, other],
			pagination: { ...initial.pagination, totalElements: 2 },
		};
		server.use(
			http.get('/api/v1/tickets', () => {
				fetches++;
				return Response.json(page);
			}),
			http.patch(
				'/api/v1/tickets/:id',
				async ({ request, params: route }) => {
					const body = (await request.json()) as { dueDate: string };
					await new Promise<void>((resolve) => gates.push(resolve));
					return Response.json({
						...(route.id === ticket.id ? ticket : other),
						state: 'IN_PROGRESS',
						dueDate: body.dueDate,
					});
				},
			),
		);
		const { result, client, key } = setup('mock-editor');
		client.setQueryData(key, page);
		function wrapper({ children }: { children: ReactNode }) {
			return (
				<QueryClientProvider client={client}>
					{children}
				</QueryClientProvider>
			);
		}
		const list = renderHook(() => useTickets(params, 'mock-editor'), {
			wrapper,
		});
		await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
		await waitFor(() => expect(client.isFetching()).toBe(0));
		const initialFetches = fetches;
		act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
		await waitFor(() => expect(gates).toHaveLength(1));
		const later = '2026-11-16T10:00:00Z';
		act(() => result.current.mutate({ id: other.id, dueDate: later }));
		await waitFor(() => expect(gates).toHaveLength(2));
		gates[0]();
		await waitFor(() => expect(client.isMutating()).toBe(1));
		expect(fetches).toBe(initialFetches);
		expect(
			client
				.getQueryData<TicketPage>(key)
				?.data.find((item) => item.id === other.id)?.dueDate,
		).toBe(later);
		gates[1]();
		await waitFor(() => expect(client.isMutating()).toBe(0));
		expect(fetches).toBe(initialFetches + 1);
	});

	it.each([403, 409])(
		'restores the cache and exposes HTTP %s',
		async (status) => {
			server.use(
				http.patch(
					'/api/v1/tickets/:id',
					() => new Response(null, { status }),
				),
			);
			const { result, client, key } = setup('mock-editor');
			act(() => result.current.mutate({ id: ticket.id, dueDate: date }));
			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error).toMatchObject({ status });
			expect(client.getQueryData<TicketPage>(key)).toEqual(initial);
		},
	);
});
