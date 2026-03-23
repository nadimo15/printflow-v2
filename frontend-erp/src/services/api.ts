import { insforge } from '../config/insforge';
import { apiClient } from './apiClient';

// Cast insforge to any to avoid TS errors due to missing type definitions
const client = insforge as any;

// Helper to handle InsForge responses and format them consistently
const handleResponse = async (promise: Promise<any>) => {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return { success: true, data };
};

export const api = {
  // Auth
  auth: {
    login: async (credentials: any) => {
      try {
        // 1. Authenticate with InsForge GoTrue
        const { data, error } = await client.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password
        });

        if (error) throw error;
        if (!data.user || !data.session) throw new Error("Invalid login response");

        // 2. Fetch the user's extended profile (name, role) from the profiles table
        const { data: profile } = await client.database
          .from('profiles')
          .select('name, role')
          .eq('id', data.user.id)
          .single();

        // 3. Match the legacy ERP response format expected in authStore
        return {
          success: true,
          data: {
            token: data.session.access_token,
            user: {
              id: data.user.id,
              email: data.user.email,
              name: profile?.name || 'Administrator',
              role: profile?.role || 'admin'
            }
          }
        };
      } catch (err: any) {
        throw new Error(err.message || 'Login failed via InsForge');
      }
    },
    register: async (data: any) => {
      try {
        const { data: authData, error } = await client.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { name: data.name, role: data.role || 'user' } }
        });
        if (error) throw error;
        return { success: true, data: authData?.user };
      } catch (err: any) {
        throw new Error(err.message || 'Registration failed');
      }
    },
    logout: async () => {
      try {
        await client.auth.signOut();
      } catch (e) { /* Ignore */ }
      return { success: true };
    },
  },

  reworkLogs: {
    getByOrder: (orderId: string) => handleResponse(
      client.database.from('rework_logs')
        .select(`*, profiles:worker_id (name)`)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
    ),
  },

  // Roles & Permissions
  roles: {
    list: () => handleResponse(client.database.from('role_permissions').select('*')),
    update: (role: string, permissions: any) =>
      handleResponse(client.database.from('role_permissions').update({ permissions }).eq('role', role).select().single())
  },

  // Employees
  employees: {
    list: () => handleResponse(client.database.from('profiles').select('*').order('created_at', { ascending: false })),
    getById: (id: string) => handleResponse(client.database.from('profiles').select('*').eq('id', id).single()),
    create: async (data: any) => {
      const { data: result, error } = await client.database.rpc('admin_create_user_rpc', {
        user_email: data.email,
        user_password: data.password,
        user_name: data.name,
        user_role: data.role,
        user_phone: data.phone || null
      });
      if (error) throw new Error(error.message);
      return { success: true, data: result };
    },
    // Update basic profile info
    update: async (id: string, data: any) => {
      const { error } = await client.database.rpc('admin_update_user_rpc', {
        target_user_id: id,
        new_name: data.name || null,
        new_role: data.role || null,
        new_phone: data.phone === '' ? null : data.phone,
        new_is_active: data.is_active !== undefined ? data.is_active : null
      });
      if (error) {
        console.error("API Update Error Detail:", JSON.stringify(error, null, 2));
        throw new Error("RPC ERR: " + JSON.stringify(error));
      }
      return { success: true };
    },

    // Update Auth (Email/Pass) via secure RPC
    updateAuth: async (id: string, data: any) => {
      const { error } = await client.database.rpc('admin_update_user_rpc', {
        target_user_id: id,
        new_email: data.email || null,
        new_password: data.password || null
      });
      if (error) throw new Error(error.message);
      return { success: true };
    },

    delete: async (id: string) => {
      const { error } = await client.database.rpc('admin_update_user_rpc', {
        target_user_id: id,
        new_is_active: false
      });
      if (error) {
        console.error("API Delete Error Detail:", JSON.stringify(error, null, 2));
        throw new Error("RPC ERR: " + JSON.stringify(error));
      }
      return { success: true };
    },

    // Reactivate employee
    reactivate: async (id: string) => {
      const { error } = await client.database.rpc('admin_update_user_rpc', {
        target_user_id: id,
        new_is_active: true
      });
      if (error) {
        console.error("API Reactivate Error Detail:", JSON.stringify(error, null, 2));
        throw new Error("RPC ERR: " + JSON.stringify(error));
      }
      return { success: true };
    },
  },

  // Orders
  orders: {
    list: async (params?: { status?: string }) => {
      let query = client.database.from('orders')
        .select('*, customers(*), order_items(*), tasks(*, profiles!tasks_assigned_to_id_fkey(name))', { count: 'exact' });

      if (params?.status) query = query.eq('status', params.status);

      return handleResponse(query.order('created_at', { ascending: false }));
    },
    listProductionEligible: () => handleResponse(
      client.database.from('orders')
        .select('*, order_items(*)')
        .in('status', ['confirmed', 'in_production'])
        .order('created_at', { ascending: true })
    ),
    getById: (id: string) =>
      handleResponse(client.database.from('orders')
        .select('*, customers(*), order_items(*), tasks(*, profiles!tasks_assigned_to_id_fkey(name))')
        .eq('id', id)
        .single()),

    // Create Order Transactionally via Edge Function
    create: async (data: any) => {
      const result = await client.functions.invoke('create-order', { body: data });
      if (result.error) throw new Error(result.error instanceof Error ? result.error.message : 'Function invocation failed');

      const body = result.data;
      if (body.error) throw new Error(body.error);
      return body;
    },

    updateStatus: (id: string, status: string) => {
      return handleResponse(client.database.from('orders').update({ status }).eq('id', id).select().single());
    },

    // Soft delete (cancel) order
    softDelete: (id: string) => {
      return handleResponse(client.database.from('orders').update({ status: 'cancelled' }).eq('id', id).select().single());
    },

    // Update order fields (notes, shipping address, etc.) — persists to DB
    updateFields: (id: string, fields: Record<string, any>) => {
      return handleResponse(client.database.from('orders').update(fields).eq('id', id).select().single());
    },



    // Advanced BOM Calculation for a specific order
    calculateBOM: async (orderId: string) => {
      try {
        // 1. Fetch Order Items
        const { data: items, error: itemsError } = await client.database
          .from('order_items')
          .select('*, products(id, name)')
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;
        if (!items || items.length === 0) return { success: true, data: { isSufficient: true, components: [] } };

        const requiredComponents = new Map<string, any>();
        let overallSufficient = true;

        // 2. Process each item against BOM matrix
        for (const item of items) {
          const qty = item.quantity || 0;
          if (qty <= 0) continue;

          const productId = item.product_id;
          const customization = item.customization || {};

          const selectedSize = customization.selected_size
            || customization.selectedSize
            || null;
          const printSides = customization.printOptions?.sides?.value || customization.printSides || null;
          const printColors = customization.printOptions?.colors?.value || customization.printColors || null;

          if (productId) {
            // Fetch all BOM rules for this product
            const { data: bomData } = await client.database
              .from('product_bom')
              .select('*, inventory_items(*)')
              .eq('product_id', productId);

            if (bomData && bomData.length > 0) {
              // Apply matrix logic (Same as completeWithInventory)
              const matchedRows = bomData.filter((bomRow: any) => {
                const conds = bomRow.matching_conditions || {};

                // Check Size
                if (conds.size && conds.size !== selectedSize && bomRow.variant_size !== selectedSize && bomRow.variant_size !== 'all' && bomRow.variant_size !== '') {
                  return false;
                }
                // Check Sides
                if (conds.print_sides && conds.print_sides !== printSides) {
                  return false;
                }
                // Check Colors
                if (conds.print_colors && conds.print_colors !== printColors) {
                  return false;
                }
                return true;
              });

              for (const row of matchedRows) {
                const invItem = row.inventory_items;
                if (!invItem) continue;

                const wasteMultiplier = 1 + (Number(row.waste_factor) || 0);
                const requiredQty = Number(row.qty_per_piece) * qty * wasteMultiplier;

                if (requiredComponents.has(invItem.id)) {
                  const existing = requiredComponents.get(invItem.id);
                  existing.required += requiredQty;
                } else {
                  requiredComponents.set(invItem.id, {
                    id: invItem.id,
                    name: invItem.name,
                    required: requiredQty,
                    available: Number(invItem.stock_quantity) || 0,
                    unit: invItem.unit_of_measure || row.unit || 'units'
                  });
                }
              }
            }
          }
        }

        // 3. Format result
        const componentsList = Array.from(requiredComponents.values()).map(comp => {
          // Add a tiny buffer for JS float rounding just in case, but usually exact matches are fine
          const isEnough = comp.available >= comp.required;
          if (!isEnough) overallSufficient = false;

          return {
            ...comp,
            // round required to 2 decimals for display
            required: Math.ceil(comp.required * 100) / 100
          };
        });

        return {
          success: true,
          data: {
            isSufficient: overallSufficient,
            components: componentsList
          }
        };

      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  },

  // Order Items
  orderItems: {
    // Replace all items for an order
    replaceAll: async (orderId: string, items: any[]) => {
      // Delete existing items then re-insert
      await handleResponse(client.database.from('order_items').delete().eq('order_id', orderId));
      if (items.length === 0) return { success: true, data: [] };
      const payload = items.map((item: any) => ({
        order_id: orderId,
        product_id: item.productId || item.product_id || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
        customization: item.customization || null,
      }));
      return handleResponse(client.database.from('order_items').insert(payload).select());
    },
  },

  // Tasks
  tasks: {
    list: () => handleResponse(client.database.from('tasks').select('*, profiles!tasks_assigned_to_id_fkey(*), orders(id, order_number, status), order_items(*)')),
    create: (data: any) => {
      // Map camelCase to snake_case for DB columns
      const dbData: any = {
        title: data.title,
        type: data.type,
        status: data.status || 'pending',
        priority: data.priority || 'normal',
        order_id: data.orderId || data.order_id,
        order_item_id: data.orderItemId || data.order_item_id,
      };
      return handleResponse(client.database.from('tasks').insert(dbData).select().single());
    },
    update: (id: string, data: any) => handleResponse(client.database.from('tasks').update(data).eq('id', id).select().single()),
    updateStatus: (id: string, status: string, additionalData?: any) => {
      const updates: any = { status, ...additionalData };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      if (status === 'in_progress' && !updates.started_at) updates.started_at = new Date().toISOString();

      return handleResponse(client.database.from('tasks').update(updates).eq('id', id).select().single());
    },
    assign: (id: string, assignedToId: string) =>
      handleResponse(client.database.from('tasks').update({ assigned_to_id: assignedToId }).eq('id', id).select().single()),

    getKanban: async () => {
      const { data, error } = await client.database.from('tasks')
        .select('*, profiles!tasks_assigned_to_id_fkey(*), orders(id, order_number), order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const tasks = data || [];
      return {
        success: true,
        data: {
          pending: tasks.filter((t: any) => t.status === 'pending'),
          in_progress: tasks.filter((t: any) => t.status === 'in_progress'),
          paused: tasks.filter((t: any) => t.status === 'paused'),
          completed: tasks.filter((t: any) => t.status === 'completed'),
        }
      };
    },

    completeWithInventory: async (data: { taskId: string, orderId: string, workerId: string, consumption: any }) => {
      const { taskId, orderId, workerId, consumption } = data;
      const { blanksWasted = 0, reworkReason = 'Unspecified' } = consumption;
      let totalActionCost = 0;

      try {
        // ── BOM-AWARE DEDUCTION (Governor: Inventory Consistency law) ──────────
        // 1. Get order item: product_id, selected_size, quantity
        const { data: orderItems } = await client.database
          .from('order_items')
          .select('product_id, quantity, customization')
          .eq('order_id', orderId)
          .limit(1);

        const orderItem = orderItems?.[0];
        const productId = orderItem?.product_id;
        const selectedSize = orderItem?.customization?.selected_size
          || orderItem?.customization?.selectedSize
          || null;
        const orderQty = Number(orderItem?.quantity) || 0;
        const customization = orderItem?.customization || {};

        const printSides = customization.printOptions?.sides?.value || customization.printSides || null;
        const printColors = customization.printOptions?.colors?.value || customization.printColors || null;

        // 2. Look up ALL product_bom for this product
        let matchedBomRows: any[] = [];
        if (productId) {
          const { data: bom } = await client.database
            .from('product_bom')
            .select('*, inventory_items(*)')
            .eq('product_id', productId);

          const allBomRows = bom || [];

          // Matrix Filter Logic
          matchedBomRows = allBomRows.filter((bomRow: any) => {
            const conds = bomRow.matching_conditions || {};

            // Check Size
            if (conds.size && conds.size !== selectedSize && bomRow.variant_size !== selectedSize && bomRow.variant_size !== 'all' && bomRow.variant_size !== '') {
              return false;
            }
            // Check Sides
            if (conds.print_sides && conds.print_sides !== printSides) {
              return false;
            }
            // Check Colors
            if (conds.print_colors && conds.print_colors !== printColors) {
              return false;
            }
            return true;
          });
        }

        if (matchedBomRows.length > 0 && orderQty > 0) {
          // ── BOM PATH: exact deductions from product definition ───────────────
          for (const bomRow of matchedBomRows) {
            const invItem = bomRow.inventory_items;
            if (!invItem) continue;

            const wasteMultiplier = 1 + (Number(bomRow.waste_factor) || 0);
            const baseDeduction = Number(bomRow.qty_per_piece) * orderQty * wasteMultiplier;
            // Extra physical waste on blank bags only
            const extraWaste = bomRow.unit === 'pcs' ? blanksWasted : 0;
            const totalDeduction = baseDeduction + extraWaste;

            const newStock = Math.max(0, Number(invItem.stock_quantity) - totalDeduction);
            await client.database.from('inventory_items').update({ stock_quantity: newStock }).eq('id', invItem.id);
            await client.database.from('inventory_transactions').insert({
              item_id: invItem.id, transaction_type: 'out', quantity: totalDeduction,
              reference_id: orderId,
              notes: `BOM: Task ${taskId} | Qty ${orderQty} | Waste +${extraWaste}`
            });
            if (extraWaste > 0) {
              await client.database.from('rework_logs').insert({
                task_id: taskId, order_id: orderId, worker_id: workerId || null,
                reason: reworkReason, quantity_ruined: extraWaste,
                estimated_cost_loss: extraWaste * Number(invItem.cost_per_unit)
              });
            }
            totalActionCost += totalDeduction * Number(invItem.cost_per_unit);
          }

          // Add labor + handling from production_options (Optional fallback logic)
          if (productId && selectedSize) {
            const { data: prodRows } = await client.database
              .from('products').select('production_options').eq('id', productId);
            const variants = prodRows?.[0]?.production_options?.variants || [];
            const variantOpts = variants.find((v: any) => v.size === selectedSize);
            if (variantOpts && orderQty > 0) {
              totalActionCost += (Number(variantOpts.labor_cost_per_piece) || 0) * orderQty;
              totalActionCost += (Number(variantOpts.handling_cost_per_piece) || 0) * orderQty;
            }
          }

        } else {
          // ── STRICT MODE: Reject deduction if no BOM is explicitly mapped
          if (blanksWasted > 0 || (consumption && (consumption.blanksUsed || consumption.inkUsedGrams))) {
            throw new Error(`لا توجد شجرة مواد (BOM) صريحة لمقاس ${selectedSize || 'الافتراضي'}. لا يمكن خصم المخزون عشوائياً. الرجاء ربط المواد من صفحة المنتجات.`);
          }
        }

        // 3. Mark task as completed
        const { error: taskError } = await client.database
          .from('tasks').update({
            status: 'completed',
            actual_cost: totalActionCost,
            completed_at: new Date().toISOString()
          }).eq('id', taskId);
        if (taskError) throw new Error(`Task update failed: ${taskError.message}`);

        // 4. Update order material_cost + gross_margin
        const { data: orderRows } = await client.database
          .from('orders').select('total,material_cost,gross_margin,shipping').eq('id', orderId);
        if (orderRows && orderRows.length > 0) {
          const order = orderRows[0];
          const newMaterialCost = (Number(order.material_cost) || 0) + totalActionCost;
          const newGrossMargin = Number(order.total) - newMaterialCost - (Number(order.shipping) || 0);
          const { error: orderError } = await client.database.from('orders').update({
            material_cost: newMaterialCost, gross_margin: newGrossMargin
          }).eq('id', orderId);
          if (orderError) throw new Error(`Order financials update failed: ${orderError.message}`);
        }

        return { success: true, newMaterialCostAdded: totalActionCost };
      } catch (e: any) {
        console.error('[api.tasks.completeWithInventory]', e);
        throw new Error(e.message || 'Failed to complete task with inventory');
      }
    },
    assignTo: async (taskId: string, userId: string | null, assignedById?: string) => {
      const payload: any = {
        assigned_to_id: userId,
      };
      if (assignedById) payload.assigned_by_id = assignedById;

      return handleResponse(client.database
        .from('tasks')
        .update(payload)
        .eq('id', taskId)
        .select()
        .single()
      );
    },
  },

  // Inventory
  inventory: {
    list: (category?: string) => {
      let query = client.database.from('inventory_items').select('*');
      if (category) query = query.eq('type', category);
      return handleResponse(query.order('name', { ascending: true }));
    },
    create: (data: any) => handleResponse(client.database.from('inventory_items').insert(data).select().single()),
    updateStock: (id: string, newStock: number) =>
      handleResponse(client.database.from('inventory_items').update({ stock_quantity: newStock }).eq('id', id).select().single()),
    getMovements: () => handleResponse(
      client.database.from('inventory_movements')
        .select('*, inventory_items(name)')
        .order('created_at', { ascending: false })
    ),
    adjustStock: async (id: string, newQty: number, reason: string) => {
      try {
        const { data: item, error: fetchErr } = await client.database.from('inventory_items').select('stock_quantity').eq('id', id).single();
        if (fetchErr) throw fetchErr;

        const delta = newQty - (item.stock_quantity || 0);

        const { data: updatedItem, error: updateErr } = await client.database.from('inventory_items')
          .update({ stock_quantity: newQty }).eq('id', id).select().single();
        if (updateErr) throw updateErr;

        await client.database.from('inventory_movements').insert({
          item_id: id,
          transaction_type: 'adj',
          quantity: Math.abs(delta),
          notes: `Adjustment: ${delta > 0 ? '+' : ''}${delta}. Reason: ${reason}`
        });

        return { success: true, data: updatedItem };
      } catch (e: any) {
        return { success: false, error: e.message || 'Error adjusting stock' };
      }
    },
  },

  // Products
  products: {
    list: async () => {
      const res = await apiClient.get('/products/all');
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
      const res = await apiClient.get(`/products/${id}`);
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
    create: async (data: any) => {
      const payload = {
        name: data.name,
        nameAr: data.name_ar,
        description: data.description,
        descriptionAr: data.description_ar,
        category: data.category,
        basePrice: data.base_price,
        unitWeight: data.unit_weight || data.weight_per_unit || 0,
        isActive: data.is_active,
        isPublished: data.is_published,
        images: data.images || (data.image ? [data.image] : []),
        productionOptions: data.production_options,
        customizationOptions: data.customization_options,
      };
      const res = await apiClient.post('/products', payload);
      // Map back response
      if (res.success && res.data) {
        const p = res.data;
        res.data = { ...p, id: p.id, base_price: p.basePrice };
      }
      return res;
    },
    update: async (id: string, data: any) => {
      const payload: any = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.name_ar !== undefined) payload.nameAr = data.name_ar;
      if (data.description !== undefined) payload.description = data.description;
      if (data.description_ar !== undefined) payload.descriptionAr = data.description_ar;
      if (data.category !== undefined) payload.category = data.category;
      if (data.base_price !== undefined) payload.basePrice = data.base_price;
      if (data.unit_weight !== undefined || data.weight_per_unit !== undefined) payload.unitWeight = data.unit_weight || data.weight_per_unit;
      if (data.is_active !== undefined) payload.isActive = data.is_active;
      if (data.is_published !== undefined) payload.isPublished = data.is_published;
      if (data.images !== undefined) payload.images = data.images;
      if (data.image !== undefined) payload.images = data.images || [data.image];
      if (data.production_options !== undefined) payload.productionOptions = data.production_options;
      if (data.customization_options !== undefined) payload.customizationOptions = data.customization_options;

      const res = await apiClient.put(`/products/${id}`, payload);
      return res;
    },
    delete: (id: string) => apiClient.delete(`/products/${id}`),
  },

  // Customers
  customers: {
    list: () => handleResponse(client.database.from('customers').select('*')),
    getById: (id: string) => handleResponse(client.database.from('customers').select('*, orders(*)').eq('id', id).single()),
    recordPayment: async (data: { customerId: string, amount: number, recordedBy: string }) => {
      const { customerId, amount } = data;
      if (!customerId || !amount || amount <= 0) throw new Error('Missing required payment fields');
      try {
        // Fetch current balance
        const { data: customers, error } = await client.database
          .from('customers').select('outstanding_balance').eq('id', customerId);
        if (error || !customers || customers.length === 0) throw new Error('Customer not found');
        const currentBalance = Number(customers[0].outstanding_balance) || 0;
        const newBalance = Math.max(0, currentBalance - amount);
        // Update balance
        await client.database.from('customers').update({ outstanding_balance: newBalance }).eq('id', customerId);
        return { success: true, newBalance };
      } catch (e: any) {
        throw new Error(e.message || 'Payment recording failed');
      }
    },
  },

  // Expenses
  expenses: {
    list: () => handleResponse(client.database.from('expenses').select('*').order('date', { ascending: false })),
    create: (data: any) => handleResponse(client.database.from('expenses').insert(data).select().single()),
  },

  // Workstations (Phase D)
  workstations: {
    list: () => handleResponse(client.database.from('workstations').select('*').order('name', { ascending: true })),
    create: (data: any) => handleResponse(client.database.from('workstations').insert(data).select().single()),
    updateMaintenance: (id: string, date: string) => handleResponse(client.database.from('workstations').update({ last_maintenance_date: date }).eq('id', id).select().single()),
  },

  // Quality Control (Phase D)
  quality: {
    listRework: () => handleResponse(client.database.from('rework_logs').select('*, orders(order_number), tasks(title), profiles:worker_id(name)').order('created_at', { ascending: false })),
  },

  dashboard: {
    stats: async () => {
      // By-passing broken Edge Function since dashboard metrics are now computed frontend-side
      return { success: true, data: [] };
    },
  },

  // Priority 3: Shipping Rules
  shippingRules: {
    list: () => handleResponse(client.database.from('shipping_rules').select('*').order('wilaya_name', { ascending: true })),
    create: (data: any) => handleResponse(client.database.from('shipping_rules').insert(data).select().single()),
    update: (id: string, data: any) => handleResponse(client.database.from('shipping_rules').update(data).eq('id', id).select().single()),
    delete: (id: string) => handleResponse(client.database.from('shipping_rules').delete().eq('id', id)),
  },

  // Priority 3: Product BOM
  productBom: {
    listByProduct: async (productId: string) => {
      const res = await apiClient.get(`/products/${productId}/bom`);
      if (res.success && res.data) {
        res.data = res.data.map((b: any) => ({
          ...b,
          product_id: b.productId,
          inventory_item_id: b.inventoryItemId,
          variant_size: b.variantSize,
          qty_per_piece: b.qtyPerPiece,
          waste_factor: b.wasteFactor,
          matching_conditions: b.matchingConditions,
          inventory_items: b.inventoryItem ? {
            ...b.inventoryItem,
            stock_quantity: b.inventoryItem.stockQuantity,
            unit_of_measure: b.inventoryItem.unitOfMeasure,
            cost_per_unit: b.inventoryItem.costPerUnit,
          } : undefined
        }));
      }
      return res;
    },
    replaceAll: (productId: string, bomItems: any[]) => {
      const items = bomItems.map((b: any) => ({
        inventoryItemId: b.inventory_item_id,
        variantSize: b.variant_size,
        qtyPerPiece: b.qty_per_piece,
        unit: b.unit,
        wasteFactor: b.waste_factor,
        matchingConditions: b.matching_conditions,
      }));
      return apiClient.put(`/products/${productId}/bom`, { items });
    }
  },

  // Priority 3: Suppliers
  suppliers: {
    list: () => handleResponse(client.database.from('suppliers').select('*').order('name', { ascending: true })),
    create: (data: any) => handleResponse(client.database.from('suppliers').insert(data).select().single()),
    update: (id: string, data: any) => handleResponse(client.database.from('suppliers').update(data).eq('id', id).select().single()),
    delete: (id: string) => handleResponse(client.database.from('suppliers').delete().eq('id', id)),
  },

  // Priority 3: Purchase Orders
  purchaseOrders: {
    list: () => handleResponse(client.database.from('purchase_orders').select('*, suppliers(*)').order('created_at', { ascending: false })),
    create: (data: any) => handleResponse(client.database.from('purchase_orders').insert(data).select().single()),
    update: (id: string, data: any) => handleResponse(client.database.from('purchase_orders').update(data).eq('id', id).select().single()),
    updateStatus: (id: string, status: string) => handleResponse(client.database.from('purchase_orders').update({ status }).eq('id', id).select().single()),

    getItems: (poId: string) => handleResponse(client.database.from('purchase_order_items').select('*, inventory_items(*)').eq('purchase_order_id', poId)),

    saveItems: async (poId: string, items: any[]) => {
      // We will first delete existing, then insert new.
      await client.database.from('purchase_order_items').delete().eq('purchase_order_id', poId);
      if (!items || items.length === 0) return { success: true };

      const preparedItems = items.map(item => ({
        purchase_order_id: poId,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes || null,
      }));
      return handleResponse(client.database.from('purchase_order_items').insert(preparedItems));
    },

    receive: async (poId: string, userId: string) => {
      try {
        // 1. Mark PO as received
        const poRes = await client.database.from('purchase_orders').update({ status: 'completed' }).eq('id', poId).select().single();
        if (poRes.error) throw new Error(poRes.error.message);

        // 2. Fetch all PO items
        const { data: items, error: itemsErr } = await client.database.from('purchase_order_items').select('*').eq('purchase_order_id', poId);
        if (itemsErr) throw new Error(itemsErr.message);

        // 3. Increment stock and create movements
        for (const item of items || []) {
          // Check if already received
          if (item.received_quantity >= item.quantity) continue;

          const { data: invItem } = await client.database.from('inventory_items').select('stock_quantity').eq('id', item.inventory_item_id).single();
          if (!invItem) continue;

          const newStock = Number(invItem.stock_quantity || 0) + Number(item.quantity);

          await client.database.from('inventory_items').update({
            stock_quantity: newStock,
            cost_per_unit: item.unit_price // update cost to latest PO cost
          }).eq('id', item.inventory_item_id);

          await client.database.from('inventory_movements').insert({
            inventory_item_id: item.inventory_item_id,
            movement_type: 'receipt',
            quantity: item.quantity,
            reference_id: poId,
            notes: `PO Receipt: ${poRes.data?.po_number || poId}`,
            created_by: userId || null
          });

          // Update item as received
          await client.database.from('purchase_order_items').update({ received_quantity: item.quantity }).eq('id', item.id);
        }
        return { success: true };
      } catch (err: any) {
        throw new Error(err.message || 'Failed to receive PO');
      }
    }
  },

  // Priority 4: Screen Frames
  screenFrames: {
    list: () => handleResponse(client.database.from('screen_frames').select('*').order('name', { ascending: true })),
    create: (data: any) => handleResponse(client.database.from('screen_frames').insert(data).select().single()),
    update: (id: string, data: any) => handleResponse(client.database.from('screen_frames').update(data).eq('id', id).select().single()),
    delete: (id: string) => handleResponse(client.database.from('screen_frames').delete().eq('id', id)),
  },

  // Public Site Config
  siteConfig: {
    get: () => handleResponse(client.database.from('site_config').select('*').eq('id', 'default').single()),
    updateDraft: (draft_data: any) => handleResponse(
      client.database.from('site_config')
        .update({ draft_data, updated_at: new Date().toISOString() })
        .eq('id', 'default')
        .select()
        .single()
    ),
    publish: async () => {
      const { data, error } = await client.database.from('site_config').select('draft_data').eq('id', 'default').single();
      if (error) throw new Error(error.message);

      return handleResponse(
        client.database.from('site_config')
          .update({ published_data: data.draft_data, updated_at: new Date().toISOString() })
          .eq('id', 'default')
          .select()
          .single()
      );
    }
  },
};
