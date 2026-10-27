/**
 * Creates 19 customer accounts (password: kreezby123) through the running Kreezby server, so each one is
 * saved in MongoDB (customer_accounts) AND added to the shared account list the portals read.
 *
 *   node scripts/create-customer-accounts.js                         (server running on this computer, port 3000)
 *   node scripts/create-customer-accounts.js https://your-site.vercel.app
 *
 * Safe to run twice: an account that already exists is skipped.
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
const PASSWORD = 'kreezby123';

const PEOPLE = [
  ['Imelda', 'Dela Cruz'], ['Rosalinda', 'Manalo'], ['Jonathan', 'Villareal'], ['Maricel', 'Soriano'],
  ['Ramon', 'Dimaculangan'], ['Carmela', 'Aquino'], ['Eduardo', 'Macaraig'], ['Liza', 'Panganiban'],
  ['Roberto', 'Magsino'], ['Teresita', 'Landicho'], ['Gerald', 'Mercado'], ['Joanna', 'Castillo'],
  ['Alfredo', 'Ilagan'], ['Beatriz', 'Marasigan'], ['Nathaniel', 'Perez'], ['Hazel', 'Atienza'],
  ['Francisco', 'Hernandez'], ['Mylene', 'Salazar'], ['Dennis', 'Bautista']
];
const STREETS = ['P. Burgos St.', 'Rizal Ave.', 'A. Bonifacio St.', 'Kumintang Ibaba', 'Calicanto Rd.', 'Pallocan West', 'Gulod Itaas', 'Sta. Rita Karsada', 'Bolbok Rd.', 'Alangilan Rd.'];

function slug(text) { return text.toLowerCase().replace(/[^a-z]+/g, ''); }

async function main() {
  let created = 0;
  let skipped = 0;
  for (let i = 0; i < PEOPLE.length; i++) {
    const first = PEOPLE[i][0];
    const last = PEOPLE[i][1];
    const username = slug(first) + '_' + slug(last);
    const phone = '0917' + String(3100000 + i * 37919).slice(0, 7);
    const account = {
      id: 'cust-' + username.replace(/_/g, '-'),
      name: first + ' ' + last,
      username: username,
      email: username.replace('_', '.') + '@example.com',
      phone: phone,
      address: (10 + i * 3) + ' ' + STREETS[i % STREETS.length] + ', Batangas City',
      area: 'Batangas City',
      role: 'Customer',
      temporaryPassword: PASSWORD,
      active: true
    };
    try {
      const res = await fetch(BASE + '/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'customers', account: account })
      });
      const body = await res.json().catch(function () { return {}; });
      if (res.ok && body.ok) { created++; console.log('created  ' + account.name + '  (' + username + ')'); }
      else if (res.status === 409) { skipped++; console.log('exists   ' + account.name + '  (skipped)'); }
      else { console.log('FAILED   ' + account.name + ': ' + (body.error || res.status)); }
    } catch (error) {
      console.log('FAILED   ' + account.name + ': ' + error.message + ' (is the server running at ' + BASE + '?)');
    }
  }
  console.log('\nDone: ' + created + ' created, ' + skipped + ' already existed. Password for all: ' + PASSWORD);
}

main();
