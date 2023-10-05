// import chalk from 'chalk';
import { input, confirm, password, select } from '@inquirer/prompts';

import { parse } from 'csv-parse';
import { Database } from "bun:sqlite";
import { RBCParser } from './services/rbc';
import { LunchMoneyAPI, LunchMoneyTransaction } from './services/lunchmoney';

const db = new Database("rbclm.sqlite", { create: true });

// check if database is new 
try {
  await db.query('SELECT * FROM settings').all();
} catch (err) {
  db.query('CREATE TABLE settings (id INTEGER PRIMARY KEY, name TEXT, value TEXT)').run();
  db.query('CREATE TABLE accounts (id INTEGER PRIMARY KEY, lm_id TEXT, rbc_name TEXT)').run();
  db.query('CREATE TABLE transactions (id INTEGER PRIMARY KEY, account_id INTEGER  date TEXT, amount REAL, description TEXT, category TEXT, FOREIGN KEY(account_id) REFERENCES accounts(id))').run();

  const newApiKey = await password({ message: 'Enter your Lunch Money API key:' })
  db.query('INSERT INTO settings (name, value) VALUES (?, ?)').run('lunchmoney_api_key', newApiKey);
}

// get the API key
type Setting = {
  id: number;
  name: string;
  value: string;
}
const lmApiKey = await db.query('SELECT * FROM settings WHERE name = $setting').get({ $setting: 'lunchmoney_api_key' }) as Setting;

// initialize services
const lm = new LunchMoneyAPI(lmApiKey.value, db);
const rbc = new RBCParser(db);

// fetch basic info from LM and confirm details with user  
const user = await lm.getUser();

console.log(`\nHey, ${user.user_name} 👋,`)
const confirmAns = await confirm({ message: `Do you want to import RBC transactions into your Lunch Money budget titled ${user.budget_name}?` });

if (!confirmAns) {
  console.log('alright! bye!');
  process.exit(0);
}

// ask for path to RBC csv file for import 
const csvPath = await input({ message: 'Enter the path to your RBC csv file: ' })
await rbc.loadData(csvPath);

// fetch LM accounts 
const lmAccounts = await lm.getAssets();

// fetch RBC accounts
const rbcAccounts = rbc.getAccounts();

console.log(`we found ${lmAccounts.assets.length} accounts in your Lunch Money account.`);
console.log(`we found ${rbcAccounts.length} accounts in your RBC data. Let\'s match them to your Lunch Money accounts.`);

// match RBC accounts to LunchMoney accounts
const remainingLMAccounts = new Set(lmAccounts.assets);

// match transactions
let matches = await db.query('select * from accounts').all();
console.log(matches);
let rematch = true;
if (matches.length > 0)
  rematch = await confirm({ message: 'We found some matches from a previous import. Do you want to rematch your accounts?' });

if (rematch) {
  // truncate existing matches table
  db.query('DELETE FROM accounts').run();

  // rematch accounts
  for (let idx = 0; idx < rbcAccounts.length; idx++) {
    const rbcAcc = rbcAccounts[idx];
    const lmChoices = [...remainingLMAccounts].map((lmAcc) => ({ name: lmAcc.name, value: lmAcc, description: `${lmAcc.type_name} - ${lmAcc.subtype_name}` }));
    const matchAnswer = await select({ message: `Which Lunch Money account matches ${rbcAcc['Account Type']} - ${rbcAcc['Account Number']}?`, choices: [...lmChoices, { name: 'N/A (skip)', value: null }] });
    if (matchAnswer !== null) {
      remainingLMAccounts.delete(matchAnswer);
      db.query('INSERT INTO accounts (lm_id, rbc_name) VALUES (?, ?)').run(matchAnswer.id, rbcAcc['Account Number']);
    }
  }
}

// build an array of transactions with proper LunchMoney format 
matches = await db.query('select * from accounts').all() as Account[];

// create an array for transactions for each account type
type Account = {
  id: number; 
  lm_id: string; 
  rbc_name: string;
}

const transactionsByAccount = matches.map((am) => {
  const accountMatch = am as Account;
  const transactions = rbc.getTransactions().filter((t) => t["Account Number"] === accountMatch.rbc_name);
  const lmTransactions: LunchMoneyTransaction[] = transactions.map((t) => {
    return {
      date: new Date(t["Transaction Date"]).toISOString().split('T')[0],
      amount: parseFloat(t["CAD$"]) * -1,
      payee: `${t["Description 1"]} - ${t["Description 2"]}`,
      asset_id: parseInt(accountMatch.lm_id),
    }
  })
  return {
    lmAccount: accountMatch.lm_id,
    transactions: lmTransactions
  }
})

// insert transactions into LunchMoney
const insertResults = transactionsByAccount.map((t) => {
  console.log(`inserting ${t.transactions.length} transactions into Lunch Money account ${t.lmAccount}`)
  console.log(t.transactions);
  return lm.insertTransactions(t.transactions);
})

const results = await Promise.allSettled(insertResults);
console.log('results were inserted successfully. Please verify them in Lunch Money.')
console.log('https://my.lunchmoney.app/transactions/')