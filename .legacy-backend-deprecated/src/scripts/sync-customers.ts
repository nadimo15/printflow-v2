import { insforge } from '../config/insforge';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncCustomers() {
    console.log('🔄 Starting customer sync migration (in DEBUG mode)...');

    const { data: orders, error } = await insforge.database
        .from('orders')
        .select('*');

    if (error) {
        console.error('❌ Failed to fetch orders:', error);
        process.exit(1);
    }

    console.log(`📦 Found ${orders.length} orders.`);

    let createdCount = 0;
    let linkedCount = 0;

    for (const order of orders) {
        console.log(`--- Processing Order: ${order.order_number} (${order.id}) ---`);
        console.log(`   Guest Info:`, JSON.stringify(order.guest_info));
        console.log(`   Shipping Address:`, JSON.stringify(order.shipping_address));
        console.log(`   Current Customer ID:`, order.customer_id);

        const info = order.guest_info || order.shipping_address;

        if (!info || !info.phone) {
            console.log(`⚠️ Skipping: No valid phone found in guest_info or shipping_address.`);
            continue;
        }

        console.log(`   Found Info: Name=${info.name}, Phone=${info.phone}`);

        // Check existing
        const { data: existing, error: findError } = await insforge.database
            .from('customers')
            .select('id')
            .eq('phone', info.phone)
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "Row not found" (JSON return for single)
            console.error('   ❌ Error checking existing customer:', findError);
        }

        let customerId = existing?.id;

        if (customerId) {
            console.log(`   ✅ Customer already exists: ${customerId}`);
        } else {
            console.log(`   👤 Customer not found. Creating...`);
            const { data: newCustomer, error: createError } = await insforge.database
                .from('customers')
                .insert([{
                    name: info.name,
                    phone: info.phone,
                    email: info.email || null,
                    wilaya: info.wilaya || '',
                    address: info.address || '',
                    is_guest: true
                }])
                .select('id')
                .single();

            if (createError) {
                console.error(`   ❌ Failed to create customer:`, createError);
                continue;
            }
            customerId = newCustomer.id;
            console.log(`   ✅ Created New Customer: ${customerId}`);
            createdCount++;
        }

        if (customerId && order.customer_id !== customerId) {
            console.log(`   🔗 Linking order to customer...`);
            const { error: updateError } = await insforge.database
                .from('orders')
                .update({ customer_id: customerId })
                .eq('id', order.id);

            if (updateError) console.error('   ❌ Failed to link:', updateError);
            else {
                console.log('   ✅ Linked.');
                linkedCount++;
            }
        } else {
            console.log('   🔗 Order already linked.');
        }
    }

    console.log('✅ Sync complete.');
    console.log(`- Created Customers: ${createdCount}`);
    console.log(`- Updated Orders: ${linkedCount}`);
}

syncCustomers().catch(console.error);
