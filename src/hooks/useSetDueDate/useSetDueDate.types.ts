import type { QueryKey } from '@tanstack/react-query';
import type { Ticket } from '../../domain/ticket.types';

export type Input = { id: string; dueDate: string };
export type Snapshot = {
	key: QueryKey;
	ticket: Ticket;
	index: number;
	removed: boolean;
};
