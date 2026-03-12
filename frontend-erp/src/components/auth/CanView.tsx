import React from 'react';
import { useAuthStore } from '../../store/authStore';

export type UserRole = 'admin' | 'manager' | 'designer' | 'worker';

interface CanViewProps {
    roles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const CanView: React.FC<CanViewProps> = ({ roles, children, fallback = null }) => {
    const user = useAuthStore((state) => state.user);

    const userRole = user?.role === 'project_admin' ? 'admin' : user?.role;

    // If no user or role doesn't match, show fallback
    if (!user || !roles.includes(userRole as UserRole)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
