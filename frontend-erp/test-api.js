const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split(/\r?\n/);
let anonKey = '';

for (const line of lines) {
    if (line.startsWith('VITE_INSFORGE_ANON_KEY=')) {
        anonKey = line.split('=')[1].trim();
        break;
    }
}

if (!anonKey) {
    console.error('No VITE_INSFORGE_ANON_KEY found in .env');
    process.exit(1);
}

const payload = {
    email: 'test_real_error@printflow.dz',
    password: 'password123',
    name: 'Test Error',
    role: 'worker'
};

fetch('https://bp44w5kz.insforge.site/functions/v1/admin-create-user', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify(payload)
})
    .then(async res => {
        console.log('HTTP STATUS:', res.status);
        const body = await res.text();
        console.log('RESPONSE BODY:', body);
    })
    .catch(err => console.error('FETCH ERROR:', err));
