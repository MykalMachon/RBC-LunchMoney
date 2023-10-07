import Database from "bun:sqlite";
import { parse } from "csv-parse";

export type RBCTransaction = {
  "Account Type": string;
  "Account Number": string;
  "Transaction Date": string;
  "Cheque Number"?: string;
  "Description 1": string;
  "Description 2"?: string;
  "CAD$": string; 
  "USD$": string;
}

export type RBCAccount = {
  "Account Type": string;
  "Account Number": string;
}

const parseData = async (data: string): Promise<Array<RBCTransaction>> => {
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

export class RBCParser {
  db: Database;

  transactions: Array<RBCTransaction>;
  accounts: Array<RBCAccount>;

  constructor(db: Database){
    this.db = db;
    this.transactions = [];
    this.accounts = [];
  }

  async loadData(csvPath: String) {
    const rbcCSVFile = Bun.file(`${csvPath}`);
    const rbcCSVData = await rbcCSVFile.text();

    // load in transaction data
    this.transactions = await parseData(rbcCSVData);

    // load in account data
    let accountNumbers: String[] = [];
    this.transactions.forEach((t) => {
      if (!accountNumbers.includes(t["Account Number"])) {
        accountNumbers.push(t["Account Number"]);
        this.accounts.push({
          "Account Type": t["Account Type"],
          "Account Number": t["Account Number"],
        });
      }
    });
  }

  getAccounts(): Array<RBCAccount> {
    return this.accounts;
  }

  getTransactions(): Array<RBCTransaction> {
    return this.transactions;
  }
}
