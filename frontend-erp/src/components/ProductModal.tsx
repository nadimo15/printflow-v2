import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Printer, Palette, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface ProductModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any, bomItems?: any[]) => void;
}

const categories = [
  { value: 'bags', label: 'أكياس' },
  { value: 'apparel', label: 'ملابس' },
  { value: 'packaging', label: 'تغليف' },
  { value: 'boxes', label: 'صناديق' },
  { value: 'cups', label: 'أكواب' },
  { value: 'stationery', label: 'قرطاسية' },
  { value: 'promotional', label: 'ترويجية' },
  { value: 'stickers', label: 'ملصقات' },
];

// Default print options
const defaultPrintOptions = {
  enabled: false,
  sides: {
    enabled: true,
    options: [
      { value: 'one_side', labelAr: 'وجه واحد', labelEn: 'One Side', priceAdjustment: 0 },
      { value: 'two_sides', labelAr: 'وجهين', labelEn: 'Two Sides', priceAdjustment: 15 },
    ],
  },
  colors: {
    enabled: true,
    options: [
      { value: 'one_color', labelAr: 'لون واحد', labelEn: 'One Color', priceAdjustment: 0 },
      { value: 'two_colors', labelAr: 'لونان', labelEn: 'Two Colors', priceAdjustment: 10 },
      { value: 'three_colors', labelAr: 'ثلاثة ألوان', labelEn: 'Three Colors', priceAdjustment: 20 },
      { value: 'full_color', labelAr: 'ألوان كاملة', labelEn: 'Full Color', priceAdjustment: 35 },
    ],
  },
};

