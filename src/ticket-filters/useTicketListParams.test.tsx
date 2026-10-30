import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useTicketListParams } from './useTicketListParams';

const defaults = {
	offset: 0,
	limit: 20,
	q: '',
	state: 'ALL',
	severity: 'ALL',
	sort: 'LAST_MODIFIED',
	direction: 'DESC',
};

function renderParams(initialEntry = '/tickets') {
	return renderHook(
		() => ({
			...useTicketListParams(),
			location: useLocation(),
			navigate: useNavigate(),
		}),
		{
			wrapper: ({ children }: { children: ReactNode }) => (
				<MemoryRouter initialEntries={[initialEntry]}>
					{children}
				</MemoryRouter>
			),
		},
	);
}

describe('useTicketListParams', () => {
	it('derives defaults from an empty URL', () => {
		const { result } = renderParams();
		expect(result.current.params).toEqual(defaults);
		expect(result.current.location.search).toBe('');
	});

	it('reads valid filters and boundary values from the URL', () => {
		const { result } = renderParams(
			'/tickets?offset=2147483647&limit=100&q=log4j&state=IN_PROGRESS&severity=HIGH&sort=TARGET_DATE&direction=ASC',
		);
		expect(result.current.params).toEqual({
			offset: 2147483647,
			limit: 100,
			q: 'log4j',
			state: 'IN_PROGRESS',
			severity: 'HIGH',
			sort: 'TARGET_DATE',
			direction: 'ASC',
		});
	});

	it('normalizes invalid and out-of-range values without producing invalid params', () => {
		for (const query of [
			'offset=-5&limit=9999&state=FOO',
			'offset=2147483648&limit=0&severity=BAD&sort=BAD&direction=BAD',
			'offset=1.5&limit=1.5',
			`q=${'x'.repeat(257)}`,
		]) {
			const { result, unmount } = renderParams(`/tickets?${query}`);
			expect(result.current.params).toEqual(defaults);
			unmount();
		}
	});

	it('accepts the minimum limit and a maximum-length query', () => {
		const q = 'x'.repeat(256);
		const { result } = renderParams(`/tickets?limit=1&q=${q}`);
		expect(result.current.params).toEqual({ ...defaults, limit: 1, q });
	});

	it('patches filters, resets offset, preserves limit and other filters, and omits defaults', () => {
		const { result } = renderParams(
			'/tickets?offset=40&limit=10&q=login&state=REPORTED&severity=HIGH',
		);
		act(() =>
			result.current.setFilters({ severity: 'CRITICAL', state: 'ALL' }),
		);
		expect(result.current.params).toEqual({
			...defaults,
			limit: 10,
			q: 'login',
			severity: 'CRITICAL',
		});
		const search = new URLSearchParams(result.current.location.search);
		expect(Object.fromEntries(search)).toEqual({
			limit: '10',
			q: 'login',
			severity: 'CRITICAL',
		});
	});

	it('changes only the page and normalizes an invalid offset', () => {
		const { result } = renderParams(
			'/tickets?limit=10&q=login&state=REPORTED&sort=TARGET_DATE&direction=ASC',
		);
		act(() => result.current.setPage(30));
		expect(result.current.params).toEqual({
			...defaults,
			offset: 30,
			limit: 10,
			q: 'login',
			state: 'REPORTED',
			sort: 'TARGET_DATE',
			direction: 'ASC',
		});
		expect(
			new URLSearchParams(result.current.location.search).get('offset'),
		).toBe('30');
		act(() => result.current.setPage(-1));
		expect(result.current.params.offset).toBe(0);
		expect(
			new URLSearchParams(result.current.location.search).has('offset'),
		).toBe(false);
		expect(result.current.params.q).toBe('login');
	});

	it('reset restores defaults and removes the query string', () => {
		const { result } = renderParams(
			'/tickets?offset=20&limit=10&severity=HIGH',
		);
		act(() => result.current.reset());
		expect(result.current.params).toEqual(defaults);
		expect(result.current.location.pathname).toBe('/tickets');
		expect(result.current.location.search).toBe('');
	});

	it('derives params from external navigation and browser history', () => {
		const { result } = renderParams();
		act(() => result.current.navigate('/tickets?severity=HIGH'));
		expect(result.current.params).toEqual({
			...defaults,
			severity: 'HIGH',
		});
		act(() => result.current.navigate('/tickets?q=login'));
		expect(result.current.params).toEqual({ ...defaults, q: 'login' });
		act(() => result.current.navigate(-1));
		expect(result.current.params).toEqual({
			...defaults,
			severity: 'HIGH',
		});
		act(() => result.current.navigate(1));
		expect(result.current.params).toEqual({ ...defaults, q: 'login' });
	});
});
