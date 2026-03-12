const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('https://bp44w5kz.insforge.site/functions/v1/admin-create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ik_afdae9ce09aced9a8773a151bbfbab30`
            },
            body: JSON.stringify({
                email: 'test_hardcode@printflow.dz',
                password: 'password123',
                name: 'Test Hardcode',
                role: 'worker'
            })
        });

        console.log('HTTP Status:', res.status);
        console.log('Response:', await res.text());
    } catch (e) {
        console.error(e);
    }
}

test();
