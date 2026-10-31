export interface DueDateModalProps {
	ticketKey: string;
	initialDate: string;
	disabled: boolean;
	onClose: () => void;
	onSave: (date: string) => void;
}
