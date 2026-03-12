import { useState, useMemo, useEffect } from 'react';
import { Search, Phone, Mail, ShoppingBag, DollarSign, Wallet } from 'lucide-react';
import { useCustomersStore } from '../store/customersStore';
import { useOrdersStore } from '../store/ordersStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const { customers, fetchCustomers } = useCustomersStore();
  const { orders, fetchOrders } = useOrdersStore();
  const [search, setSearch] = useState('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    // Ensure orders are also fetched to calculate stats
    if (orders.length === 0) fetchOrders();
  }, [fetchCustomers, fetchOrders, orders.length]);

  // Calculate customer stats from orders
  const customersWithStats = useMemo(() => {
    return customers.map((customer) => {
      // Match orders by customerId (robust) or fallback to name (legacy)
      const customerOrders = orders.filter(o =>
        (o.customerId && o.customerId === customer.id) ||
        (!o.customerId && o.customer === customer.name)
      );
      const total = customerOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        ...customer,
        ordersCount: customerOrders.length,
        total,
      };
    });
  }, [customers, orders]);

  const filteredCustomers = customersWithStats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleOpenPaymentModal = (customer: any) => {
    setSelectedCustomer(customer);
    setPaymentAmount(0);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomer || paymentAmount <= 0) return;
    setIsSubmitting(true);

    try {
      // Create Edge Function call for payment
      const response = await api.customers.recordPayment({
        customerId: selectedCustomer.id,
        amount: paymentAmount,
        recordedBy: 'admin' // In real app, pull from Auth Store
      });

      if (response.success) {
        toast.success(`تم تسجيل دفعة بقيمة ${paymentAmount.toLocaleString()} دج`);
        setIsPaymentModalOpen(false);
        fetchCustomers(); // Refresh balances
      } else {
        toast.error('فشل تسجيل الدفعة');
      }
    } catch (e) {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">العملاء</h1>
      </div>

      <div className="card">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن عميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-12"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا يوجد عملاء حالياً
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#5a8a8a]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#5a8a8a] font-bold text-lg">{customer.name[0]}</span>
                  </div>
                  <span className="text-sm text-gray-500">{customer.ordersCount} طلب</span>
                </div>

                <h3 className="font-bold text-lg mb-2">{customer.name}</h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                    <div className="flex items-center gap-2 text-gray-500">
                      <ShoppingBag className="w-4 h-4" />
                      <span>إجمالي الطلبات: {customer.total_spent?.toLocaleString() || customer.total.toLocaleString()} دج</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg mt-2">
                    <div className="flex items-center gap-2 text-red-600 font-medium">
                      <Wallet className="w-4 h-4" />
                      <span>الديون (الرصيد المتبقي):</span>
                    </div>
                    <span className="font-bold text-red-700">{customer.outstanding_balance?.toLocaleString() || 0} دج</span>
                  </div>

                  <button
                    onClick={() => handleOpenPaymentModal(customer)}
                    className="w-full mt-3 flex items-center justify-center gap-2 btn btn-secondary text-green-700 hover:bg-green-50 hover:border-green-200"
                  >
                    <DollarSign className="w-4 h-4" />
                    تسجيل دفعة مالية
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2">تسجيل دفعة للعميل</h2>
            <p className="text-gray-500 mb-6 text-sm">
              العميل: <b>{selectedCustomer.name}</b> <br />
              الرصيد المستحق (ديون): <b className="text-red-600">{selectedCustomer.outstanding_balance?.toLocaleString() || 0} دج</b>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المدفوع (دج)</label>
                <input
                  type="number"
                  min="0"
                  max={selectedCustomer.outstanding_balance || 0}
                  className="input w-full text-lg font-bold text-green-700 bg-green-50 border-green-200 focus:border-green-500 focus:ring-green-200"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-400 mt-1">يُخصم هذا المبلغ من الديون ويُضاف إلى الإيرادات الصافية.</p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                className="btn flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleRecordPayment}
                disabled={isSubmitting || paymentAmount <= 0}
              >
                {isSubmitting ? 'جاري التسجيل...' : 'تأكيد الدفعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
