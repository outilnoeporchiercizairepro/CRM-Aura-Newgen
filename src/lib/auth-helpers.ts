import { supabase } from './supabase';

export type UserRole = 'admin' | 'setter' | 'setter_linkedin' | null;

export async function getUserRole(): Promise<UserRole> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
            return null;
        }

        // Use fetch API to call the RPC function directly
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
            return null;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
        });

        if (!response.ok) {
            console.error('Error fetching user role:', response.statusText);
            return null;
        }

        const role = await response.json();
        return role as UserRole;
    } catch (err) {
        console.error('Error in getUserRole:', err);
        return null;
    }
}
