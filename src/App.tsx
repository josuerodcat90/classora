import type { TicketsPageProps } from './pages';
import { AppRouter } from './router';
import './app.css';

export default function App(props: TicketsPageProps) {
	return <AppRouter {...props} />;
}
