import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { baselineTickets, createMockHandlers } from '../mocks/ticket-api';
import { useCurrentUser, useTickets } from './';

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
beforeEach(() => server.resetHandlers(...createMockHandlers(baselineTickets)));
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
}

describe('ticket queries', () => {
	it('loads the list using normalized filters without sending ALL to the API', async () => {
		const { result } = renderHook(() => useTickets(params, 'mock-editor'), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.pagination.totalElements).toBe(2);
	});

	it('loads the permissions for a read-only user', async () => {
		const { result } = renderHook(() => useCurrentUser('mock-viewer'), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.permissions).toEqual([]);
	});
});
