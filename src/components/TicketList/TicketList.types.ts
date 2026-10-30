import type { UseQueryResult } from '@tanstack/react-query';
import type { TicketPage } from '../../domain';
import type { TicketListParams } from '../../domain';

export type TicketListProps = {
	tickets: UseQueryResult<TicketPage, Error>;
	permissionsError: boolean;
	canEdit: boolean;
	pending: string[];
	params: TicketListParams;
	onPage: (offset: number) => void;
	onSave: (id: string, date: string) => void;
};
