import Database from "bun:sqlite";

import { confirm, select } from "@inquirer/prompts";
import { LunchMoneyAsset } from "@services/lunchmoney";

import { RBCAccount } from "@services/rbc";
import { Account } from "src/types";

export const matchAccounts = async (db: Database, rbcAccounts: RBCAccount[], lmAccounts: {assets: LunchMoneyAsset[]}) => {
  const remainingLMAccounts = new Set(lmAccounts.assets);

  let matches = await db.query('select * from accounts').all();
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
  matches = await db.query('select * from accounts').all();
  return matches as Account[];
}

