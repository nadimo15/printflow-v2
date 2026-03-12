import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingBag, Upload, Check, ArrowRight, Package, Loader2, ChevronDown, Truck, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useOrdersStore } from '../store/ordersStore';
import { api } from '../services/api';
import type { ProductFormData, ProductionOption, AttributeGroup } from '../types/product';
import { computeUnitPrice } from '../utils/productDomain';
import { useSiteConfig } from '../hooks/useSiteConfig';

const ICON_MAP: Record<string, any> = { Truck, Shield: Star, Package };

const wilayas = [
  'الجزائر العاصمة', 'وهران', 'قسنطينة', 'عنابة', 'سطيف', 'باتنة', 'بجاية', 'بليدة',
  'بويرة', 'تيزي وزو', 'المدية', 'الوادي', 'سعيدة', 'سكيكدة', 'قالمة', 'مستغانم',
  'تلمسان', 'جيجل', 'بسكرة', 'ورقلة', 'الأغواط', 'الشلف', 'تيبازة', 'البويرة'
];

export default function ProductDetailPage() {
  const { config } = useSiteConfig();
  const { product_page, forms } = config;
  const qForm = forms.quick_order;

  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { addOrder } = useOrdersStore();

  const [product, setProduct] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(100);

  // Multi-size support
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Store selected values for Production Options and Attributes
  const [selections, setSelections] = useState<Record<string, string>>({});

  const [customization, setCustomization] = useState<{
    designUrl: string;
    designFile?: File;
    notes: string;
  }>({
    designUrl: '',
    notes: '',
  });

  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderData, setOrderData] = useState({
    name: '',
    phone: '',
    email: '',
    wilaya: '',
    address: '',
  });

  // Detect if product uses multi-size pricing
  const isMultiSize = (tiers: any[]): boolean => {
    return Array.isArray(tiers) && tiers.length > 0 && tiers[0]?.tiers !== undefined;
  };

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await api.products.getById(id);
        if (response.success && response.data) {
          const p = response.data;
          setProduct(p);
          setQuantity(p.min_quantity || 100);

          if (isMultiSize(p.price_tiers || [])) {
            setSelectedSize(p.price_tiers[0].size);
            const firstTier = p.price_tiers[0]?.tiers?.[0];
            if (firstTier) setQuantity(firstTier.min_qty ?? firstTier.qty ?? p.min_quantity ?? 100);
          }

          const initialSelections: Record<string, string> = {};
          const prodOpts = p.production_options;
          if (Array.isArray(prodOpts)) {
            prodOpts.forEach((opt: ProductionOption) => {
              const defaultVal = opt.values?.find(v => v.is_default) || opt.values?.[0];
              if (defaultVal) initialSelections[opt.name_ar] = defaultVal.name_ar;
            });
          }

          if (Array.isArray(p.attribute_groups)) {
            p.attribute_groups.forEach((grp: AttributeGroup) => {
              if (grp.values?.length > 0) {
                initialSelections[grp.name_ar] = grp.values[0].name_ar;
              }
            });
          }

          setSelections(initialSelections);
        } else {
          toast.error('المنتج غير موجود');
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('فشل في تحميل المنتج');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const getUnitPrice = () => {
    if (!product) return 0;
    const tiers: any[] = product.price_tiers || [];
    let price = 0;

    if (isMultiSize(tiers)) {
      const sizeVariant = tiers.find((t: any) => t.size === selectedSize) || tiers[0];
      if (sizeVariant?.tiers) {
        const sorted = [...sizeVariant.tiers].sort((a: any, b: any) => (a.qty ?? a.min_qty) - (b.qty ?? b.min_qty));
        let matched = sorted[0];
        for (const tier of sorted) {
          if (quantity >= (tier.qty ?? tier.min_qty)) matched = tier;
        }
        price = matched?.unit_price ?? matched?.price ?? product.base_price;
      } else {
        price = product.base_price;
      }
    } else {
      price = computeUnitPrice(quantity, tiers, product.base_price);
    }

    if (Array.isArray(product.production_options)) {
      product.production_options.forEach((opt: any) => {
        const selectedName = selections[opt.name_ar];
        const val = opt.values?.find((v: any) => v.name_ar === selectedName);
        if (val) price += val.price_delta ?? 0;
      });
    }

    if (Array.isArray(product.attribute_groups)) {
      product.attribute_groups.forEach((grp: any) => {
        const selectedName = selections[grp.name_ar];
        const val = grp.values?.find((v: any) => v.name_ar === selectedName);
        if (val) price += val.price_delta ?? 0;
      });
    }

    return price;
  };

  const calculateTotal = () => {
    return getUnitPrice() * quantity;
  };

  const handleSelectionChange = (groupName: string, valueName: string) => {
    setSelections(prev => ({ ...prev, [groupName]: valueName }));
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Check required design file upload
    if (qForm?.design_upload?.visible && qForm?.design_upload?.require_upload && !customization.designUrl) {
      toast.error('رفع التصميم مطلوب لهذا المنتج');
      return;
    }

    let unitWeight = 0;
    const prodOpts = product.production_options as any;
    if (prodOpts?.variants && selectedSize) {
      const variantOpt = prodOpts.variants.find((v: any) => v.size === selectedSize);
      unitWeight = variantOpt?.unit_weight_kg ?? 0;
    } else if (prodOpts?.variants) {
      unitWeight = prodOpts.variants[0]?.unit_weight_kg ?? 0;
    }

    addItem({
      productId: product.id!,
      name: product.name_ar,
      price: getUnitPrice(),
      quantity,
      unit_weight: unitWeight,
      image: product.image || '/placeholder.png',
      customization: {
        ...selections,
        ...(selectedSize ? { selected_size: selectedSize } : {}),
        ...(customization.designUrl ? { designUrl: customization.designUrl } : {}),
        ...(customization.notes ? { notes: customization.notes } : {}),
        ...(uploadedFileName ? { designFileName: uploadedFileName } : {})
      },
    });
    toast.success('تمت الإضافة إلى السلة');
  };

  const handleQuickOrder = () => {
    if (qForm?.design_upload?.visible && qForm?.design_upload?.require_upload && !customization.designUrl) {
      toast.error('رفع التصميم مطلوب لإتمام الطلب');
      return;
    }
    setShowOrderForm(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomization(prev => ({
        ...prev,
        designUrl: event.target?.result as string,
        designFile: file
      }));
      setUploadedFileName(file.name);
      toast.success(`تم رفع الملف: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setCustomization(prev => ({ ...prev, designUrl: '', designFile: undefined }));
    setUploadedFileName('');
  };

  const submitQuickOrder = async () => {
    if (!product) return;

    // Dynamic Validation based on config
    const formFields = [
      { key: 'name', value: orderData.name, config: qForm.name },
      { key: 'phone', value: orderData.phone, config: qForm.phone },
      { key: 'email', value: orderData.email, config: qForm.email },
      { key: 'wilaya', value: orderData.wilaya, config: qForm.wilaya },
      { key: 'address', value: orderData.address, config: qForm.address },
    ];

    for (const field of formFields) {
      if (field.config?.visible && field.config?.required && !field.value?.trim()) {
        toast.error(`حقل ${field.config.label} مطلوب`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let unitWeightQ = 0;
      const prodOptsQ = product.production_options as any;
      if (prodOptsQ?.variants && selectedSize) {
        const vOpt = prodOptsQ.variants.find((v: any) => v.size === selectedSize);
        unitWeightQ = vOpt?.unit_weight_kg ?? 0;
      } else if (prodOptsQ?.variants) {
        unitWeightQ = prodOptsQ.variants[0]?.unit_weight_kg ?? 0;
      }

      const order = {
        id: '',
        orderNumber: '',
        customer: orderData.name,
        phone: orderData.phone,
        email: orderData.email || undefined,
        wilaya: orderData.wilaya,
        address: orderData.address,
        total: calculateTotal(),
        status: 'pending' as const,
        date: new Date().toISOString().split('T')[0],
        items: [{
          productId: product.id,
          name: product.name_ar,
          quantity: quantity,
          price: getUnitPrice(),
          unit_weight: unitWeightQ,
          image: product.image,
          customization: {
            ...selections,
            ...(selectedSize ? { selected_size: selectedSize } : {}),
            ...(customization.designUrl ? { designUrl: customization.designUrl } : {}),
            ...(customization.notes ? { notes: customization.notes } : {}),
            ...(uploadedFileName ? { designFileName: uploadedFileName } : {})
          },
        }],
        notes: customization.notes || undefined,
        productionProgress: 0,
      };

      const success = await addOrder(order);

      if (success) {
        toast.success('تم إرسال الطلب بنجاح!');
        setShowOrderForm(false);
        const currentOrder = useOrdersStore.getState().currentOrder;
        const displayId = currentOrder?.orderNumber || currentOrder?.id || '';
        navigate(`/order-success/${displayId}`);
      } else {
        toast.error('فشل في حفظ الطلب');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-darker flex items-center justify-center pt-24">
        <Loader2 className="w-8 h-8 animate-spin text-pakomi-glow" />
      </div>
    );
  }

  if (!product) return null;

  const productImages = Array.isArray(product.images) ? product.images : [product.image].filter(Boolean);

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-darker pt-24 pb-16">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="blob-purple w-[600px] h-[600px] top-[-100px] left-[-100px] opacity-30 mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8 font-medium">
          <a href="/" className="hover:text-white transition-colors">الرئيسية</a>
          <ArrowRight className="w-4 h-4 rotate-180 text-gray-600" />
          <a href="/products" className="hover:text-white transition-colors">المنتجات</a>
          <ArrowRight className="w-4 h-4 rotate-180 text-gray-600" />
          <span className="text-pakomi-glow">{product.name_ar}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="glass-card overflow-hidden mb-6 aspect-square p-2 border-white/5 bg-surface-dark/50">
              <div className="w-full h-full rounded-xl overflow-hidden bg-black/50">
                <img src={productImages[selectedImage] || '/placeholder.png'} alt={product.name_ar} className="w-full h-full object-cover" />
              </div>
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {productImages.map((img: string, i: number) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`min-w-[5rem] h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedImage === i ? 'border-pakomi-purple shadow-[0_0_15px_rgba(102,45,145,0.4)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover bg-surface-darker" />
                  </button>
                ))}
              </div>
            )}

            {/* Shipping Badges */}
            {product_page?.shipping_badges && product_page.shipping_badges.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-4">
                {product_page.shipping_badges.filter(b => b.enabled).map((badge, idx) => {
                  const BIcon = ICON_MAP[badge.icon] || Package;
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-pakomi-purple/10 border border-pakomi-purple/20 px-4 py-3 rounded-xl">
                      <BIcon className="w-5 h-5 text-pakomi-glow" />
                      <span className="text-sm font-medium text-white">{badge.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stock Status */}
            {product_page?.show_stock_status !== false && (
              <div className="mt-4 flex items-center gap-2 text-green-400 bg-green-500/10 w-fit px-4 py-2 border border-green-500/20 rounded-xl font-medium">
                <Check className="w-4 h-4" />
                <span>متوفر في المخزون (التصنيع عند الطلب)</span>
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl lg:text-5xl font-bold mb-4 text-white tracking-tight">{product.name_ar}</h1>
            <p className="text-gray-400 mb-8 text-lg leading-relaxed whitespace-pre-wrap">{product.description_ar}</p>

            {/* Price Card */}
            <div className="glass-card p-8 mb-10 border-white/10 bg-surface-dark relative overflow-hidden group hover:border-pakomi-purple/30 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pakomi-purple/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50"></div>
              <p className="text-gray-400 mb-3 text-sm font-medium">السعر الإجمالي التقديري</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold text-white tracking-tight">{calculateTotal().toLocaleString()}</span>
                <span className="text-pakomi-glow font-bold">دج</span>
              </div>
              <div className="flex items-center text-sm text-gray-300 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 inline-flex backdrop-blur-sm">
                <span className="font-bold text-white">{quantity}</span>
                <span className="ml-1">{product.unit_of_measure}</span>
                <span className="mx-3 text-gray-600">|</span>
                <span className="text-pakomi-glow">{getUnitPrice().toLocaleString()} دج</span>
                {product_page?.show_price_per_unit !== false && <span className="mr-1">/ للوحدة</span>}
              </div>
            </div>

            {/* Production Options & Attributes */}
            {Array.isArray(product.production_options) && product.production_options.map((opt: any) => (
              <div key={opt.id || opt.name_ar} className="mb-8">
                <label className="block font-bold mb-4 text-gray-200 text-lg">{opt.name_ar}</label>
                <div className="flex flex-wrap gap-3">
                  {opt.values?.map((val: any) => (
                    <button
                      key={val.name_ar}
                      onClick={() => handleSelectionChange(opt.name_ar, val.name_ar)}
                      className={`px-5 py-3 rounded-xl border transition-all duration-300 text-sm font-medium ${selections[opt.name_ar] === val.name_ar ? 'border-pakomi-purple bg-pakomi-purple/20 text-white shadow-[0_0_15px_rgba(102,45,145,0.2)]' : 'border-white/10 bg-surface-dark/50 text-gray-400 hover:text-white hover:border-white/20 hover:bg-surface-dark'}`}
                    >
                      {val.name_ar}
                      {val.price_delta > 0 && <span className="text-xs mr-2 text-pakomi-glow bg-pakomi-purple/20 px-2 py-1 rounded-md font-bold">+{val.price_delta} دج</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {Array.isArray(product.attribute_groups) && product.attribute_groups.map((grp) => (
              <div key={grp.id || grp.name_ar} className="mb-8">
                <label className="block font-bold mb-4 text-gray-200 text-lg">{grp.name_ar}</label>
                <div className="flex flex-wrap gap-3">
                  {grp.values.map((val) => (
                    <button
                      key={val.name_ar}
                      onClick={() => handleSelectionChange(grp.name_ar, val.name_ar)}
                      className={`px-5 py-3 rounded-xl border transition-all duration-300 text-sm font-medium ${selections[grp.name_ar] === val.name_ar ? 'border-pakomi-purple bg-pakomi-purple/20 text-white shadow-[0_0_15px_rgba(102,45,145,0.2)]' : 'border-white/10 bg-surface-dark/50 text-gray-400 hover:text-white hover:border-white/20 hover:bg-surface-dark'}`}
                    >
                      {val.name_ar}
                      {val.price_delta > 0 && <span className="text-xs mr-2 text-pakomi-glow bg-pakomi-purple/20 px-2 py-1 rounded-md font-bold">+{val.price_delta} دج</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Size Selector */}
            {product.price_tiers && isMultiSize(product.price_tiers) && (
              <div className="mb-8">
                <label className="block font-bold mb-4 text-gray-200 text-lg">المقاس</label>
                <div className="flex flex-wrap gap-3">
                  {(product.price_tiers as any[]).map((variant: any) => (
                    <button
                      key={variant.size}
                      onClick={() => {
                        setSelectedSize(variant.size);
                        const firstTier = variant.tiers?.[0];
                        if (firstTier) setQuantity(firstTier.min_qty ?? firstTier.qty ?? product.min_quantity ?? 100);
                      }}
                      className={`px-6 py-3 rounded-xl border-2 transition-all duration-300 text-sm font-bold ${selectedSize === variant.size ? 'border-pakomi-purple bg-pakomi-purple/20 text-white shadow-[0_0_15px_rgba(102,45,145,0.2)]' : 'border-white/10 bg-surface-dark/50 text-gray-400 hover:text-white hover:border-white/20'}`}
                    >
                      {variant.label || variant.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-10">
              <label className="block font-bold mb-4 text-gray-200 text-lg">
                الكمية {product_page?.show_min_quantity !== false && <span className="text-sm font-medium text-gray-500 mr-2 bg-black/30 px-3 py-1 rounded-full border border-white/5">(الحد الأدنى: {product.min_quantity})</span>}
              </label>

              {product.price_tiers && isMultiSize(product.price_tiers) ? (() => {
                const sizeVariant = (product.price_tiers as any[]).find((t: any) => t.size === selectedSize) || (product.price_tiers as any[])[0];
                const tiers = sizeVariant?.tiers || [];
                return (
                  <div className="relative">
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full p-4 pl-12 bg-surface-dark/80 backdrop-blur-sm border border-white/10 rounded-xl appearance-none cursor-pointer hover:border-pakomi-purple/50 focus:border-pakomi-purple focus:ring-1 focus:ring-pakomi-purple transition-all outline-none text-white text-lg font-medium shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                    >
                      {tiers.map((tier: any, idx: number) => {
                        const tQty = tier.qty ?? tier.min_qty;
                        const tPrice = tier.unit_price ?? tier.price;
                        return <option key={idx} value={tQty} className="bg-surface-dark text-white">{tQty} {product.unit_of_measure} — بسعر {tPrice} دج/قطعة</option>;
                      })}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-pakomi-glow"><ChevronDown className="w-5 h-5" /></div>
                  </div>
                );
              })() : Array.isArray(product.price_tiers) && product.price_tiers.length > 0 ? (
                <div className="relative">
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-4 pl-12 bg-surface-dark/80 backdrop-blur-sm border border-white/10 rounded-xl appearance-none cursor-pointer hover:border-pakomi-purple/50 focus:border-pakomi-purple focus:ring-1 focus:ring-pakomi-purple transition-all outline-none text-white text-lg font-medium shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                  >
                    {(product.price_tiers as any[]).sort((a: any, b: any) => a.min_qty - b.min_qty).map((tier: any, idx: number) => (
                      <option key={idx} value={tier.min_qty} className="bg-surface-dark text-white">
                        {tier.min_qty} {product.unit_of_measure} - بسعر {tier.unit_price} دج
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-pakomi-glow"><ChevronDown className="w-5 h-5" /></div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-surface-dark/50 p-2 rounded-2xl border border-white/10 w-max">
                  <button onClick={() => setQuantity(Math.max(product.min_quantity, quantity - 100))} className="w-14 h-14 bg-black/40 rounded-xl flex items-center justify-center hover:bg-pakomi-purple/20 hover:text-pakomi-glow transition-colors text-white border border-white/5 shadow-sm"><Minus className="w-6 h-6" /></button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(product.min_quantity, Number(e.target.value)))} className="w-28 text-center py-3 bg-transparent border-none font-bold text-2xl text-white outline-none" />
                  <button onClick={() => setQuantity(quantity + 100)} className="w-14 h-14 bg-black/40 rounded-xl flex items-center justify-center hover:bg-pakomi-purple/20 hover:text-pakomi-glow transition-colors text-white border border-white/5 shadow-sm"><Plus className="w-6 h-6" /></button>
                </div>
              )}
            </div>

            {/* Design Upload */}
            {qForm?.design_upload?.visible !== false && (
              <div className="mb-10 border-t border-white/10 pt-10">
                <label className="block font-bold mb-4 text-gray-200 text-lg">
                  {qForm?.design_upload?.label || 'ملف التصميم'}
                  {!qForm?.design_upload?.require_upload && <span className="text-gray-500 font-normal text-sm ml-2">(اختياري)</span>}
                </label>
                {qForm?.design_upload?.help_text && (
                  <p className="text-sm text-gray-400 mb-3">{qForm.design_upload.help_text}</p>
                )}

                <div className="relative">
                  <input type="file" id="design-upload" accept=".png,.jpg,.jpeg,.pdf,.svg,.ai,.eps" onChange={handleFileUpload} className="hidden" />
                  {!customization.designUrl ? (
                    <label htmlFor="design-upload" className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-pakomi-purple/50 hover:bg-surface-dark/80 transition-all duration-300 cursor-pointer block bg-surface-dark/30 group">
                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-pakomi-purple/20 group-hover:scale-110 transition-all duration-300">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-pakomi-glow transition-colors" />
                      </div>
                      <p className="text-white font-medium text-lg mb-1">{qForm?.design_upload?.placeholder || 'اضغط لرفع الملف أو اسحب الملف هنا'}</p>
                      <p className="text-sm text-gray-500">PNG, JPG, PDF, SVG, AI (Max 10MB)</p>
                    </label>
                  ) : (
                    <div className="border border-green-500/30 rounded-2xl p-5 bg-green-500/10 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                      <div className="flex items-center gap-4">
                        {customization.designUrl.startsWith('data:image') ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-green-500/50 p-0.5 bg-black"><img src={customization.designUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" /></div>
                        ) : (
                          <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center border border-green-500/30"><Package className="w-7 h-7" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate text-lg">{uploadedFileName || 'تم رفع الملف'}</p>
                          <p className="text-sm text-green-400 font-medium flex items-center gap-1 mt-0.5"><Check className="w-4 h-4" /> جاهز للإرسال</p>
                        </div>
                        <button onClick={clearUpload} className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors border border-transparent hover:border-red-500/30"><Minus className="w-5 h-5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {qForm?.notes?.visible !== false && (
              <div className={`${qForm?.design_upload?.visible !== false ? 'mt-6' : 'mb-10 border-t border-white/10 pt-10'}`}>
                {qForm?.notes?.label && <label className="block font-bold mb-2 text-gray-200">{qForm.notes.label}</label>}
                <textarea
                  placeholder={qForm?.notes?.placeholder || "ملاحظات إضافية حول الطلب (تعديلات، ألوان معينة...)"}
                  value={customization.notes}
                  onChange={(e) => setCustomization(prev => ({ ...prev, notes: e.target.value }))}
                  className="input resize-none h-32 bg-surface-dark/50 border-white/10 text-white placeholder:text-gray-600 focus:bg-surface-dark"
                />
                {qForm?.notes?.help_text && <p className="text-sm text-gray-400 mt-2">{qForm.notes.help_text}</p>}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 sticky bottom-4 bg-surface-darker/90 backdrop-blur-xl p-4 md:p-6 rounded-3xl shadow-2xl border border-white/10 sm:relative sm:shadow-none sm:border-none sm:bg-transparent sm:bottom-auto sm:p-0 z-20 mt-10">
              <button onClick={handleAddToCart} className="btn-primary flex-1 py-5 text-lg font-bold shadow-[0_0_30px_rgba(138,77,204,0.4)] transform hover:scale-105 active:scale-95 transition-all">
                <ShoppingBag className="w-6 h-6" />
                {product_page?.add_to_cart_button_text || 'أضف إلى السلة'}
              </button>
              <button onClick={handleQuickOrder} className="btn-secondary flex-1 py-5 text-lg font-bold bg-surface-dark/80 border-2 border-white/10 text-white hover:border-pakomi-glow hover:text-pakomi-glow hover:bg-surface-dark transform hover:scale-105 active:scale-95 transition-all">
                <Package className="w-6 h-6" />
                {product_page?.quick_order_button_text || 'طلب سريع'}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Quick Order Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-surface-dark border border-white/10 rounded-3xl max-w-lg w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-pakomi-purple/20 rounded-full blur-3xl"></div>
              <h3 className="text-2xl font-bold mb-8 text-center text-white relative z-10">{product_page?.quick_order_button_text || 'إتمام الطلب السريع'}</h3>

              <div className="space-y-5 relative z-10">
                {qForm?.name?.visible !== false && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      {qForm?.name?.label || 'الاسم الكامل'} {qForm?.name?.required && <span className="text-red-500">*</span>}
                    </label>
                    <input type="text" value={orderData.name} onChange={(e) => setOrderData({ ...orderData, name: e.target.value })} className="input bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/50" placeholder={qForm?.name?.placeholder || "محمد بن عبد الله"} required={qForm?.name?.required} />
                    {qForm?.name?.help_text && <p className="text-xs text-gray-500 mt-1">{qForm.name.help_text}</p>}
                  </div>
                )}
                {qForm?.phone?.visible !== false && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      {qForm?.phone?.label || 'رقم الهاتف'} {qForm?.phone?.required && <span className="text-red-500">*</span>}
                    </label>
                    <input type="tel" value={orderData.phone} onChange={(e) => setOrderData({ ...orderData, phone: e.target.value })} className="input bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/50 text-left" placeholder={qForm?.phone?.placeholder || "05XXXXXXXX"} dir="ltr" required={qForm?.phone?.required} />
                    {qForm?.phone?.help_text && <p className="text-xs text-gray-500 mt-1">{qForm.phone.help_text}</p>}
                  </div>
                )}
                {qForm?.email?.visible && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      {qForm.email.label} {qForm.email.required && <span className="text-red-500">*</span>}
                    </label>
                    <input type="email" value={orderData.email} onChange={(e) => setOrderData({ ...orderData, email: e.target.value })} className="input bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/50 text-left" placeholder={qForm.email.placeholder} dir="ltr" required={qForm.email.required} />
                    {qForm.email.help_text && <p className="text-xs text-gray-500 mt-1">{qForm.email.help_text}</p>}
                  </div>
                )}
                {qForm?.wilaya?.visible !== false && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      {qForm?.wilaya?.label || 'الولاية'} {qForm?.wilaya?.required && <span className="text-red-500">*</span>}
                    </label>
                    <select value={orderData.wilaya} onChange={(e) => setOrderData({ ...orderData, wilaya: e.target.value })} className="input appearance-none bg-black/30 border-white/10 text-white focus:bg-black/50" required={qForm?.wilaya?.required}>
                      <option value="" className="text-gray-500 bg-surface-dark">{qForm?.wilaya?.placeholder || 'اختر الولاية...'}</option>
                      {wilayas.map(w => <option key={w} value={w} className="bg-surface-dark">{w}</option>)}
                    </select>
                    {qForm?.wilaya?.help_text && <p className="text-xs text-gray-500 mt-1">{qForm.wilaya.help_text}</p>}
                  </div>
                )}
                {qForm?.address?.visible !== false && (
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      {qForm?.address?.label || 'العنوان'} {qForm?.address?.required && <span className="text-red-500">*</span>}
                    </label>
                    <input type="text" value={orderData.address} onChange={(e) => setOrderData({ ...orderData, address: e.target.value })} className="input bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/50" placeholder={qForm?.address?.placeholder || "الحي، البلدية..."} required={qForm?.address?.required} />
                    {qForm?.address?.help_text && <p className="text-xs text-gray-500 mt-1">{qForm.address.help_text}</p>}
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-10 relative z-10">
                <button onClick={() => setShowOrderForm(false)} className="flex-1 py-4 rounded-xl border-2 border-white/10 text-gray-300 font-bold hover:bg-white/5 hover:text-white transition-all duration-300" disabled={isSubmitting}>إلغاء</button>
                <button onClick={submitQuickOrder} className="btn-primary flex-1 py-4 text-lg" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />} تأكيد الطلب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
