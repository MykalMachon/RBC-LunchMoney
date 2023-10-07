import { confirm } from "@inquirer/prompts";
import { LunchMoneyAPI } from "@services/lunchmoney";

const confirmUser = async (lm: LunchMoneyAPI) => {
  const user = await lm.getUser();

  console.log(`\nHey, ${user.user_name} 👋,`)
  const confirmAns = await confirm({ message: `Do you want to import RBC transactions into your Lunch Money budget titled ${user.budget_name}?` });

  if (!confirmAns) {
    console.log('alright! bye!');
    process.exit(0);
  }
}

export default confirmUser;