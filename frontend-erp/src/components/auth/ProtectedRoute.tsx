import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from './CanView';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const effectiveRole = user.role === 'project_admin' ? 'admin' : user.role;

    if (!allowedRoles.includes(effectiveRole as UserRole)) {
        // Redirect based on role
        if (effectiveRole === 'worker') return <Navigate to="/worker" replace />;
        if (effectiveRole === 'designer') return <Navigate to="/designer" replace />;
        if (effectiveRole === 'manager') return <Navigate to="/manager" replace />;

        // Fallback if role is unknown or admin with no access (unlikely)
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
