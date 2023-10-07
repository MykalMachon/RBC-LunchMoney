// import chalk from 'chalk';
import { input, confirm, select } from '@inquirer/prompts';


import { RBCParser } from '@services/rbc';
import { LunchMoneyAPI, LunchMoneyTransaction } from '@services/lunchmoney';

import type { Setting, Account } from './types';

import setup from '@actions/setup';
import confirmUser from '@actions/confirm-user';
import loadAccounts from '@actions/load-accounts';
import { matchAccounts } from '@actions/match-accounts';

// setup the database
const db = await setup();

// initialize services
const lmApiKey = await db.query('SELECT * FROM settings WHERE name = $setting').get({ $setting: 'lunchmoney_api_key' }) as Setting;
const lm = new LunchMoneyAPI(lmApiKey.value, db);
const rbc = new RBCParser(db);

// fetch basic info from LM and confirm details with user  
await confirmUser(lm);

// load local rbc data, fetch remote LM accounts
// print the number of accounts of each type via the CLI
const {lmAccounts, rbcAccounts} = await loadAccounts(rbc, lm);

// match RBC accounts to LunchMoney accounts
const matches = await matchAccounts(db, rbcAccounts, lmAccounts);


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
  return lm.insertTransactions(t.transactions);
})

const results = await Promise.allSettled(insertResults);
console.log('results were inserted successfully. Please verify them in Lunch Money.')
console.log('https://my.lunchmoney.app/transactions/')