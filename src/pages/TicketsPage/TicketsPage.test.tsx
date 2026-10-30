import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createMockHandlers } from '../../mocks/ticket-api';
import { TicketsPage } from './TicketsPage';

declare const process: { env: { TZ?: string } };

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

function Location() {
	const location = useLocation();
	const navigate = useNavigate();
	return (
		<>
			<output data-testid='location'>{location.search}</output>
			<button onClick={() => navigate(-1)}>Atrás</button>
			<button onClick={() => navigate(1)}>Adelante</button>
		</>
	);
}
function renderPage(path = '/', token = 'mock-editor') {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={[path]}>
				<TicketsPage token={token} />
				<Location />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('ticket interface', () => {
	it('preserves the main landmark and lists tickets with accessible metadata', async () => {
		renderPage();
		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(await screen.findByText('SEC-1024')).toBeInTheDocument();
		const row = screen.getByText('SEC-1024').closest('article')!;
		expect(within(row).getByText('Reportado')).toBeInTheDocument();
		expect(within(row).getByText('Alta')).toBeInTheDocument();
		expect(
			screen
				.getByText('SEC-1024')
				.closest('article')
				?.querySelector('time'),
		).toHaveAttribute('title');
	});
	it('applies filters immediately and search after debounce', async () => {
		renderPage();
		await screen.findByText('SEC-1024');
		fireEvent.change(screen.getByLabelText('Estado'), {
			target: { value: 'REPORTED' },
		});
		expect(screen.getByTestId('location')).toHaveTextContent(
			'state=REPORTED',
		);
		fireEvent.change(screen.getByLabelText('Buscar'), {
			target: { value: 'payments' },
		});
		expect(screen.getByTestId('location')).not.toHaveTextContent(
			'q=payments',
		);
		await waitFor(() =>
			expect(screen.getByTestId('location')).toHaveTextContent(
				'q=payments',
			),
		);
	});
	it('shows empty results and numbered pagination', async () => {
		renderPage('/?limit=1');
		await screen.findByText('SEC-1025');
		fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
		expect(await screen.findByText('SEC-1024')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText('Buscar'), {
			target: { value: 'not-found' },
		});
		expect(
			await screen.findByText('No se encontraron tickets.'),
		).toBeInTheDocument();
	});
	it('hides editing without permission', async () => {
		renderPage('/', 'mock-viewer');
		await screen.findByText('SEC-1024');
		await waitFor(() =>
			expect(
				screen.queryByRole('button', {
					name: /fecha límite.*SEC-1024/i,
				}),
			).not.toBeInTheDocument(),
		);
	});
	it('shows an error when tickets cannot be loaded', async () => {
		server.use(http.get('/api/v1/tickets', () => HttpResponse.error()));
		renderPage();
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'No se pudieron cargar los tickets',
		);
	});
	it('keeps the typed search when pagination is clicked before debounce', async () => {
		renderPage('/?limit=1');
		await screen.findByText('SEC-1025');
		fireEvent.change(screen.getByLabelText('Buscar'), {
			target: { value: 'payments' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
		await waitFor(() =>
			expect(screen.getByTestId('location')).toHaveTextContent(
				'q=payments',
			),
		);
		expect(screen.getByLabelText('Buscar')).toHaveValue('payments');
		expect(await screen.findByText('SEC-1024')).toBeInTheDocument();
		expect(screen.getByTestId('location')).not.toHaveTextContent(
			'offset=1',
		);
	});
	it('restores search on back and forward and cancels an uncommitted draft', async () => {
		renderPage();
		await screen.findByText('SEC-1024');
		fireEvent.change(screen.getByLabelText('Buscar'), {
			target: { value: 'payments' },
		});
		await waitFor(() =>
			expect(screen.getByTestId('location')).toHaveTextContent(
				'q=payments',
			),
		);
		fireEvent.change(screen.getByLabelText('Estado'), {
			target: { value: 'REPORTED' },
		});
		fireEvent.change(screen.getByLabelText('Buscar'), {
			target: { value: 'draft' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
		expect(screen.getByLabelText('Buscar')).toHaveValue('payments');
		fireEvent.click(screen.getByRole('button', { name: 'Adelante' }));
		expect(screen.getByLabelText('Buscar')).toHaveValue('payments');
		await new Promise((resolve) => setTimeout(resolve, 450));
		expect(screen.getByTestId('location')).not.toHaveTextContent('draft');
	});
	it('displays the selected UTC date without shifting it in a western timezone', async () => {
		const previous = process.env.TZ;
		process.env.TZ = 'America/Los_Angeles';
		try {
			renderPage();
			fireEvent.click(
				await screen.findByRole('button', {
					name: /fecha límite.*SEC-1024/i,
				}),
			);
			fireEvent.change(
				screen.getByLabelText('Fecha límite para SEC-1024'),
				{ target: { value: '2027-01-20' } },
			);
			fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
			expect(
				await screen.findByText('Fecha límite actualizada'),
			).toBeInTheDocument();
			const row = screen.getByText('SEC-1024').closest('article')!;
			expect(within(row).getByText('20 ene 2027')).toBeInTheDocument();
		} finally {
			if (previous === undefined) delete process.env.TZ;
			else process.env.TZ = previous;
		}
	});
	it('shows loading while the list request is pending', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		server.use(
			http.get('/api/v1/tickets', async () => {
				await gate;
				return HttpResponse.json({
					data: [],
					pagination: { offset: 0, limit: 20, totalElements: 0 },
				});
			}),
		);
		renderPage();
		expect(screen.getByText('Cargando tickets…')).toHaveAttribute(
			'role',
			'status',
		);
		release();
		expect(
			await screen.findByText('No se encontraron tickets.'),
		).toBeInTheDocument();
	});
	it('disables the pending ticket, rolls back on failure, and reports the error', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		server.use(
			http.patch('/api/v1/tickets/:id', async () => {
				await gate;
				return HttpResponse.json({}, { status: 500 });
			}),
		);
		renderPage();
		fireEvent.click(
			await screen.findByRole('button', {
				name: /fecha límite.*SEC-1024/i,
			}),
		);
		fireEvent.change(screen.getByLabelText('Fecha límite para SEC-1024'), {
			target: { value: '2027-01-20' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
		const row = screen.getByText('SEC-1024').closest('article')!;
		await waitFor(() =>
			expect(
				within(row).getByRole('button', { name: /fecha límite/i }),
			).toBeDisabled(),
		);
		expect(within(row).getByText('Guardando…')).toBeInTheDocument();
		expect(within(row).getByText('En progreso')).toBeInTheDocument();
		release();
		expect(
			await screen.findByText('No se pudo actualizar la fecha límite'),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(within(row).getByText('Reportado')).toBeInTheDocument(),
		);
		expect(within(row).getByText('Sin fecha límite')).toBeInTheDocument();
		expect(
			within(row).getByRole('button', { name: /fecha límite/i }),
		).toBeEnabled();
	});
	it('saves a due date and reports success', async () => {
		renderPage();
		await screen.findByText('SEC-1024');
		fireEvent.click(
			await screen.findByRole('button', {
				name: /fecha límite.*SEC-1024/i,
			}),
		);
		fireEvent.change(screen.getByLabelText('Fecha límite para SEC-1024'), {
			target: { value: '2027-01-20' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
		expect(
			await screen.findByText('Fecha límite actualizada'),
		).toBeInTheDocument();
	});
});
