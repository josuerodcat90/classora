export type TicketState =
	'REPORTED' | 'IN_PROGRESS' | 'PENDING_SECURITY' | 'DONE';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Ticket = {
	id: string;
	key: string;
	asset: string;
	assignedTeam: string | null;
	assignee: string;
	severity: Severity;
	state: TicketState;
	targetDate: string;
	dueDate: string | null;
	lastModified: string;
};
