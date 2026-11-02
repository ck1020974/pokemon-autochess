import { createClient } from '@supabase/supabase-js';
import { ANALYTICS_URL, ANALYTICS_PUBLIC_KEY } from './config';
import type { DashboardData, DashboardFilters } from './types';

export const authorClient = createClient(ANALYTICS_URL, ANALYTICS_PUBLIC_KEY, {
    auth: { storageKey: 'pokemon-author-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export async function isAuthor(): Promise<boolean> {
    const { data: { user }, error } = await authorClient.auth.getUser();
    if (error || !user) return false;
    const { data, error: membershipError } = await authorClient.from('pa_owners').select('user_id').eq('user_id', user.id).maybeSingle();
    if (membershipError) throw new Error('目前無法確認作者權限，請稍後重試。');
    return Boolean(data);
}

export async function fetchDashboard(filters: DashboardFilters): Promise<DashboardData> {
    const { data, error } = await authorClient.rpc('pa_dashboard', {
        p_from: filters.from, p_to: filters.to,
        p_edition: filters.edition || null, p_difficulty: filters.difficulty || null, p_version: filters.version || null,
    });
    if (error) throw new Error('無法讀取統計資料，請重新登入或稍後再試。');
    return data as DashboardData;
}
