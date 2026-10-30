import { http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getCurrentUser, getTickets, setDueDate, ApiError } from './index';

const server = setupServer();
const params = {
	offset: 0,
	limit: 20,
	q: '',
	state: 'ALL' as const,
	severity: 'ALL' as const,
	sort: 'LAST_MODIFIED' as const,
	direction: 'DESC' as const,
};

beforeAll(() => server.listen());
beforeEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API services', () => {
	it('requests the normalized ticket list with authorization', async () => {
		server.use(
			http.get('/api/v1/tickets', ({ request }) => {
				const url = new URL(request.url);
				expect(request.headers.get('Authorization')).toBe(
					'Bearer editor',
				);
				expect(url.searchParams.has('state')).toBe(false);
				expect(url.searchParams.has('severity')).toBe(false);
				return Response.json({
					data: [],
					pagination: { offset: 0, limit: 20, totalElements: 0 },
				});
			}),
		);
		await expect(
			getTickets(params, 'editor', new AbortController().signal),
		).resolves.toMatchObject({ data: [] });
	});

	it('honors cancellation for ticket and current user requests', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			getTickets(params, 'editor', controller.signal),
		).rejects.toMatchObject({ name: 'AbortError' });
		await expect(
			getCurrentUser('viewer', controller.signal),
		).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('loads the current user with authorization', async () => {
		server.use(
			http.get('/api/v1/me', ({ request }) => {
				expect(request.headers.get('Authorization')).toBe(
					'Bearer viewer',
				);
				return Response.json({ permissions: [] });
			}),
		);
		await expect(
			getCurrentUser('viewer', new AbortController().signal),
		).resolves.toEqual({ permissions: [] });
	});

	it('patches an encoded ticket id with a JSON date', async () => {
		server.use(
			http.patch(
				'/api/v1/tickets/:id',
				async ({ request, params: route }) => {
					expect(route.id).toBe('id/with space');
					expect(request.headers.get('Authorization')).toBe(
						'Bearer editor',
					);
					expect(request.headers.get('Content-Type')).toBe(
						'application/json',
					);
					expect(await request.json()).toEqual({
						dueDate: '2026-11-15T10:00:00Z',
					});
					return Response.json({ id: route.id });
				},
			),
		);
		await expect(
			setDueDate('id/with space', '2026-11-15T10:00:00Z', 'editor'),
		).resolves.toMatchObject({ id: 'id/with space' });
	});

	it('exposes HTTP failures as ApiError for GET and PATCH', async () => {
		server.use(
			http.get('/api/v1/me', () => new Response(null, { status: 403 })),
			http.patch(
				'/api/v1/tickets/:id',
				() => new Response(null, { status: 409 }),
			),
		);
		const getError = await getCurrentUser(
			'viewer',
			new AbortController().signal,
		).catch((error: unknown) => error);
		const patchError = await setDueDate(
			'id',
			'2026-11-15T10:00:00Z',
			'viewer',
		).catch((error: unknown) => error);
		expect(getError).toBeInstanceOf(ApiError);
		expect(getError).toMatchObject({
			status: 403,
			message: 'Request failed with status 403',
		});
		expect(patchError).toBeInstanceOf(ApiError);
		expect(patchError).toMatchObject({
			status: 409,
			message: 'Request failed with status 409',
		});
	});
});
