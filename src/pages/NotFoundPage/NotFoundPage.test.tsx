import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
	it('explains the missing page and offers a link home', () => {
		render(
			<MemoryRouter>
				<NotFoundPage />
			</MemoryRouter>,
		);
		expect(
			screen.getByRole('heading', { name: 'Página no encontrada' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: 'Volver a tickets' }),
		).toHaveAttribute('href', '/');
	});
});
