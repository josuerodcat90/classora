import type { CurrentUser } from '../../domain';
import { request } from '../http';

export function getCurrentUser(token: string, signal: AbortSignal) {
	return request<CurrentUser>('/api/v1/me', token, { signal });
}
