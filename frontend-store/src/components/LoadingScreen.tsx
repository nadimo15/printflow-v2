import { Package } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Package className="w-10 h-10 text-white" />
        </div>
        <p className="text-gray-600 font-medium">جاري التحميل...</p>
      </div>
    </div>
  );
}
