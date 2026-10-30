import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupWorker } from 'msw/browser';
import { createMockHandlers } from './mocks/ticket-api';

const root = document.getElementById('root');

if (!root) {
	throw new Error('Root element not found');
}

const worker = setupWorker(...createMockHandlers());

worker.start().then(() => {
	createRoot(root).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
});
