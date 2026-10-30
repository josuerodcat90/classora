import { http } from 'msw';
import type { Ticket } from '../domain/ticket.types';

const seed: Ticket[] = [
	{
		id: 'ticket-1024',
		key: 'SEC-1024',
		asset: 'payments-api',
		assignedTeam: 'Security',
		assignee: 'analyst@example.com',
		severity: 'HIGH',
		state: 'REPORTED',
		targetDate: '2026-11-30T23:59:59Z',
		dueDate: null,
		lastModified: '2026-10-01T12:00:00Z',
	},
	{
		id: 'ticket-1025',
		key: 'SEC-1025',
		asset: 'None',
		assignedTeam: null,
		assignee: 'analyst@example.com',
		severity: 'LOW',
		state: 'DONE',
		targetDate: '2026-12-30T23:59:59Z',
		dueDate: null,
		lastModified: '2026-10-02T12:00:00Z',
	},
];

const states = ['REPORTED', 'IN_PROGRESS', 'PENDING_SECURITY', 'DONE'];
const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const json = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), {
		status,
		headers: {
			'Content-Type':
				status === 200
					? 'application/json'
					: 'application/problem+json',
		},
	});
const problem = (status: number, title: string) =>
	json({ type: 'about:blank', title, status }, status);

const leapSeconds = new Set([
	'1972-06-30',
	'1972-12-31',
	'1973-12-31',
	'1974-12-31',
	'1975-12-31',
	'1976-12-31',
	'1977-12-31',
	'1978-12-31',
	'1979-12-31',
	'1981-06-30',
	'1982-06-30',
	'1983-06-30',
	'1985-06-30',
	'1987-12-31',
	'1989-12-31',
	'1990-12-31',
	'1992-06-30',
	'1993-06-30',
	'1994-06-30',
	'1995-12-31',
	'1997-06-30',
	'1998-12-31',
	'2005-12-31',
	'2008-12-31',
	'2012-06-30',
	'2015-06-30',
	'2016-12-31',
]);

function validDate(value: string): boolean {
	const match =
		/^(\d{4})-(\d\d)-(\d\d)[Tt](\d\d):(\d\d):(\d\d)(?:\.\d+)?([Zz]|[+-]\d\d:\d\d)$/.exec(
			value,
		);
	if (!match || value.length > 64) return false;
	const [, year, month, day, hour, minute, second, zone] = match;
	const y = Number(year),
		m = Number(month),
		d = Number(day);
	const days = [
		31,
		y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31,
	];
	const normalized = value.replace('t', 'T').replace('z', 'Z');
	const instant = Date.parse(
		Number(second) === 60
			? normalized.replace(/:60(?=\.|Z|[+-])/, ':59')
			: normalized,
	);
	const leapInstant = Number.isFinite(instant)
		? new Date(instant).toISOString()
		: '';
	return (
		m >= 1 &&
		m <= 12 &&
		d >= 1 &&
		d <= days[m - 1] &&
		Number(hour) <= 23 &&
		Number(minute) <= 59 &&
		Number(second) <= 60 &&
		(zone.toUpperCase() === 'Z' ||
			(Number(zone.slice(1, 3)) <= 23 &&
				Number(zone.slice(4, 6)) <= 59)) &&
		Number.isFinite(instant) &&
		(Number(second) !== 60 ||
			(leapInstant.slice(11, 19) === '23:59:59' &&
				leapSeconds.has(leapInstant.slice(0, 10))))
	);
}

export function createMockHandlers() {
	const tickets = seed.map((ticket) => ({ ...ticket }));
	let revision = 0;
	const origin = window.location.origin.replace(
		/[.*+?^${}()|[\]\\]/g,
		'\\$&',
	);
	const authorized = (request: Request) => {
		const token = request.headers.get('authorization');
		return token === 'Bearer mock-editor' || token === 'Bearer mock-viewer';
	};
	return [
		http.get('/api/v1/me', ({ request }) => {
			if (!authorized(request)) return problem(401, 'Unauthorized');
			return json({
				permissions:
					request.headers.get('authorization') ===
					'Bearer mock-editor'
						? ['tickets.update']
						: [],
			});
		}),
		http.get('/api/v1/tickets', ({ request }) => {
			if (!authorized(request)) return problem(401, 'Unauthorized');
			const p = new URL(request.url).searchParams;
			const offsetText = p.get('offset') ?? '0';
			const limitText = p.get('limit') ?? '20';
			const offset = Number(offsetText);
			const limit = Number(limitText);
			const q = p.get('q') ?? '';
			const state = p.get('state');
			const severity = p.get('severity');
			const sort = p.get('sort') ?? 'LAST_MODIFIED';
			const direction = p.get('direction') ?? 'DESC';
			if (
				!/^\d+$/.test(offsetText) ||
				!Number.isSafeInteger(offset) ||
				offset > 2147483647 ||
				!/^\d+$/.test(limitText) ||
				limit < 1 ||
				limit > 100 ||
				q.length > 256 ||
				(state !== null && !states.includes(state)) ||
				(severity !== null && !severities.includes(severity)) ||
				!['LAST_MODIFIED', 'TARGET_DATE'].includes(sort) ||
				!['ASC', 'DESC'].includes(direction)
			)
				return problem(422, 'Unprocessable Entity');
			const filtered = tickets.filter(
				(ticket) =>
					(!state || ticket.state === state) &&
					(!severity || ticket.severity === severity) &&
					[
						ticket.key,
						ticket.asset,
						ticket.assignedTeam ?? '',
						ticket.assignee,
					].some((value) =>
						value.toLowerCase().includes(q.toLowerCase()),
					),
			);
			const field =
				sort === 'TARGET_DATE' ? 'targetDate' : 'lastModified';
			filtered.sort(
				(a, b) =>
					(Date.parse(a[field]) - Date.parse(b[field])) *
						(direction === 'ASC' ? 1 : -1) ||
					a.id.localeCompare(b.id),
			);
			return json({
				data: filtered.slice(offset, offset + limit),
				pagination: { offset, limit, totalElements: filtered.length },
			});
		}),
		http.patch(
			new RegExp(`^${origin}/api/v1/tickets/[^/]+$`),
			async ({ request }) => {
				if (!authorized(request)) return problem(401, 'Unauthorized');
				if (
					request.headers.get('authorization') !==
					'Bearer mock-editor'
				)
					return problem(403, 'Forbidden');
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return problem(400, 'Bad Request');
				}
				const date =
					typeof body === 'object' &&
					body !== null &&
					'dueDate' in body
						? body.dueDate
						: null;
				if (typeof date !== 'string' || !validDate(date))
					return problem(400, 'Bad Request');
				let id: string;
				try {
					id = decodeURIComponent(
						new URL(request.url).pathname.split('/').pop()!,
					);
				} catch {
					return problem(404, 'Not Found');
				}
				const ticket = tickets.find((item) => item.id === id);
				if (!ticket) return problem(404, 'Not Found');
				if (ticket.state === 'DONE') return problem(409, 'Conflict');
				ticket.dueDate = date;
				if (ticket.state === 'REPORTED') ticket.state = 'IN_PROGRESS';
				ticket.lastModified = new Date(
					Date.UTC(2026, 9, 3, 0, 0, ++revision),
				).toISOString();
				return json(ticket);
			},
		),
		http.all('/api/v1/*', ({ request }) =>
			authorized(request)
				? problem(404, 'Not Found')
				: problem(401, 'Unauthorized'),
		),
	];
}
