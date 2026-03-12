import { useState } from 'react';
import { Package, Lock, Mail, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLoginMode) {
      const success = await login(email, password);
      if (success) {
        toast.success('تم تسجيل الدخول بنجاح');
      } else {
        toast.error('بريد إلكتروني أو كلمة مرور غير صحيحة');
      }
    } else {
      const success = await register({ name, email, password });
      if (success) {
        toast.success('تم التسجيل بنجاح! يمكنك الان تسجيل الدخول');
        setIsLoginMode(true);
      } else {
        toast.error('فشل التسجيل. يرجى المحاولة مرة أخرى.');
      }
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#5a8a8a] to-[#4a7a7a] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#5a8a8a] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold">PrintFlow ERP</h1>
          <p className="text-gray-500">نظام إدارة الطباعة والتغليف</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {!isLoginMode && (
            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pr-12"
                  placeholder="الاسم الكامل"
                  required={!isLoginMode}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pr-12"
                placeholder="admin@printflow.dz"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-12"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg py-4"
          >
            {loading ? 'جاري المعالجة...' : (isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={toggleMode} className="text-[#5a8a8a] hover:underline text-sm font-medium">
            {isLoginMode ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل الدخول'}
          </button>
        </div>

        {isLoginMode && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-600 rtl">
            <p className="font-medium mb-2">بيانات الدخول التجريبية (Admin):</p>
            <p>البريد: admin@printflow.dz</p>
            <p>كلمة المرور: admin123</p>
          </div>
        )}
      </div>
    </div>
  );
}
