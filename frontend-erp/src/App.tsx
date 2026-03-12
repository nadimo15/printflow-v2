import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import ProductionOrdersPage from './pages/ProductionOrdersPage';
import CustomersPage from './pages/CustomersPage';
import ProductionBoardPage from './pages/ProductionBoardPage';
import TeamPage from './pages/TeamPage';
import RolesPage from './pages/RolesPage';
import InventoryPage from './pages/InventoryPage';
import ExpensesPage from './pages/ExpensesPage';
import WorkstationsPage from './pages/WorkstationsPage';
import QualityControlPage from './pages/QualityControlPage';
import ReportPage from './pages/ReportPage';
import ShippingRulesPage from './pages/ShippingRulesPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import ScreenFramesPage from './pages/ScreenFramesPage';
import WorkerDashboardPage from './pages/WorkerDashboardPage';
import DesignerDashboardPage from './pages/DesignerDashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import SiteSettingsPage from './pages/SiteSettingsPage';
import SiteHeaderPage from './pages/SiteHeaderPage';
import SiteFooterPage from './pages/SiteFooterPage';
import SiteHomepagePage from './pages/SiteHomepagePage';
import SiteProductPage from './pages/SiteProductPage';
import SiteFormsPage from './pages/SiteFormsPage';
import SiteCheckoutPage from './pages/SiteCheckoutPage';
import SiteTrackingPage from './pages/SiteTrackingPage';
import SitePagesPage from './pages/SitePagesPage';
import PublishCenterPage from './pages/PublishCenterPage';

import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const { user } = useAuthStore();

  if (!user) {
    return <LoginPage />;
  }

  // Determine root based on role
  const getRootRedirect = () => {
    const effectiveRole = user.role === 'project_admin' ? 'admin' : user.role;
    switch (effectiveRole) {
      case 'worker': return <Navigate to="/worker" replace />;
      case 'designer': return <Navigate to="/designer" replace />;
      case 'manager': return <Navigate to="/manager" replace />;
      case 'admin': default: return <DashboardPage />;
    }
  };

  return (
    <Layout>
      <Routes>
        {/* Root Redirect Logic */}
        <Route path="/" element={getRootRedirect()} />

        {/* --- Role Specific Dashboards --- */}
        <Route path="/worker" element={<ProtectedRoute allowedRoles={['worker', 'admin', 'manager']}><WorkerDashboardPage /></ProtectedRoute>} />
        <Route path="/designer" element={<ProtectedRoute allowedRoles={['designer', 'admin', 'manager']}><DesignerDashboardPage /></ProtectedRoute>} />
        <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><ManagerDashboardPage /></ProtectedRoute>} />

        {/* --- Admin Only Routes --- */}
        <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><TeamPage /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute allowedRoles={['admin']}><RolesPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin']}><ExpensesPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportPage /></ProtectedRoute>} />
        <Route path="/shipping" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ShippingRulesPage /></ProtectedRoute>} />

        {/* --- Admin & Manager Shared Routes --- */}
        <Route path="/products" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ProductsPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><OrdersPage /></ProtectedRoute>} />
        <Route path="/production-orders" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ProductionOrdersPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CustomersPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/workstations" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><WorkstationsPage /></ProtectedRoute>} />
        <Route path="/quality" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><QualityControlPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ProductionBoardPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/screen-frames" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ScreenFramesPage /></ProtectedRoute>} />

        {/* --- Public Site Management (Admin Only) --- */}
        <Route path="/site-publish" element={<ProtectedRoute allowedRoles={['admin']}><PublishCenterPage /></ProtectedRoute>} />
        <Route path="/site-settings" element={<ProtectedRoute allowedRoles={['admin']}><SiteSettingsPage /></ProtectedRoute>} />
        <Route path="/site-header" element={<ProtectedRoute allowedRoles={['admin']}><SiteHeaderPage /></ProtectedRoute>} />
        <Route path="/site-homepage" element={<ProtectedRoute allowedRoles={['admin']}><SiteHomepagePage /></ProtectedRoute>} />
        <Route path="/site-product" element={<ProtectedRoute allowedRoles={['admin']}><SiteProductPage /></ProtectedRoute>} />
        <Route path="/site-forms" element={<ProtectedRoute allowedRoles={['admin']}><SiteFormsPage /></ProtectedRoute>} />
        <Route path="/site-checkout" element={<ProtectedRoute allowedRoles={['admin']}><SiteCheckoutPage /></ProtectedRoute>} />
        <Route path="/site-tracking" element={<ProtectedRoute allowedRoles={['admin']}><SiteTrackingPage /></ProtectedRoute>} />
        <Route path="/site-footer" element={<ProtectedRoute allowedRoles={['admin']}><SiteFooterPage /></ProtectedRoute>} />
        <Route path="/site-pages" element={<ProtectedRoute allowedRoles={['admin']}><SitePagesPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;
