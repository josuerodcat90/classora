import type { TicketListParams } from '../../domain';

export type TicketFiltersProps = {
	params: TicketListParams;
	search: string;
	onSearch: (value: string) => void;
	onFilter: (
		patch: Partial<Omit<TicketListParams, 'offset' | 'limit'>>,
	) => void;
	onReset: () => void;
};
