import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import { useSiteConfig } from '../hooks/useSiteConfig';

import {
  Truck, Star, ChevronDown, ChevronUp, Loader2, ShoppingBag, Upload, Package, Clock, Shield, CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const ICON_MAP: Record<string, any> = {
  Package, Upload, Truck, Clock, Shield, CheckCircle, ShoppingBag, Star
};

export default function HomePage() {
  const { config } = useSiteConfig();
  const { homepage } = config;

  const faqs = (homepage.faqs || []).filter((f) => f.visible !== false);
  const reviews = (homepage.testimonials || []).filter((t) => t.visible !== false);
  const finalCta = homepage.final_cta;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.products.list();
        if (response.success && response.data) {
          setProducts(response.data.slice(0, 6)); // Show first 6 products
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error('فشل في تحميل المنتجات');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="animate-fade-in bg-surface-darker text-white min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* How It Works */}
      {homepage.how_it_works_visible && homepage.steps.length > 0 && (
        <section id="how-it-works" className="section-padding relative">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <span className="text-pakomi-glow font-bold tracking-wider uppercase text-sm">خطوات بسيطة</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">كيف تطلب؟</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">تحويل أفكارك إلى واقع في خطوات سهلة</p>
            </div>

            <div className={`grid md:grid-cols-${Math.min(homepage.steps.length, 4)} gap-8 relative`}>
              {/* Connecting Line */}
              {homepage.steps.length > 1 && (
                <div className="hidden md:block absolute top-[40%] left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-pakomi-purple to-transparent -z-10" />
              )}

              {homepage.steps.map((item, i) => {
                const Icon = ICON_MAP[item.icon_name] || CheckCircle;
                return (
                  <motion.div
                    key={item.id || i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="text-center group"
                  >
                    <div className="glass-card w-full p-8 relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-pakomi-glow to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="w-20 h-20 bg-surface-dark border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:border-pakomi-purple/50 group-hover:shadow-glow transition-all duration-300 relative z-10">
                        <Icon className="w-10 h-10 text-gray-400 group-hover:text-white transition-colors" />
                      </div>

                      <div className="absolute -top-4 -right-4 w-12 h-12 bg-pakomi-purple text-white rounded-full flex items-center justify-center text-xl font-bold shadow-glow opacity-90">
                        {i + 1}
                      </div>

                      <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section id="products" className="section-padding relative">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="text-pakomi-glow font-bold tracking-wider uppercase text-sm">منتجاتنا</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">اختر باقة التغليف التي تناسبك</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">مجموعة واسعة من المنتجات القابلة للتخصيص بلمسة احترافية</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-pakomi-glow" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <Link to={`/product/${product.id}`} className="glass-card block group overflow-hidden border border-white/10 hover:border-pakomi-purple/50 bg-surface-dark transition-all duration-300">
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={product.images?.[0] || product.image || '/placeholder.png'}
                        alt={product.name_ar || product.name || product.nameAr}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-darker to-transparent opacity-80" />
                    </div>
                    <div className="p-6 relative -mt-4 bg-surface-dark/95 backdrop-blur-sm rounded-t-2xl">
                      <h3 className="text-xl font-bold mb-2 text-white group-hover:text-pakomi-glow transition-colors">{product.name_ar || product.name || product.nameAr}</h3>
                      <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">{product.description_ar || product.description || product.descriptionAr}</p>

                      <div className="flex items-end justify-between pt-4 border-t border-white/5">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">يبدأ من</p>
                          <span className="text-2xl font-bold text-white">{(product.base_price || product.basePrice || 0).toLocaleString()}</span>
                          <span className="text-pakomi-glow text-sm mr-1 font-bold">دج</span>
                        </div>
                        <span className="text-xs text-white bg-pakomi-purple/20 border border-pakomi-purple/30 px-3 py-1.5 rounded-full font-medium shadow-[0_0_10px_rgba(102,45,145,0.2)]">
                          أقل كمية: {product.min_quantity || product.minQuantity || 1}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <section id="reviews" className="section-padding relative">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <span className="text-pakomi-glow font-bold tracking-wider uppercase text-sm">{config.product_page?.reviews?.title || "آراء العملاء"}</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">ماذا يقولون عنا؟</h2>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />)}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {reviews.map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="glass-card p-8 bg-surface-dark border border-white/5 relative group hover:border-pakomi-purple/40"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star className="w-24 h-24 text-white" />
                  </div>
                  <div className="flex gap-1 mb-6 relative z-10">
                    {[...Array(review.rating || 5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-8 text-lg leading-relaxed relative z-10">"{review.text}"</p>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 bg-pakomi-purple/20 border border-pakomi-purple/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(102,45,145,0.2)]">
                      <span className="text-pakomi-glow font-bold text-xl">{review.name ? review.name[0] : ''}</span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{review.name}</p>
                      <p className="text-xs text-gray-500">عميل موثق</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section id="faq" className="section-padding relative">
          <div className="max-w-3xl mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <span className="text-pakomi-glow font-bold tracking-wider uppercase text-sm">مساعدة</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3">الأسئلة الشائعة</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="glass-card overflow-hidden border border-white/10 transition-colors duration-300 hover:border-pakomi-purple/50">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full p-6 text-right flex justify-between items-center font-bold hover:bg-white/5 transition-colors text-white"
                  >
                    <span className="text-lg">{faq.q}</span>
                    {openFaq === i ? (
                      <ChevronUp className="w-6 h-6 text-pakomi-glow" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-pakomi-glow" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="p-6 pt-0 text-gray-400 leading-relaxed border-t border-white/5 mt-2 bg-black/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {finalCta && (
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pakomi-deep via-pakomi-purple to-surface-darker opacity-80" />
          <div className="blob-purple w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-screen opacity-50" />

          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">{finalCta.title}</h2>
            <p className="text-pakomi-glow font-medium text-xl md:text-2xl mb-10 max-w-2xl mx-auto">
              {finalCta.subtitle}
            </p>
            {finalCta.cta_label && (
              <Link to={finalCta.cta_url || '/products'} className="inline-flex items-center gap-2 btn-primary transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(138,77,204,0.6)]">
                <ShoppingBag className="w-6 h-6" />
                <span className="text-lg">{finalCta.cta_label}</span>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
