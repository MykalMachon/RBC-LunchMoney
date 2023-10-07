import { input } from "@inquirer/prompts";

import { LunchMoneyAPI } from "@services/lunchmoney";
import { RBCParser } from "@services/rbc";

const loadAccounts = async (rbc: RBCParser, lm: LunchMoneyAPI) => {
  const csvPath = await input({ message: 'Enter the path to your RBC csv file: ' })
  await rbc.loadData(csvPath);
  const rbcAccounts = rbc.getAccounts();
  const lmAccounts = await lm.getAssets(); // I realize that it probably makes sense for this to "separated" logically, just don't care ;)

  console.log(`we found ${lmAccounts.assets.length} accounts in your Lunch Money account.`);
  console.log(`we found ${rbcAccounts.length} accounts in your RBC data. Let\'s match them to your Lunch Money accounts.`);

  return {rbcAccounts, lmAccounts};
}

export default loadAccounts;