// import chalk from 'chalk';
import { input, confirm, password, select } from '@inquirer/prompts';

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
  const lmApiKey = await password({ message: 'Enter your Lunch Money API key:' })
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

console.log(`\nHey, ${lmUserData.user_name} 👋,`)
const confirmAns = await confirm({ message: `Do you want to import RBC transactions into your Lunch Money budget titled ${lmUserData.budget_name}?` });

if (!confirmAns) {
  console.log('alright! bye!');
  process.exit(0);
}

// ask for path to RBC csv file for import 
const rbcPath = await input({ message: 'Enter the path to your RBC csv file: ' })
const rbcCSVFile = Bun.file(`${rbcPath}`);
const rbcCSVData = await rbcCSVFile.text();

// initial CSV parser
const parseData = async (data: string) => {
  return new Promise((resolve, reject) => {
    parse(data, { relax_column_count: true, columns: true }, (err, records) => {
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
console.log(`we found ${rbcAccounts.size} accounts in your RBC data. Let\'s match them to your Lunch Money accounts.`);

console.log(lmAccData.assets[0]);

// match RBC accounts to LunchMoney accounts
const rbcAccountsArr = [...rbcAccounts];
const remainingLMAccounts = new Set(lmAccData.assets.map((a: any) => {
  return { id: a.id, name: a.name, type_name: a.type_name, subtype_name: a.subtype_name }
}));

const matches = await db.query('select * from accounts').all();

// TODO: check if they want to rematch their accounts or re-use the existing matches
// if they want to rematch, delete all matches from the database and start over
// if they want to re-use, load the matches from the database and use those

// import transactions 
for(let idx = 0; idx < rbcAccountsArr.length; idx++) {
  const rbcAcc = rbcAccountsArr[idx];
  const lmChoices = [...remainingLMAccounts].map((lmAcc) => ({ name: lmAcc.name, value: lmAcc, description: `${lmAcc.type_name} - ${lmAcc.subtype_name}` }));
  const matchAnswer = await select({ message: `Which Lunch Money account matches ${rbcAcc}?`, choices: [...lmChoices, {name: 'N/A (skip)', value: null}] });
  if (matchAnswer !== null) {
    remainingLMAccounts.delete(matchAnswer);
    // add match to database
    db.query('INSERT INTO accounts (lm_id, rbc_name) VALUES (?, ?)').run(matchAnswer.id, rbcAcc);
  }
}
// return summary of import




