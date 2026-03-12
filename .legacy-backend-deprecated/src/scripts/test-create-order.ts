// @ts-nocheck
import fetch from 'node-fetch';

async function testCreateOrder() {
    console.log('Testing Stockfront Order Creation...');

    const payload = {
        guestInfo: {
            name: 'Test User Agent',
            phone: '0555001122',
            email: 'test-agent@example.com',
            wilaya: '16',
            address: 'Test Address 123',
        },
        items: [
            {
                name: 'Test Product',
                nameAr: 'Test Product AR',
                productId: 'uuid-will-be-null', // Simulating manual item or unlinked
                unitPrice: 1500,
                quantity: 2,
                customization: { color: 'red' },
            }
        ],
        shippingAddress: 'Test Address 123, Algiers',
        paymentMethod: 'cash_on_delivery',
        notes: 'Test order from script',
    };

    try {
        const response = await fetch('http://localhost:5000/api/orders/storefront/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('✅ Order created successfully in InsForge!');
        } else {
            console.log('❌ Order creation failed.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testCreateOrder();
