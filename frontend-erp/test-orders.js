const API_URL = "https://bp44w5kz.eu-central.insforge.app/rest/v1/";
const ANON_KEY = "ik_afdae9ce09aced9a8773a151bbfbab30";

async function test() {
    // Login first to get the token
    const authRes = await fetch("https://bp44w5kz.eu-central.insforge.app/auth/v1/token?grant_type=password", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
        },
        body: JSON.stringify({ email: 'admin@printflow.dz', password: 'password123' })
    });

    const authData = await authRes.json();
    if (authData.error) {
        console.log("AUTH ERROR:", authData);
        return;
    }

    const token = authData.access_token;

    const req = await fetch(API_URL + "orders?select=*,customers(*),order_items(*),tasks(*,profiles(name))&order=created_at.desc", {
        method: 'GET',
        headers: {
            'apikey': ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Prefer': 'count=exact'
        }
    });

    const text = await req.text();
    console.log("STATUS:", req.status);
    console.log("RESPONSE:", text);
}

test();
