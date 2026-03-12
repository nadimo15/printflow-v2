import { useState, useEffect, useMemo } from 'react';
import {
    UserPlus, Search, Users, Shield, Wrench,
    Phone, Mail, MoreVertical, CheckCircle, XCircle
} from 'lucide-react';
import { useEmployeesStore, Employee } from '../store/employeesStore';
import EmployeeModal from './EmployeeModal';
import toast from 'react-hot-toast';

const roleLabels: Record<string, string> = {
    admin: 'مدير',
    manager: 'مشرف',
    worker: 'عامل',
};

const roleIcons: Record<string, typeof Shield> = {
    admin: Shield,
    manager: Users,
    worker: Wrench,
};

const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    worker: 'bg-emerald-100 text-emerald-700',
};

export default function TeamPage() {
    const { employees, isLoading, fetchEmployees, deleteEmployee, reactivateEmployee } = useEmployeesStore();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const matchesSearch =
                emp.name.toLowerCase().includes(search.toLowerCase()) ||
                emp.email.toLowerCase().includes(search.toLowerCase()) ||
                (emp.phone && emp.phone.includes(search));
            const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [employees, search, roleFilter]);

    const stats = useMemo(() => {
        const active = employees.filter((e) => e.is_active).length;
        const admins = employees.filter((e) => e.role === 'admin').length;
        const managers = employees.filter((e) => e.role === 'manager').length;
        const workers = employees.filter((e) => e.role === 'worker').length;
        return { total: employees.length, active, admins, managers, workers };
    }, [employees]);

    const handleEdit = (emp: Employee) => {
        setEditingEmployee(emp);
        setShowModal(true);
        setMenuOpen(null);
    };

    const handleToggleActive = async (emp: Employee) => {
        setMenuOpen(null);
        const actionName = emp.is_active ? 'تعطيل' : 'تفعيل';
        if (!confirm(`هل أنت متأكد من ${actionName} حساب "${emp.name}"؟`)) return;
        try {
            if (emp.is_active) {
                await deleteEmployee(emp.id);
            } else {
                await reactivateEmployee(emp.id);
            }
            toast.success(`تم ${actionName} الحساب بنجاح`);
        } catch {
            toast.error(`حدث خطأ أثناء ${actionName} الحساب`);
        }
    };

    const handleAddNew = () => {
        setEditingEmployee(null);
        setShowModal(true);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">فريق العمل</h1>
                <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    إضافة موظف
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'إجمالي الفريق', value: stats.total, color: 'bg-gray-100 text-gray-700' },
                    { label: 'مدراء', value: stats.admins, color: 'bg-purple-100 text-purple-700' },
                    { label: 'مشرفين', value: stats.managers, color: 'bg-blue-100 text-blue-700' },
                    { label: 'عمال', value: stats.workers, color: 'bg-emerald-100 text-emerald-700' },
                ].map((stat) => (
                    <div key={stat.label} className="card p-4 text-center">
                        <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color} inline-block px-3 py-1 rounded-full`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="p-4 border-b flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث عن موظف..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pr-12"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'admin', 'manager', 'worker'].map((role) => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${roleFilter === role
                                    ? 'bg-[#5a8a8a] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {role === 'all' ? 'الكل' : roleLabels[role]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Employee list */}
                {isLoading ? (
                    <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">لا يوجد موظفين</p>
                        <p className="text-sm">أضف أول موظف للبدء</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {filteredEmployees.map((emp) => {
                            const RoleIcon = roleIcons[emp.role] || Wrench;
                            return (
                                <div
                                    key={emp.id}
                                    className={`border rounded-xl p-5 hover:shadow-md transition-all relative ${!emp.is_active ? 'opacity-50 bg-gray-50' : ''
                                        }`}
                                >
                                    {/* Menu */}
                                    <div className="absolute top-3 left-3">
                                        <button
                                            onClick={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)}
                                            className="p-1 hover:bg-gray-100 rounded-lg"
                                        >
                                            <MoreVertical className="w-4 h-4 text-gray-400" />
                                        </button>
                                        {menuOpen === emp.id && (
                                            <div className="absolute left-0 top-8 bg-white shadow-lg rounded-lg border py-1 z-10 min-w-[120px]">
                                                <button
                                                    onClick={() => handleEdit(emp)}
                                                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50"
                                                >
                                                    تعديل
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(emp)}
                                                    className={`w-full text-right px-4 py-2 text-sm ${emp.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                >
                                                    {emp.is_active ? 'تعطيل' : 'تفعيل'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Avatar & role */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-14 h-14 bg-[#5a8a8a]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-[#5a8a8a] font-bold text-xl">{emp.name[0]}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg truncate">{emp.name}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[emp.role]}`}>
                                                <RoleIcon className="w-3 h-3" />
                                                {roleLabels[emp.role] || emp.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contact info */}
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{emp.email}</span>
                                        </div>
                                        {emp.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span>{emp.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            {emp.is_active ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    <span className="text-green-600">نشط</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                    <span className="text-red-600">معطل</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Employee Modal */}
            {showModal && (
                <EmployeeModal
                    employee={editingEmployee}
                    onClose={() => {
                        setShowModal(false);
                        setEditingEmployee(null);
                    }}
                />
            )}
        </div>
    );
}
