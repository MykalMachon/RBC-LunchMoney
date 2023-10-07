import { input } from "@inquirer/prompts";
import Database from "bun:sqlite";

const setup = async () => {
  const db = new Database("rbclm.sqlite", { create: true });

  // check if database is new 
  try {
    await db.query('SELECT * FROM settings').all();
  } catch (err) {
    db.query('CREATE TABLE settings (id INTEGER PRIMARY KEY, name TEXT, value TEXT)').run();
    db.query('CREATE TABLE accounts (id INTEGER PRIMARY KEY, lm_id TEXT, rbc_name TEXT)').run();
    db.query('CREATE TABLE transactions (id INTEGER PRIMARY KEY, account_id INTEGER  date TEXT, amount REAL, description TEXT, category TEXT, FOREIGN KEY(account_id) REFERENCES accounts(id))').run();
  
    const newApiKey = await input({ message: 'Enter your Lunch Money API key:' })
    db.query('INSERT INTO settings (name, value) VALUES (?, ?)').run('lunchmoney_api_key', newApiKey);
  }

  return db;
};

export default setup;