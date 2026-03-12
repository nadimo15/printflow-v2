import { ReactNode, useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Package, LayoutDashboard, ShoppingBag, Users, Users2, ShoppingCart, Layers,
  Menu, LogOut, KanbanSquare, UserCog, ShieldAlert, Receipt, Target, Settings,
  BarChart2, Truck, Activity, PenTool, Globe, Home, Navigation, Sun, Moon,
  ChevronRight, LayoutTemplate, FileInput, ArrowRightLeft, FileCode, CheckSquare
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { UserRole } from './auth/CanView';

interface LayoutProps { children: ReactNode; }

// ─── Sidebar nav structure ───────────────────────────────────────────────────
const NAV_STRUCTURE = [
  {
    group: null,
    items: [
      { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['admin'] },
      { path: '/manager', label: 'لوحة الإنتاج', icon: LayoutDashboard, roles: ['manager'] },
      { path: '/worker', label: 'مساحتي', icon: Activity, roles: ['worker'] },
      { path: '/designer', label: 'مساحة التصميم', icon: PenTool, roles: ['designer'] },
    ],
  },
  {
    group: 'المبيعات',
    roles: ['admin', 'manager'],
    items: [
      { path: '/orders', label: 'الطلبات', icon: ShoppingBag, roles: ['admin', 'manager'] },
      { path: '/customers', label: 'العملاء', icon: Users, roles: ['admin', 'manager'] },
      { path: '/shipping', label: 'تسعيرة الشحن', icon: Truck, roles: ['admin', 'manager'] },
      { path: '/reports', label: 'التقارير والأرباح', icon: BarChart2, roles: ['admin'] },
    ],
  },
  {
    group: 'الإنتاج',
    roles: ['admin', 'manager'],
    items: [
      { path: '/production-orders', label: 'طلبات الإنتاج', icon: Layers, roles: ['admin', 'manager'] },
      { path: '/tasks', label: 'المهام الإنتاجية', icon: KanbanSquare, roles: ['admin', 'manager'] },
      { path: '/quality', label: 'مراقبة الجودة', icon: Target, roles: ['admin', 'manager'] },
      { path: '/screen-frames', label: 'إطارات الشاشة', icon: Layers, roles: ['admin', 'manager'] },
      { path: '/team', label: 'فريق العمل', icon: UserCog, roles: ['admin'] },
    ],
  },
  {
    group: 'المخزون والمشتريات',
    roles: ['admin', 'manager'],
    items: [
      { path: '/products', label: 'المنتجات', icon: Package, roles: ['admin', 'manager'] },
      { path: '/inventory', label: 'المخزون', icon: Package, roles: ['admin', 'manager'] },
      { path: '/suppliers', label: 'الموردون', icon: Users2, roles: ['admin', 'manager'] },
      { path: '/purchase-orders', label: 'طلبات الشراء', icon: ShoppingCart, roles: ['admin', 'manager'] },
      { path: '/expenses', label: 'المصروفات', icon: Receipt, roles: ['admin'] },
      { path: '/workstations', label: 'المعدات', icon: Settings, roles: ['admin', 'manager'] },
    ],
  },
  {
    group: 'الموقع العام (Storefront)',
    roles: ['admin'],
    items: [
      { path: '/site-publish', label: 'مركز الاعتماد والنشر', icon: CheckSquare, roles: ['admin'] },
      { path: '/site-settings', label: 'إعدادات المتجر العامة', icon: Globe, roles: ['admin'] },
      { path: '/site-header', label: 'رأس الصفحة (Header)', icon: LayoutTemplate, roles: ['admin'] },
      { path: '/site-homepage', label: 'الصفحة الرئيسية', icon: Home, roles: ['admin'] },
      { path: '/site-product', label: 'إعدادات صفحة المنتج', icon: Package, roles: ['admin'] },
      { path: '/site-forms', label: 'نماذج الإدخال (Forms)', icon: FileInput, roles: ['admin'] },
      { path: '/site-checkout', label: 'نصوص الدفع والسلة', icon: ShoppingCart, roles: ['admin'] },
      { path: '/site-tracking', label: 'شاشة تتبع الطلبات', icon: Navigation, roles: ['admin'] },
      { path: '/site-footer', label: 'تذييل الموقع (Footer)', icon: ArrowRightLeft, roles: ['admin'] },
      { path: '/site-pages', label: 'الصفحات الثابتة (Pages)', icon: FileCode, roles: ['admin'] },
    ],
  },
  {
    group: 'النظام',
    roles: ['admin'],
    items: [
      { path: '/roles', label: 'الأدوار والصلاحيات', icon: ShieldAlert, roles: ['admin'] },
    ],
  },
];

// ─── Theme Persistence ────────────────────────────────────────────────────────
function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('erp-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch { return 'dark'; }
}

function applyTheme(theme: 'dark' | 'light') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  try { localStorage.setItem('erp-theme', theme); } catch { }
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const { user, logout } = useAuthStore();

  const userRole = user?.role === 'project_admin' ? 'admin' : user?.role;
  const isAllowed = useCallback((roles: string[]) => !!(userRole && roles.includes(userRole as UserRole)), [userRole]);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-50 w-[240px] flex flex-col transform transition-transform duration-200 lg:transform-none ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-glow shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>PrintFlow</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>نظام ERP</p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_STRUCTURE.map((section, si) => {
            const visible = section.items.filter(item => isAllowed(item.roles));
            if (visible.length === 0) return null;
            return (
              <div key={si}>
                {section.group && (
                  <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
                    style={{ color: 'var(--text-muted)' }}>{section.group}</p>
                )}
                <nav className="space-y-0.5">
                  {visible.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/' || item.path === '/manager' || item.path === '/worker' || item.path === '/designer'}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100 ${isActive
                            ? 'shadow-sm'
                            : 'hover:opacity-80'
                          }`
                        }
                        style={({ isActive }) => isActive
                          ? {
                            backgroundColor: 'var(--sidebar-active-bg)',
                            color: 'var(--sidebar-active-text)',
                            borderRight: '3px solid var(--primary)',
                          }
                          : {
                            color: 'var(--sidebar-item)',
                            backgroundColor: 'transparent',
                          }
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {isActive && <ChevronRight className="w-3 h-3 mr-auto opacity-60 rotate-180" />}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* User footer */}
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium"
          >
            {theme === 'dark'
              ? <><Sun className="w-4 h-4 text-yellow-400" /><span style={{ color: 'var(--text-secondary)' }}>الوضع الفاتح</span></>
              : <><Moon className="w-4 h-4" style={{ color: 'var(--primary)' }} /><span style={{ color: 'var(--text-secondary)' }}>الوضع الداكن</span></>
            }
          </button>
          {/* User info */}
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="تسجيل الخروج"
              className="p-2 rounded-xl transition-colors shrink-0"
              style={{ color: 'var(--danger)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 flex items-center gap-4 px-5"
          style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>PrintFlow ERP</span>
          <div className="flex items-center gap-2 mr-auto">
            <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                color: 'var(--primary)',
                border: '1px solid var(--primary-soft-border)',
                backgroundColor: 'var(--primary-soft-bg)',
              }}>
              {user?.name}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
