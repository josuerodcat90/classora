import type { Ticket, TicketPage } from '../../domain';
import type { TicketListParams } from '../../domain';
import { serializeTicketListParams } from '../../utils';
import { request } from '../http';

export function getTickets(
	params: TicketListParams,
	token: string,
	signal: AbortSignal,
) {
	return request<TicketPage>(
		`/api/v1/tickets?${serializeTicketListParams(params)}`,
		token,
		{ signal },
	);
}

export function setDueDate(id: string, dueDate: string, token: string) {
	return request<Ticket>(`/api/v1/tickets/${encodeURIComponent(id)}`, token, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ dueDate }),
	});
}
