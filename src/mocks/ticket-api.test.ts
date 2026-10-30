import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { createMockHandlers } from './ticket-api';

const server = setupServer();
beforeEach(() => server.listen());
afterEach(() => server.close());

function createMockFetch(): typeof fetch {
	server.resetHandlers(...createMockHandlers());
	return (input, init) =>
		fetch(
			input instanceof Request
				? input
				: new URL(input, window.location.href),
			init,
		);
}

const auth = { Authorization: 'Bearer mock-editor' };

describe('browser HTTP mock', () => {
	it('serves, updates and resets deterministic tickets through HTTP', async () => {
		const fetch = createMockFetch();
		const response = await fetch('/api/v1/tickets?state=REPORTED&limit=1', {
			headers: auth,
		});
		expect(response.status).toBe(200);
		const page = await response.json();
		expect(page.pagination).toEqual({
			offset: 0,
			limit: 1,
			totalElements: 1,
		});
		const updated = await fetch(`/api/v1/tickets/${page.data[0].id}`, {
			method: 'PATCH',
			headers: auth,
			body: JSON.stringify({ dueDate: '2026-11-15T10:00:00Z' }),
		});
		expect(updated.status).toBe(200);
		expect((await updated.json()).state).toBe('IN_PROGRESS');
		const afterUpdate = await (
			await fetch('/api/v1/tickets?state=REPORTED', { headers: auth })
		).json();
		expect(afterUpdate.pagination.totalElements).toBe(0);
		const reset = await createMockFetch()(
			'/api/v1/tickets?state=REPORTED',
			{ headers: auth },
		);
		expect((await reset.json()).pagination.totalElements).toBe(1);
	});

	it('rejects impossible RFC3339 calendar dates without changing the ticket', async () => {
		const fetch = createMockFetch();
		const before = await (
			await fetch('/api/v1/tickets', { headers: auth })
		).json();
		for (const dueDate of [
			'2026-02-30T10:00:00Z',
			'2026-13-01T10:00:00Z',
			'2026-01-01',
			'2026-01-01T25:00:00Z',
		]) {
			const response = await fetch('/api/v1/tickets/ticket-1024', {
				method: 'PATCH',
				headers: auth,
				body: JSON.stringify({ dueDate }),
			});
			expect(response.status, dueDate).toBe(400);
			expect(response.headers.get('content-type')).toBe(
				'application/problem+json',
			);
		}
		expect(
			await (await fetch('/api/v1/tickets', { headers: auth })).json(),
		).toEqual(before);
	});

	it('applies filters, sorting, pagination and query validation', async () => {
		const fetch = createMockFetch();
		const get = async (query: string) =>
			(await fetch(`/api/v1/tickets${query}`, { headers: auth })).json();
		expect((await get('')).data.map((t: { id: string }) => t.id)).toEqual([
			'ticket-1025',
			'ticket-1024',
		]);
		expect(
			(await get('?sort=TARGET_DATE&direction=ASC&limit=1&offset=1'))
				.data[0].id,
		).toBe('ticket-1025');
		expect(
			(await get('?q=PAYMENTS&severity=HIGH&state=REPORTED')).pagination
				.totalElements,
		).toBe(1);
		expect((await get('?q=missing')).pagination.totalElements).toBe(0);
		for (const query of [
			'offset=-1',
			'offset=2147483648',
			'offset=1.5',
			'limit=0',
			'limit=101',
			'state=ALL',
			'severity=ALL',
			'sort=bad',
			'direction=bad',
			`q=${'x'.repeat(257)}`,
		]) {
			const response = await fetch(`/api/v1/tickets?${query}`, {
				headers: auth,
			});
			expect(response.status, query).toBe(422);
			expect(await response.json()).toEqual({
				type: 'about:blank',
				title: 'Unprocessable Entity',
				status: 422,
			});
		}
	});

	it('accepts valid offset and leap-day timestamps', async () => {
		const fetch = createMockFetch();
		for (const dueDate of [
			'2024-02-29T23:59:59Z',
			'2026-11-15T10:00:00.123+02:30',
		]) {
			const response = await fetch('/api/v1/tickets/ticket-1024', {
				method: 'PATCH',
				headers: auth,
				body: JSON.stringify({ dueDate }),
			});
			expect(response.status).toBe(200);
			expect((await response.json()).dueDate).toBe(dueDate);
		}
	});

	it('accepts lowercase timestamps and real leap seconds, including offsets, but rejects nonexistent ones', async () => {
		const fetch = createMockFetch();
		for (const dueDate of [
			'2026-11-15t10:00:00z',
			'2016-12-31T23:59:60Z',
			'2017-01-01T00:59:60+01:00',
		]) {
			const response = await fetch('/api/v1/tickets/ticket-1024', {
				method: 'PATCH',
				headers: auth,
				body: JSON.stringify({ dueDate }),
			});
			expect(response.status, dueDate).toBe(200);
			expect((await response.json()).dueDate).toBe(dueDate);
		}
		const before = await (
			await fetch('/api/v1/tickets', { headers: auth })
		).json();
		for (const dueDate of [
			'2016-12-30T23:59:60Z',
			'2016-12-31T23:58:60Z',
			'2016-12-31T23:59:61Z',
		]) {
			const response = await fetch('/api/v1/tickets/ticket-1024', {
				method: 'PATCH',
				headers: auth,
				body: JSON.stringify({ dueDate }),
			});
			expect(response.status, dueDate).toBe(400);
			expect(await response.json()).toEqual({
				type: 'about:blank',
				title: 'Bad Request',
				status: 400,
			});
		}
		expect(
			await (await fetch('/api/v1/tickets', { headers: auth })).json(),
		).toEqual(before);
	});

	it('covers list boundaries and empty enum values', async () => {
		const fetch = createMockFetch();
		for (const query of [
			'offset=2147483647&limit=100',
			`q=${'x'.repeat(256)}`,
			'q=',
		]) {
			expect(
				(await fetch(`/api/v1/tickets?${query}`, { headers: auth }))
					.status,
			).toBe(200);
		}
		for (const query of [
			'offset=',
			'limit=',
			'state=',
			'severity=',
			'sort=',
			'direction=',
			'limit=-1',
			'limit=1.5',
		]) {
			expect(
				(await fetch(`/api/v1/tickets?${query}`, { headers: auth }))
					.status,
				query,
			).toBe(422);
		}
	});

	it('returns problem details for each rejected mutation and does not advance revision', async () => {
		const fetch = createMockFetch();
		const before = await (
			await fetch('/api/v1/tickets', { headers: auth })
		).json();
		const good = JSON.stringify({ dueDate: '2026-11-15T10:00:00Z' });
		for (const [path, headers, body, status, title] of [
			['ticket-1024', {}, good, 401, 'Unauthorized'],
			[
				'ticket-1024',
				{ Authorization: 'Bearer mock-viewer' },
				good,
				403,
				'Forbidden',
			],
			['ticket-1024', auth, '{', 400, 'Bad Request'],
			['ticket-1024', auth, '{}', 400, 'Bad Request'],
			['ticket-1024', auth, '{"dueDate":null}', 400, 'Bad Request'],
			['missing', auth, good, 404, 'Not Found'],
			['ticket-1025', auth, good, 409, 'Conflict'],
		] as const) {
			const response = await fetch(`/api/v1/tickets/${path}`, {
				method: 'PATCH',
				headers,
				body,
			});
			expect(response.status).toBe(status);
			expect(response.headers.get('content-type')).toBe(
				'application/problem+json',
			);
			expect(await response.json()).toEqual({
				type: 'about:blank',
				title,
				status,
			});
			expect(
				await (
					await fetch('/api/v1/tickets', { headers: auth })
				).json(),
			).toEqual(before);
		}
		const success = await (
			await fetch('/api/v1/tickets/ticket-1024', {
				method: 'PATCH',
				headers: auth,
				body: good,
			})
		).json();
		expect(success.lastModified).toBe('2026-10-03T00:00:01.000Z');
	});

	it('returns not found for malformed encoded ticket IDs without changing state', async () => {
		const fetch = createMockFetch();
		const before = await (
			await fetch('/api/v1/tickets', { headers: auth })
		).json();
		const response = await fetch('/api/v1/tickets/%E0%A4%A', {
			method: 'PATCH',
			headers: auth,
			body: JSON.stringify({ dueDate: '2026-11-15T10:00:00Z' }),
		});
		expect(response.status).toBe(404);
		expect(response.headers.get('content-type')).toBe(
			'application/problem+json',
		);
		expect(await response.json()).toEqual({
			type: 'about:blank',
			title: 'Not Found',
			status: 404,
		});
		expect(
			await (await fetch('/api/v1/tickets', { headers: auth })).json(),
		).toEqual(before);
		const updated = await (
			await fetch('/api/v1/tickets/ticket-1024', {
				method: 'PATCH',
				headers: auth,
				body: JSON.stringify({ dueDate: '2026-11-15T10:00:00Z' }),
			})
		).json();
		expect(updated.lastModified).toBe('2026-10-03T00:00:01.000Z');
	});

	it('enforces identity for the current user', async () => {
		const fetch = createMockFetch();
		expect((await fetch('/api/v1/me')).status).toBe(401);
		expect(
			await (
				await fetch('/api/v1/me', {
					headers: { Authorization: 'Bearer mock-viewer' },
				})
			).json(),
		).toEqual({ permissions: [] });
	});
});
