import type { Ticket } from '../../domain/ticket.types';

export type TicketRowProps = {
	ticket: Ticket;
	canEdit: boolean;
	pending: boolean;
	save: (id: string, date: string) => void;
};
