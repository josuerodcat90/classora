import type { Ticket } from './ticket.types';

export type TicketPage = {
	data: Ticket[];
	pagination: { offset: number; limit: number; totalElements: number };
};
