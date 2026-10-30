import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { createMockHandlers } from './mocks/ticket-api';

const server = setupServer();
beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: () => ({
			matches: false,
			addEventListener() {},
			removeEventListener() {},
		}),
	});
	server.listen();
});
beforeEach(() => server.resetHandlers(...createMockHandlers()));
afterAll(() => server.close());

function renderApp(token = 'mock-editor', initialPath = '/') {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={[initialPath]}>
				<App token={token} />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('App', () => {
	it('renders the tickets page', async () => {
		renderApp();
		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(await screen.findByText('SEC-1024')).toBeInTheDocument();
	});

	it('shows a not found page for an unknown route', () => {
		renderApp('mock-editor', '/missing');
		expect(
			screen.getByRole('heading', { name: /página no encontrada/i }),
		).toBeInTheDocument();
		expect(screen.getByText('404')).toBeInTheDocument();
		expect(
			screen.queryByRole('heading', { name: 'Tickets' }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /volver a tickets/i }),
		).toHaveAttribute('href', '/');
	});

	it('navigates from the not found page back to tickets', async () => {
		renderApp('mock-editor', '/missing');
		fireEvent.click(
			screen.getByRole('link', { name: /volver a tickets/i }),
		);
		expect(await screen.findByText('SEC-1024')).toBeInTheDocument();
		expect(screen.queryByText('404')).not.toBeInTheDocument();
	});

	it('passes the token to the tickets page', async () => {
		let authorization: string | null = null;
		server.use(
			http.get('/api/v1/me', ({ request }) => {
				authorization = request.headers.get('authorization');
				return HttpResponse.json({ permissions: ['tickets.update'] });
			}),
		);
		renderApp('mock-viewer');
		expect(
			await screen.findByRole('button', {
				name: /fecha límite.*SEC-1024/i,
			}),
		).toBeInTheDocument();
		expect(authorization).toBe('Bearer mock-viewer');
	});
});
