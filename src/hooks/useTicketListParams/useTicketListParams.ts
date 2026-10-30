import { useSearchParams } from 'react-router-dom';
import type { TicketListParams } from '../../domain';
import { parseTicketListParams, serializeTicketListParams } from '../../utils';

export function useTicketListParams() {
	const [search, setSearch] = useSearchParams();
	const params = parseTicketListParams(search);

	function update(next: TicketListParams) {
		const normalized = parseTicketListParams(
			serializeTicketListParams(next),
		);
		setSearch(serializeTicketListParams(normalized));
	}

	return {
		params,
		setFilters: (
			patch: Partial<Omit<TicketListParams, 'offset' | 'limit'>>,
		) => update({ ...params, ...patch, offset: 0 }),
		setPage: (offset: number) => update({ ...params, offset }),
		reset: () =>
			setSearch(
				serializeTicketListParams(
					parseTicketListParams(new URLSearchParams()),
				),
			),
	};
}
