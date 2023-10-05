import Database from "bun:sqlite";

export type LunchMoneyUser = {
  user_name: string;
  user_email: string;
  account_id: number;
  budget_name: string; 
  api_key_label: string; 
}

export type LunchMoneyTransaction = {
  date: string;
  amount: number;
  category_id?: number;
  payee?: string; 
  currency?: string; 
  asset_id: number; 
  recurring_id?: number;
  notes?: string; 
  status?: string; 
  tags?: string[];
}

export class LunchMoneyAPI {
  apiKey: String;
  db: Database;

  constructor(apiKey: String, db: Database){
    this.apiKey = apiKey;
    this.db = db;
  }

  async getUser(): Promise<LunchMoneyUser> {
    const res = await fetch('https://dev.lunchmoney.app/v1/me', {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    })
    return await res.json();
  }

  async getAssets(): Promise<{assets: Record<string, string>[]}> {
    const res = await fetch('https://dev.lunchmoney.app/v1/assets', {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    })
    return await res.json();
  }

  async insertTransactions(transactions: Array<LunchMoneyTransaction>): Promise<Number[]> {
    const res = await fetch('https://dev.lunchmoney.app/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        transactions: transactions,
        skip_duplicates: true,
        check_for_recurring: true,
       })
    });
    const data = await res.json();
    return data;
  }
}