export default function ProductModal({ product, isOpen, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    category: 'bags',
    base_price: 0,
    min_quantity: 100,
    unit_of_measure: 'قطعة',
    is_active: true,
    is_published: true,
    image: '',
    attributes: [] as any[],
    price_tiers: [] as { quantity: number; price: number }[],
    print_options: defaultPrintOptions,
  });

  const [newAttribute, setNewAttribute] = useState({ name: '', name_ar: '' });
  const [newAttributeValue, setNewAttributeValue] = useState({ value: '', priceAdjustment: 0 });
  const [editingAttributeIndex, setEditingAttributeIndex] = useState<number | null>(null);

  const [bomItems, setBomItems] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [bomLoading, setBomLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        ...formData,
        ...product,
        name_ar: product.name_ar || '',
        description_ar: product.description_ar || '',
        base_price: product.base_price || 0,
        min_quantity: product.min_quantity || 100,
        unit_of_measure: product.unit_of_measure || 'قطعة',
        is_active: product.is_active !== undefined ? product.is_active : true,
        is_published: product.is_published !== undefined ? product.is_published : true,
        attributes: product.attributes || [],
        price_tiers: product.price_tiers || [],
        print_options: product.print_options || defaultPrintOptions,
      });
      setBomLoading(true);
      api.productBom.listByProduct(product.id).then(res => {
        if (res.success) setBomItems(res.data || []);
        setBomLoading(false);
      });
    } else {
      // Reset for new product
      setFormData({
        id: '',
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        category: 'bags',
        base_price: 0,
        min_quantity: 100,
        unit_of_measure: 'قطعة',
        is_active: true,
        is_published: true,
        image: '',
        attributes: [],
        price_tiers: [],
        print_options: defaultPrintOptions,
      });
      setBomItems([]);
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (isOpen) {
      api.inventory.list().then(res => {
        if (res.success) setInventoryItems(res.data || []);
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_ar || !formData.name) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }

    if (formData.base_price <= 0) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }

    onSave(formData, bomItems);
  };

  const addAttribute = () => {
    if (!newAttribute.name_ar) {
      toast.error('يرجى إدخال اسم الخاصية');
      return;
    }

    setFormData({
      ...formData,
      attributes: [...formData.attributes, { ...newAttribute, values: [] }],
    });
    setNewAttribute({ name: '', name_ar: '' });
    setEditingAttributeIndex(formData.attributes.length);
  };

  const addAttributeValue = (attrIndex: number) => {
    if (!newAttributeValue.value) {
      toast.error('يرجى إدخال قيمة الخاصية');
      return;
    }

    const updatedAttributes = [...formData.attributes];
    updatedAttributes[attrIndex].values.push({ ...newAttributeValue });
    setFormData({ ...formData, attributes: updatedAttributes });
    setNewAttributeValue({ value: '', priceAdjustment: 0 });
  };

  const removeAttribute = (index: number) => {
    const updatedAttributes = formData.attributes.filter((_, i) => i !== index);
    setFormData({ ...formData, attributes: updatedAttributes });
    if (editingAttributeIndex === index) {
      setEditingAttributeIndex(null);
    }
  };

  const removeAttributeValue = (attrIndex: number, valueIndex: number) => {
    const updatedAttributes = [...formData.attributes];
    updatedAttributes[attrIndex].values = updatedAttributes[attrIndex].values.filter((_: any, i: number) => i !== valueIndex);
    setFormData({ ...formData, attributes: updatedAttributes });
  };

  const addPriceTier = () => {
    setFormData({
      ...formData,
      price_tiers: [...formData.price_tiers, { quantity: formData.min_quantity, price: formData.base_price }],
    });
  };

  const updatePriceTier = (index: number, field: 'quantity' | 'price', value: number) => {
    const updatedTiers = [...formData.price_tiers];
    updatedTiers[index][field] = value;
    setFormData({ ...formData, price_tiers: updatedTiers });
  };

  const removePriceTier = (index: number) => {
    const updatedTiers = formData.price_tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, price_tiers: updatedTiers });
  };

  // Print Options handlers
  const togglePrintOptions = (enabled: boolean) => {
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        enabled,
      },
    });
  };

  const togglePrintSides = (enabled: boolean) => {
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        sides: {
          ...formData.print_options.sides,
          enabled,
        },
      },
    });
  };

  const togglePrintColors = (enabled: boolean) => {
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        colors: {
          ...formData.print_options.colors,
          enabled,
        },
      },
    });
  };

  const updatePrintSideOption = (index: number, field: 'labelAr' | 'labelEn' | 'priceAdjustment', value: string | number) => {
    const updatedOptions = [...formData.print_options.sides.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        sides: {
          ...formData.print_options.sides,
          options: updatedOptions,
        },
      },
    });
  };

  const updatePrintColorOption = (index: number, field: 'labelAr' | 'labelEn' | 'priceAdjustment', value: string | number) => {
    const updatedOptions = [...formData.print_options.colors.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        colors: {
          ...formData.print_options.colors,
          options: updatedOptions,
        },
      },
    });
  };

  const addPrintSideOption = () => {
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        sides: {
          ...formData.print_options.sides,
          options: [
            ...formData.print_options.sides.options,
            { value: `side_${Date.now()}`, labelAr: '', labelEn: '', priceAdjustment: 0 },
          ],
        },
      },
    });
  };

  const addPrintColorOption = () => {
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        colors: {
          ...formData.print_options.colors,
          options: [
            ...formData.print_options.colors.options,
            { value: `color_${Date.now()}`, labelAr: '', labelEn: '', priceAdjustment: 0 },
          ],
        },
      },
    });
  };

  const removePrintSideOption = (index: number) => {
    const updatedOptions = formData.print_options.sides.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        sides: {
          ...formData.print_options.sides,
          options: updatedOptions,
        },
      },
    });
  };

  const removePrintColorOption = (index: number) => {
    const updatedOptions = formData.print_options.colors.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      print_options: {
        ...formData.print_options,
        colors: {
          ...formData.print_options.colors,
          options: updatedOptions,
        },
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold">
              {product ? 'تعديل منتج' : 'إضافة منتج جديد'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">اسم المنتج (عربي) *</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">اسم المنتج (English)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">الوصف (عربي)</label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="input w-full resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block font-medium mb-2">الوصف (English)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Category & Pricing */}
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium mb-2">الفئة</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-2">السعر الأساسي *</label>
                <input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  className="input w-full"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2">الحد الأدنى للكمية</label>
                <input
                  type="number"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
                  className="input w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="block font-medium mb-2">وحدة القياس</label>
                <input
                  type="text"
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-primary rounded"
                />
                <span>نشط</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-5 h-5 text-primary rounded"
                />
                <span>منشور</span>
              </label>
            </div>

            {/* Image URL */}
            <div>
              <label className="block font-medium mb-2">رابط الصورة</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="input w-full"
                placeholder="https://example.com/image.jpg"
              />
              {formData.image && (
                <img src={formData.image} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
              )}
            </div>

            {/* Price Tiers */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">درجات الأسعار (حسب الكمية)</h3>
                <button
                  type="button"
                  onClick={addPriceTier}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  <Plus className="w-4 h-4" />
                  إضافة
                </button>
              </div>

              {formData.price_tiers.length === 0 ? (
                <p className="text-gray-500 text-sm">لا توجد درجات أسعار مضافة</p>
              ) : (
                <div className="space-y-2">
                  {formData.price_tiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">الكمية</label>
                        <input
                          type="number"
                          value={tier.quantity}
                          onChange={(e) => updatePriceTier(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="input w-full"
                          min="1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">السعر للقطعة (دج)</label>
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => updatePriceTier(index, 'price', parseFloat(e.target.value) || 0)}
                          className="input w-full"
                          min="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePriceTier(index)}
                        className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print Options Section */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">خيارات الطباعة</h3>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-sm">تفعيل خيارات الطباعة</span>
                  <input
                    type="checkbox"
                    checked={formData.print_options.enabled}
                    onChange={(e) => togglePrintOptions(e.target.checked)}
                    className="w-5 h-5 text-primary rounded"
                  />
                </label>
              </div>

              {formData.print_options.enabled && (
                <div className="space-y-6">
                  {/* Print Sides */}
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium">طباعة الوجه</h4>
                      </div>
                      <label className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">تفعيل</span>
                        <input
                          type="checkbox"
                          checked={formData.print_options.sides.enabled}
                          onChange={(e) => togglePrintSides(e.target.checked)}
                          className="w-4 h-4 text-primary rounded"
                        />
                      </label>
                    </div>

                    {formData.print_options.sides.enabled && (
                      <div className="space-y-2">
                        {formData.print_options.sides.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="الاسم بالعربية"
                              value={option.labelAr}
                              onChange={(e) => updatePrintSideOption(index, 'labelAr', e.target.value)}
                              className="input flex-1 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Name in English"
                              value={option.labelEn}
                              onChange={(e) => updatePrintSideOption(index, 'labelEn', e.target.value)}
                              className="input flex-1 text-sm"
                            />
                            <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-lg">
                              <span className="text-sm text-gray-500">+</span>
                              <input
                                type="number"
                                value={option.priceAdjustment}
                                onChange={(e) => updatePrintSideOption(index, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-transparent text-sm text-center"
                                min="0"
                              />
                              <span className="text-sm text-gray-500">دج</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePrintSideOption(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addPrintSideOption}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة خيار وجه
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Print Colors */}
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium">عدد ألوان الطباعة</h4>
                      </div>
                      <label className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">تفعيل</span>
                        <input
                          type="checkbox"
                          checked={formData.print_options.colors.enabled}
                          onChange={(e) => togglePrintColors(e.target.checked)}
                          className="w-4 h-4 text-primary rounded"
                        />
                      </label>
                    </div>

                    {formData.print_options.colors.enabled && (
                      <div className="space-y-2">
                        {formData.print_options.colors.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="الاسم بالعربية"
                              value={option.labelAr}
                              onChange={(e) => updatePrintColorOption(index, 'labelAr', e.target.value)}
                              className="input flex-1 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Name in English"
                              value={option.labelEn}
                              onChange={(e) => updatePrintColorOption(index, 'labelEn', e.target.value)}
                              className="input flex-1 text-sm"
                            />
                            <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-lg">
                              <span className="text-sm text-gray-500">+</span>
                              <input
                                type="number"
                                value={option.priceAdjustment}
                                onChange={(e) => updatePrintColorOption(index, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-transparent text-sm text-center"
                                min="0"
                              />
                              <span className="text-sm text-gray-500">دج</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePrintColorOption(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addPrintColorOption}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة خيار لون
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Attributes */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-4">خصائص المنتج (مقاس، لون، إلخ)</h3>

              {/* Add new attribute */}
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="اسم الخاصية (مثل: المقاس)"
                  value={newAttribute.name_ar}
                  onChange={(e) => setNewAttribute({ ...newAttribute, name_ar: e.target.value, name: e.target.value })}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={addAttribute}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  إضافة خاصية
                </button>
              </div>

              {/* Attributes list */}
              <div className="space-y-4">
                {formData.attributes.map((attr, attrIndex) => (
                  <div key={attrIndex} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{attr.name_ar || attr.name}</h4>
                      <button
                        type="button"
                        onClick={() => removeAttribute(attrIndex)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Attribute values */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attr.values?.map((val: any, valIndex: number) => (
                        <span key={valIndex} className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm">
                          {val.value}
                          {val.priceAdjustment > 0 && <span className="text-primary">+{val.priceAdjustment}دج</span>}
                          <button
                            type="button"
                            onClick={() => removeAttributeValue(attrIndex, valIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add value */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="قيمة جديدة (مثل: كبير)"
                        value={newAttributeValue.value}
                        onChange={(e) => setNewAttributeValue({ ...newAttributeValue, value: e.target.value })}
                        className="input flex-1 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="تعديل السعر"
                        value={newAttributeValue.priceAdjustment || ''}
                        onChange={(e) => setNewAttributeValue({ ...newAttributeValue, priceAdjustment: parseFloat(e.target.value) || 0 })}
                        className="input w-24 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addAttributeValue(attrIndex)}
                        className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOM (Matrix Rules) section */}
            <div className="border rounded-lg p-4 bg-orange-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-orange-900">مصفوفة استهلاك المواد (BOM Matrix)</h3>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">حدد القواعد المتبعة لخصم المواد بناءً على مواصفات الطلب.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBomItems([...bomItems, { variant_size: '', inventory_item_id: '', qty_per_piece: 1, unit: 'pcs', waste_factor: 0, rule_type: 'exact_match', matching_conditions: { size: '', print_sides: '', print_colors: '' } }])}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  إضافة قاعدة
                </button>
              </div>

              {bomLoading ? (
                <p className="text-gray-500 text-sm">جاري التحميل...</p>
              ) : bomItems.length === 0 ? (
                <p className="text-gray-500 text-sm">لم يتم تحديد قواعد استهلاك. سيتم خصم المواد يدويًا أثناء التنفيذ إذا لزم الأمر.</p>
              ) : (
                <div className="space-y-3">
                  {bomItems.map((bom, index) => {
                    const conditions = bom.matching_conditions || { size: '', print_sides: '', print_colors: '' };
                    return (
                      <div key={index} className="flex flex-col gap-3 bg-white p-4 rounded-lg border shadow-sm">

                        {/* Row 1: Item and Qty */}
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-[2] min-w-[200px]">
                            <label className="text-xs font-bold text-gray-700 mb-1 block">مادة المخزون (Inventory Item) *</label>
                            <select
                              required
                              value={bom.inventory_item_id || ''}
                              onChange={(e) => {
                                const newBom = [...bomItems];
                                newBom[index].inventory_item_id = e.target.value;
                                setBomItems(newBom);
                              }}
                              className="input w-full py-1.5 text-sm bg-gray-50 font-medium"
                            >
                              <option value="">-- اختر مادة للخصم --</option>
                              {inventoryItems.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name} ({inv.type})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-32">
                            <label className="text-xs font-bold text-gray-700 mb-1 block">الكمية لكل حبة</label>
                            <input
                              required
                              type="number"
                              value={bom.qty_per_piece || 0}
                              onChange={(e) => {
                                const newBom = [...bomItems];
                                newBom[index].qty_per_piece = parseFloat(e.target.value) || 0;
                                setBomItems(newBom);
                              }}
                              className="input w-full py-1.5 text-sm"
                              min="0"
                              step="0.0001"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newBom = [...bomItems];
                              newBom.splice(index, 1);
                              setBomItems(newBom);
                            }}
                            className="p-2 mb-0.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                            title="حذف القاعدة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Row 2: Conditions */}
                        <div className="bg-orange-50/40 p-3 rounded border border-orange-100 grid md:grid-cols-3 gap-3">
                          <div className="w-full">
                            <label className="text-[10px] uppercase tracking-wider text-orange-800 font-bold mb-1 block">شرط المقاس (Size)</label>
                            <input
                              type="text"
                              value={conditions.size || ''}
                              onChange={(e) => {
                                const newBom = [...bomItems];
                                newBom[index].matching_conditions = { ...conditions, size: e.target.value };
                                // Backwards compatibility sync
                                newBom[index].variant_size = e.target.value;
                                setBomItems(newBom);
                              }}
                              className="input w-full py-1 text-sm bg-white"
                              placeholder="أي مقاس (اتركه فارغاً)"
                            />
                          </div>
                          <div className="w-full">
                            <label className="text-[10px] uppercase tracking-wider text-orange-800 font-bold mb-1 block">شرط الوجه (Sides)</label>
                            <select
                              value={conditions.print_sides || ''}
                              onChange={(e) => {
                                const newBom = [...bomItems];
                                newBom[index].matching_conditions = { ...conditions, print_sides: e.target.value };
                                setBomItems(newBom);
                              }}
                              className="input w-full py-1 text-sm bg-white"
                            >
                              <option value="">أي وجه (Any)</option>
                              <option value="one_side">وجه واحد</option>
                              <option value="two_sides">وجهين</option>
                            </select>
                          </div>
                          <div className="w-full">
                            <label className="text-[10px] uppercase tracking-wider text-orange-800 font-bold mb-1 block">شرط الألوان (Colors)</label>
                            <select
                              value={conditions.print_colors || ''}
                              onChange={(e) => {
                                const newBom = [...bomItems];
                                newBom[index].matching_conditions = { ...conditions, print_colors: e.target.value };
                                setBomItems(newBom);
                              }}
                              className="input w-full py-1 text-sm bg-white"
                            >
                              <option value="">أي ألوان (Any)</option>
                              <option value="one_color">لون واحد</option>
                              <option value="two_colors">لونان</option>
                              <option value="three_colors">ثلاثة ألوان</option>
                              <option value="full_color">ألوان كاملة</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                حفظ المنتج
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
