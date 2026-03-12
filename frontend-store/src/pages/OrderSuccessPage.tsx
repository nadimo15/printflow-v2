import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Clock, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect to tracking after 5 seconds
    const timer = setTimeout(() => {
      navigate(`/track/${orderId}`);
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, orderId]);

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          
          <h1 className="text-3xl font-bold mb-4">تم إرسال طلبك بنجاح!</h1>
          <p className="text-gray-600 mb-2">
            رقم الطلب: <span className="font-bold text-primary">{orderId}</span>
          </p>
          <p className="text-gray-500 mb-8">
            سنتواصل معك قريباً لتأكيد الطلب
          </p>

          <div className="bg-white rounded-2xl p-6 mb-8">
            <h3 className="font-bold mb-4">ماذا سيحدث الآن؟</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="text-right">
                  <p className="font-medium">مراجعة الطلب</p>
                  <p className="text-sm text-gray-500">سنقوم بمراجعة طلبك خلال 24 ساعة</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="text-right">
                  <p className="font-medium">تواصل معك</p>
                  <p className="text-sm text-gray-500">سنcontactك لتأكيد التفاصيل</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="text-right">
                  <p className="font-medium">بدء الإنتاج</p>
                  <p className="text-sm text-gray-500">سنبدأ في تنفيذ طلبك فور التأكيد</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={`/track/${orderId}`}
              className="btn-primary"
            >
              تتبع الطلب
            </a>
            <a 
              href="/"
              className="btn-secondary"
            >
              العودة للرئيسية
            </a>
          </div>
          
          <p className="text-sm text-gray-400 mt-8">
            سيتم تحويلك تلقائياً إلى صفحة التتبع خلال 5 ثواني...
          </p>
        </motion.div>
      </div>
    </div>
  );
}
