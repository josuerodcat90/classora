import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { setupWorker } from 'msw/browser';
import { createMockHandlers } from './mocks/ticket-api';

const root = document.getElementById('root');

if (!root) {
	throw new Error('Root element not found');
}

const worker = setupWorker(...createMockHandlers());
const queryClient = new QueryClient();

worker.start().then(() => {
	createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</QueryClientProvider>
		</StrictMode>,
	);
});
