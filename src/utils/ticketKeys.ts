import type { TicketListParams } from '../domain';

export const ticketKeys = {
	lists: ['tickets', 'list'] as const,
	list: (params: TicketListParams, token: string) =>
		['tickets', 'list', token, params] as const,
};
