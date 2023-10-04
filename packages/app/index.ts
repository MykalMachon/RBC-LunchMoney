import { parse } from 'csv-parse';
import { Database } from "bun:sqlite";

const db = new Database("rbclm.sqlite", { create: true });

// check if database is new 
let settings = null;
try {
  settings = await db.query('SELECT * FROM settings').all();
} catch (err) {
  db.query('CREATE TABLE settings (id INTEGER PRIMARY KEY, name TEXT, value TEXT)').run();
  db.query('CREATE TABLE accounts (id INTEGER PRIMARY KEY, lm_id TEXT, rbc_name TEXT)').run();
  db.query('CREATE TABLE transactions (id INTEGER PRIMARY KEY, account_id INTEGER  date TEXT, amount REAL, description TEXT, category TEXT, FOREIGN KEY(account_id) REFERENCES accounts(id))').run();
}

// check for lunch money API key
if (settings == null || settings.find(s => s.name == 'lunchmoney_api_key') == null) {
  const lmApiKey = await prompt('Enter your Lunch Money API Key: ');
  db.query('INSERT INTO settings (name, value) VALUES (?, ?)').run('lunchmoney_api_key', lmApiKey);
}

// get the API key
const lmApiKey = await db.query('SELECT * FROM settings WHERE name = $setting').get({ $setting: 'lunchmoney_api_key' });

// fetch basic info from LM and confirm details with user  
const res = await fetch('https://dev.lunchmoney.app/v1/me', {
  headers: {
    Authorization: `Bearer ${lmApiKey.value}`
  }
})
const lmUserData = await res.json();

console.log(`\nHey, ${lmUserData.user_name} 👋,\nDo you want to import RBC transactions into your Lunch Money budget titled ${lmUserData.budget_name}?`)
const confirm = await prompt('y/n: ');

if (confirm?.toLowerCase() === 'n') {
  console.log('alright! bye!');
  process.exit(0);
}

// ask for path to RBC csv file for import 
const rbcPath = prompt('Enter the path to your RBC csv file: ');
const rbcCSVFile = Bun.file(`${rbcPath}`);
const rbcCSVData = await rbcCSVFile.text();

// initial CSV parser
const parseData = async (data: string) => {
  return new Promise((resolve, reject) => {
    parse(data, {relax_column_count: true, columns: true}, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    })
  });
};

const rbcData = await parseData(rbcCSVData);

// get all unique accounts from RBC data
const rbcAccounts = new Set();
rbcData.forEach((row) => {
  rbcAccounts.add(`${row['Account Type']} - ${row['Account Number']}`);
})

// get all lunch money accounts 
const lmAccRes = await fetch('https://dev.lunchmoney.app/v1/assets', {
  headers: {
    Authorization: `Bearer ${lmApiKey.value}`
  }
});
const lmAccData = await lmAccRes.json();
console.log(`we found ${lmAccData.assets.length} accounts in your Lunch Money account.`);

// match RBC accounts to LunchMoney accounts 
console.log(`we found ${rbcAccounts.size} accounts in your RBC data. Let\'s match them to your Lunch Money accounts.`);


console.log(lmAccData);

// import transactions 

// return summary of import




