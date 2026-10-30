import type { Severity, TicketState } from './ticket.types';

export type TicketListParams = {
	offset: number;
	limit: number;
	q: string;
	state: TicketState | 'ALL';
	severity: Severity | 'ALL';
	sort: 'LAST_MODIFIED' | 'TARGET_DATE';
	direction: 'ASC' | 'DESC';
};
