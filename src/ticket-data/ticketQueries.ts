import { useQuery } from '@tanstack/react-query';
import type { Ticket } from '../domain/ticket.types';
import {
	serializeTicketListParams,
	type TicketListParams,
} from '../ticket-filters/ticketListParams';

export type TicketPage = {
	data: Ticket[];
	pagination: { offset: number; limit: number; totalElements: number };
};

export type CurrentUser = { permissions: string[] };

export class ApiError extends Error {
	constructor(public readonly status: number) {
		super(`Request failed with status ${status}`);
	}
}

async function request<T>(
	path: string,
	token: string,
	signal: AbortSignal,
): Promise<T> {
	const response = await fetch(new URL(path, window.location.origin), {
		headers: { Authorization: `Bearer ${token}` },
		signal,
	});
	if (!response.ok) throw new ApiError(response.status);
	return response.json() as Promise<T>;
}

export const ticketKeys = {
	lists: ['tickets', 'list'] as const,
	list: (params: TicketListParams, token: string) =>
		['tickets', 'list', token, params] as const,
};

export function useTickets(params: TicketListParams, token: string) {
	return useQuery({
		queryKey: ticketKeys.list(params, token),
		queryFn: ({ signal }) =>
			request<TicketPage>(
				`/api/v1/tickets?${serializeTicketListParams(params)}`,
				token,
				signal,
			),
	});
}

export function useCurrentUser(token: string) {
	return useQuery({
		queryKey: ['me', token],
		queryFn: ({ signal }) =>
			request<CurrentUser>('/api/v1/me', token, signal),
	});
}
