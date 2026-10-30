import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../services/currentUser';

export function useCurrentUser(token: string) {
	return useQuery({
		queryKey: ['me', token],
		queryFn: ({ signal }) => getCurrentUser(token, signal),
	});
}
