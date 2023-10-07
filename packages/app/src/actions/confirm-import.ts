import { confirm } from "@inquirer/prompts";
import { LunchMoneyAPI, LunchMoneyTransaction } from "@services/lunchmoney";

/**
 * confirm the import with the user
 * and finalize the import if they say it's okay
 */
const confirmImport = async (lm: LunchMoneyAPI, accounts: { transactions: LunchMoneyTransaction[], lmAccount: string }[]) => {
  console.log(`You're about to insert transactions into your LunchMoney budget.`)
  const confirmAns = await confirm({ message: `Are you sure you want to import them? ` });

  if (!confirmAns) {
    console.log('alright! bye!');
    process.exit(0);
  }

  // insert transactions into LunchMoney
  const insertResults = accounts.map((t) => {
    console.log(`inserting ${t.transactions.length} transactions into Lunch Money account ${t.lmAccount}`)
    return lm.insertTransactions(t.transactions);
  });

  await Promise.allSettled(insertResults);
  console.log('results were inserted successfully. Please verify them in Lunch Money.')
  console.log('https://my.lunchmoney.app/transactions/')
}

export default confirmImport;