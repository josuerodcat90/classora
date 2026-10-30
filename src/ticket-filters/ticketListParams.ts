import type { Severity, TicketState } from '../domain/ticket.types';

export type TicketListParams = {
	offset: number;
	limit: number;
	q: string;
	state: TicketState | 'ALL';
	severity: Severity | 'ALL';
	sort: 'LAST_MODIFIED' | 'TARGET_DATE';
	direction: 'ASC' | 'DESC';
};

const defaults: TicketListParams = {
	offset: 0,
	limit: 20,
	q: '',
	state: 'ALL',
	severity: 'ALL',
	sort: 'LAST_MODIFIED',
	direction: 'DESC',
};

function integer(
	value: string | null,
	min: number,
	max: number,
	fallback: number,
): number {
	if (value === null || !/^\d+$/.test(value)) return fallback;
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= min && number <= max
		? number
		: fallback;
}

function choice<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.find((option) => option === value) ?? fallback;
}

export function parseTicketListParams(
	search: URLSearchParams,
): TicketListParams {
	const q = search.get('q') ?? '';
	return {
		offset: integer(search.get('offset'), 0, 2147483647, defaults.offset),
		limit: integer(search.get('limit'), 1, 100, defaults.limit),
		q: Array.from(q).length <= 256 ? q : defaults.q,
		state: choice(
			search.get('state'),
			['REPORTED', 'IN_PROGRESS', 'PENDING_SECURITY', 'DONE', 'ALL'],
			defaults.state,
		),
		severity: choice(
			search.get('severity'),
			['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL'],
			defaults.severity,
		),
		sort: choice(
			search.get('sort'),
			['LAST_MODIFIED', 'TARGET_DATE'],
			defaults.sort,
		),
		direction: choice(
			search.get('direction'),
			['ASC', 'DESC'],
			defaults.direction,
		),
	};
}

export function serializeTicketListParams(
	params: TicketListParams,
): URLSearchParams {
	const search = new URLSearchParams();
	for (const key of Object.keys(defaults) as (keyof TicketListParams)[]) {
		if (params[key] !== defaults[key]) search.set(key, String(params[key]));
	}
	return search;
}
