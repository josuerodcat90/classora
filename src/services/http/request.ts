import { ApiError } from './ApiError';

export async function request<T>(
	path: string,
	token: string,
	options: RequestInit = {},
): Promise<T> {
	const headers = new Headers(options.headers);
	headers.set('Authorization', `Bearer ${token}`);
	const response = await fetch(new URL(path, window.location.origin), {
		...options,
		headers,
	});
	if (!response.ok) throw new ApiError(response.status);
	return response.json() as Promise<T>;
}
