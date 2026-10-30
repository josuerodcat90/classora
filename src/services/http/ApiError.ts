export class ApiError extends Error {
	constructor(public readonly status: number) {
		super(`Request failed with status ${status}`);
	}
}
