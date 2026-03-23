import { fetchApi } from './apiClient';

// ── WILAYA SHIPPING MATRIX (mirrored from backend) ─────────
const WILAYA_SHIPPING: Record<string, number> = {
  "الجزائر العاصمة": 400, "بليدة": 450, "تيبازة": 450, "بومرداس": 450,
  "البويرة": 500, "المدية": 500, "عين الدفلى": 550, "تيزي وزو": 550,
  "الشلف": 600, "وهران": 600, "سطيف": 650, "بجاية": 650, "جيجل": 650,
  "تيسمسيلت": 650, "قسنطينة": 650, "عنابة": 700, "باتنة": 700,
  "الوادي": 700, "سعيدة": 700, "سكيكدة": 700, "قالمة": 700,
  "مستغانم": 700, "تلمسان": 700, "المسيلة": 750, "سيدي بلعباس": 700,
  "ميلة": 700, "أم البواقي": 700, "تيارت": 700, "الجلفة": 800,
  "بسكرة": 800, "خنشلة": 800, "تبسة": 800, "سوق أهراس": 800,
  "الطارف": 750, "عين تيموشنت": 700, "معسكر": 700, "بريكة": 750,
  "ورقلة": 900, "الأغواط": 850, "غرداية": 950, "البيض": 900,
  "نعامة": 1000, "بشار": 1100, "تندوف": 1200, "تمنراست": 1200, "إليزي": 1200,
};

function getShippingCost(wilaya: string, subtotal: number): number {
  if (subtotal >= 50000) return 0;
  const cost = WILAYA_SHIPPING[(wilaya || '').trim()];
  return cost !== undefined ? cost : 700;
}

export const api = {
  // Orders
  orders: {
    create: async (orderData: any) => {
      const {
        customer, phone, email, wilaya, address, items,
        paymentMethod, notes, source, guestInfo
      } = orderData;

      const cName = customer || guestInfo?.name;
      const cPhone = phone || guestInfo?.phone;
      const cEmail = email || guestInfo?.email || null;
      const cWilaya = wilaya || guestInfo?.wilaya;
      const cAddress = address || guestInfo?.address;

      if (!cName || !cPhone || !items?.length) {
        throw new Error('Missing required: name, phone, or items');
      }

      const subtotal = items.reduce((s: number, i: any) => s + ((i.price || i.unitPrice) * i.quantity), 0);

      const courierName = orderData.courier_name || 'Courier A';

      let totalWeight = 0;
      for (const item of items) {
        const unitWeight = item.unit_weight || 0; // kg
        totalWeight += unitWeight * item.quantity;
      }

      let shipping = getShippingCost(cWilaya, subtotal); // fallback
      let extraWeightKg = 0;
      let extraWeightFee = 0;

      try {
        if (paymentMethod === 'office_pickup' || subtotal > 50000) {
          shipping = 0;
        } else {
          const { data: rules } = await api.shippingRules.list();
          const courier = rules.find((r: any) => r.courier_name === courierName || r.courierName === courierName);

          if (courier && totalWeight > 0) {
            extraWeightKg = Math.max(0, totalWeight - Number(courier.base_weight_kg || courier.baseWeightKg));
            extraWeightFee = extraWeightKg * Number(courier.extra_fee_per_kg || courier.extraFeePerKg);
            shipping = Number(courier.base_fee || courier.baseFee) + extraWeightFee;
          } else if (courier && totalWeight === 0) {
            shipping = Number(courier.base_fee || courier.baseFee);
          }
        }
      } catch (shippingErr) {
        console.warn('[api/orders.create] Courier rule fetch failed, using wilaya fallback:', shippingErr);
      }

      const total = subtotal + shipping;

      // Map items for the backend
      const mappedItems = items.map((item: any) => ({
        productId: item.productId || item.id || null,
        name: item.name || 'منتج',
        nameAr: item.nameAr || item.name,
        sku: item.sku,
        unitPrice: item.price || item.unitPrice,
        quantity: item.quantity,
        unitWeight: item.unit_weight || item.unitWeight || 0,
        customization: item.customization || null,
      }));

      const payload = {
        guestInfo: { name: cName, phone: cPhone, email: cEmail, wilaya: cWilaya, address: cAddress },
        shippingAddress: { name: cName, phone: cPhone, wilaya: cWilaya, address: cAddress },
        subtotal,
        discount: 0,
        shipping,
        tax: 0,
        total,
        totalWeight,
        courierName,
        extraWeightKg,
        extraWeightFee,
        paymentMethod: paymentMethod || 'cash_on_delivery',
        notes: notes || null,
        source: source || 'storefront',
        items: mappedItems
      };

      return fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    track: async (orderNumber: string) => {
      try {
        return fetchApi(`/orders/track/${orderNumber}`);
      } catch (err: any) {
        throw new Error('Order not found');
      }
    },

    // Not usually called by storefront guests without auth, kept for parity if needed
    list: () => {
      // NOTE: Will fail if not authenticated
      return fetchApi('/orders');
    },

    getPendingDesignTasks: async (orderId: string) => {
      // NOTE: Will fail if not authenticated
      return fetchApi(`/tasks?orderId=${orderId}&type=design&approval_status=pending`);
    },

    respondToDesignApproval: async (taskId: string, response: 'approved' | 'rejected', notes?: string) => {
      return fetchApi(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          approvalStatus: response,
          status: response === 'approved' ? 'completed' : 'in_progress',
          rejectionReason: response === 'rejected' ? notes : null
        })
      });
    },
  },

  // Products
  products: {
    list: async (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await fetchApi(`/products${qs}`);
      if (res.success && res.data) {
        res.data = res.data.map((p: any) => ({
          ...p,
          base_price: p.basePrice,
          unit_weight: p.unitWeight,
          is_active: p.isActive,
          is_published: p.isPublished,
          name_ar: p.nameAr,
          description_ar: p.descriptionAr,
          min_quantity: p.minQuantity,
          customization_options: p.customizationOptions,
          production_options: p.productionOptions,
          price_tiers: p.priceTiers,
        }));
      }
      return res;
    },
    getById: async (id: string) => {
      const res = await fetchApi(`/products/${id}`);
      if (res.success && res.data) {
        const p = res.data;
        res.data = {
          ...p,
          base_price: p.basePrice,
          unit_weight: p.unitWeight,
          is_active: p.isActive,
          is_published: p.isPublished,
          name_ar: p.nameAr,
          description_ar: p.descriptionAr,
          min_quantity: p.minQuantity,
          customization_options: p.customizationOptions,
          production_options: p.productionOptions,
          price_tiers: p.priceTiers,
        };
      }
      return res;
    },
  },

  // Shipping Rules
  shippingRules: {
    list: async () => {
      return fetchApi('/shipping-rules?active=true');
    }
  },

  // Site Config
  siteConfig: {
    get: async () => {
      return fetchApi('/site-config');
    }
  }
};
