import { useEffect, useState } from 'react';
import { Shield, Save, Check } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface RolePermission {
    role: string;
    permissions: { [key: string]: boolean };
}

const PERMISSION_KEYS = [
    { key: 'can_view_dashboard', label: 'View Dashboard' },
    { key: 'can_view_tasks', label: 'View Tasks' },
    { key: 'can_manage_users', label: 'Manage Users' },
    { key: 'can_manage_roles', label: 'Manage Roles' },
    { key: 'can_view_orders', label: 'View Orders' },
    { key: 'can_manage_orders', label: 'Manage Orders' },
    { key: 'can_view_products', label: 'View Products' },
    { key: 'can_manage_products', label: 'Manage Products' },
    { key: 'can_view_customers', label: 'View Customers' },
    { key: 'can_manage_customers', label: 'Manage Customers' },
    { key: 'can_view_finance', label: 'View Finance' },
];

export default function RolesPage() {
    const [roles, setRoles] = useState<RolePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.roles.list();
            if (response.success) {
                // Ensure we have entries for all standard roles even if DB is empty
                // But we seeded DB, so it should be fine.
                setRoles(response.data);
            }
        } catch (error) {
            toast.error('Failed to load roles');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (roleName: string, permissionKey: string) => {
        setRoles(prevRoles => prevRoles.map(r => {
            if (r.role === roleName) {
                return {
                    ...r,
                    permissions: {
                        ...r.permissions,
                        [permissionKey]: !r.permissions[permissionKey]
                    }
                };
            }
            return r;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const promises = roles.map(role =>
                api.roles.update(role.role, role.permissions)
            );
            await Promise.all(promises);
            toast.success('Permissions updated successfully');
        } catch (error) {
            toast.error('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Role Permissions</h1>
                    <p className="text-gray-500">Manage access levels for each role</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b">Permission</th>
                            {roles.map(role => (
                                <th key={role.role} className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b capitalize">
                                    {role.role}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {PERMISSION_KEYS.map((perm) => (
                            <tr key={perm.key} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                    {perm.label}
                                </td>
                                {roles.map(role => (
                                    <td key={`${role.role}-${perm.key}`} className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggle(role.role, perm.key)}
                                            className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mx-auto ${role.permissions[perm.key]
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-white border-gray-300 text-gray-300'
                                                }`}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Important Note
                </h4>
                <p className="text-sm text-yellow-700">
                    Changes to permissions take effect immediately but users may need to refresh their page to see changes.
                    Admins always retain full access regardless of these settings to prevent lockout.
                </p>
            </div>
        </div>
    );
}
