import { useAuthStore } from '../store/authStore';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Permissions {
    [key: string]: boolean;
}

export function usePermissions() {
    const { user } = useAuthStore();
    const [permissions, setPermissions] = useState<Permissions>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!user?.role) {
                setLoading(false);
                return;
            }

            try {
                // In a real app, we might fetch this from the backend or store it in the user session.
                // For now, let's fetch all roles and find the user's role.
                // Optimization: This should probably be cached in a store or context.
                const response = await api.roles.list();
                if (response.success && response.data) {
                    const roleData = response.data.find((r: any) => r.role === user.role);
                    setPermissions(roleData?.permissions || {});
                }
            } catch (error) {
                console.error('Failed to fetch permissions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [user?.role]);

    const can = (permission: string) => {
        // Admin always has access? Or should we strictly follow DB?
        // Let's strictly follow DB for RBAC, but maybe default to true for 'admin' if DB fails?
        if (user?.role === 'admin') return true;
        return !!permissions[permission];
    };

    return { can, loading, role: user?.role };
}
