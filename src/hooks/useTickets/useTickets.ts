import { useQuery } from '@tanstack/react-query';
import type { TicketListParams } from '../../domain';
import { ticketKeys } from '../../utils';
import { getTickets } from '../../services/tickets';

export function useTickets(params: TicketListParams, token: string) {
	return useQuery({
		queryKey: ticketKeys.list(params, token),
		queryFn: ({ signal }) => getTickets(params, token, signal),
	});
}
