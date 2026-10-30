import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export function NotFoundPage() {
	return (
		<>
			<header className='not-found-header'>
				<strong>
					<span className='not-found-brand'>◈</span> Classora
				</strong>
				<span>Espacio de trabajo</span>
			</header>
			<main className='not-found-main'>
				<p className='not-found-code'>404</p>
				<h1>Página no encontrada</h1>
				<p>
					La página que buscas no existe o ha cambiado de dirección.
				</p>
				<Link to='/'>Volver a tickets</Link>
			</main>
		</>
	);
}
