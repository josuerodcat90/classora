import { Route, Routes } from 'react-router-dom';
import { NotFoundPage, TicketsPage } from '../pages';
import type { AppRouterProps } from './AppRouter.types';

export function AppRouter(props: AppRouterProps) {
	return (
		<Routes>
			<Route
				path='/'
				element={<TicketsPage {...props} />}
			/>
			<Route
				path='*'
				element={<NotFoundPage />}
			/>
		</Routes>
	);
}
