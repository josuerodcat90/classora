import type { Ticket } from '../domain/ticket.types';

const assets = [
	'identity-service',
	'customer-portal',
	'billing-worker',
	'analytics-api',
	'admin-console',
	'notifications-service',
];
const states: Ticket['state'][] = [
	'REPORTED',
	'IN_PROGRESS',
	'PENDING_SECURITY',
	'DONE',
];
const severities: Ticket['severity'][] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const teams = ['Security', 'Platform', 'Infrastructure', null];
const assignees = [
	'ana@example.com',
	'sam@example.com',
	'alex@example.com',
	'morgan@example.com',
];

export const generatedTickets: Ticket[] = Array.from(
	{ length: 48 },
	(_, index) => {
		const number = 1026 + index;
		return {
			id: `ticket-${number}`,
			key: `SEC-${number}`,
			asset: assets[index % assets.length],
			assignedTeam: teams[Math.floor(index / 3) % teams.length],
			assignee: assignees[Math.floor(index / 5) % assignees.length],
			severity: severities[Math.floor(index / 4) % severities.length],
			state: states[index % states.length],
			targetDate: new Date(Date.UTC(2026, 11, 1 + index)).toISOString(),
			dueDate:
				index % 3 === 0
					? new Date(Date.UTC(2026, 10, 1 + index)).toISOString()
					: null,
			lastModified: new Date(Date.UTC(2026, 9, 4 + index)).toISOString(),
		};
	},
);
