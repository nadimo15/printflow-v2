import { useState } from 'react';
import { X, User, Mail, Phone, Lock, Shield } from 'lucide-react';
import { useEmployeesStore, Employee } from '../store/employeesStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Props {
    employee: Employee | null;
    onClose: () => void;
}

export default function EmployeeModal({ employee, onClose }: Props) {
    const { createEmployee, updateEmployee } = useEmployeesStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: employee?.name || '',
        email: employee?.email || '',
        password: '',
        role: employee?.role || 'worker',
        phone: employee?.phone || '',
    });

    const isEditing = !!employee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!form.name || !form.email) {
            toast.error('الاسم والبريد الإلكتروني مطلوبان');
            return;
        }

        if (!isEditing && !form.password) {
            toast.error('كلمة المرور مطلوبة للموظف الجديد');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing) {
                // Update basic profile info
                await updateEmployee(employee.id, {
                    name: form.name,
                    role: form.role as Employee['role'],
                    phone: form.phone || undefined,
                });

                // Update Auth info (Email/Password) if changed
                if (form.email !== employee.email || form.password) {
                    await api.employees.updateAuth(employee.id, {
                        email: form.email !== employee.email ? form.email : undefined,
                        password: form.password || undefined
                    });
                }

                toast.success('تم تحديث بيانات الموظف بنجاح');
            } else {
                await createEmployee({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role: form.role,
                    phone: form.phone || undefined,
                });
                toast.success('تم إضافة الموظف بنجاح');
            }
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold">
                        {isEditing ? 'تعديل الموظف' : 'إضافة موظف جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                        <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="input pr-10"
                                placeholder="أحمد محمد"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="input pr-10"
                                placeholder="ahmed@printflow.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isEditing ? 'كلمة المرور (اتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور'}
                        </label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="input pr-10"
                                placeholder={isEditing ? '••••••••' : '••••••••'}
                                required={!isEditing}
                                minLength={6}
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                        <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="input pr-10"
                                placeholder="0555123456"
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                        <div className="relative">
                            <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'manager' | 'designer' | 'worker' })}
                                className="input pr-10 appearance-none"
                            >
                                <option value="worker">عامل الإنتاج</option>
                                <option value="designer">مصمم</option>
                                <option value="manager">مشرف / مدير إنتاج</option>
                                <option value="admin">مالك / مدير عام</option>
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 disabled:opacity-50"
                        >
                            {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إضافة الموظف'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
