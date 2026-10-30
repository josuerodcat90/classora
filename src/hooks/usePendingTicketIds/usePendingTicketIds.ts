import { useMutationState } from '@tanstack/react-query';
import type { Input } from '../useSetDueDate/useSetDueDate.types';

export function usePendingTicketIds() {
	return useMutationState({
		filters: { mutationKey: ['tickets', 'setDueDate'], status: 'pending' },
		select: (mutation) => (mutation.state.variables as Input).id,
	});
}
