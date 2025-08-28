import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Place } from '../../types/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to db file
const dbFile = path.join(__dirname, '../../../data/users.json');

export type UserData = {
  places?: Place[];
};

export type UsersDb = Record<string, UserData>; // keyed by chatId (string)

export class UserService {
  #dbFile: string;

  constructor(filePath: string = dbFile) {
    this.#dbFile = filePath;
    this.#ensureDbFile();
  }

  #ensureDbFile() {
    if (!fs.existsSync(this.#dbFile)) {
      fs.writeFileSync(this.#dbFile, JSON.stringify({}, null, 2));
    }
  }

  getUsers(): UsersDb {
    try {
      const raw = fs.readFileSync(this.#dbFile, 'utf-8');
      return JSON.parse(raw) as UsersDb;
    } catch (error) {
      console.error('getUsers error:', error);
      return {};
    }
  }

  saveUsers(users: UsersDb): void {
    try {
      const data = JSON.stringify(users, null, 2);
      fs.writeFileSync(this.#dbFile, data);
    } catch (error) {
      console.error('saveUsers error:', error);
    }
  }

  getUser(chatId: string): UserData | null {
    const users = this.getUsers();
    return users[chatId] ?? null;
  }

  setUser(chatId: string, data: UserData): void {
    const users = this.getUsers();
    users[chatId] = { ...(users[chatId] ?? {}), ...data };
    this.saveUsers(users);
  }

  deleteUser(chatId: string): void {
    const users = this.getUsers();
    delete users[chatId];
    this.saveUsers(users);
  }

  clearPlaces(chatId: string): void {
    const users = this.getUsers();
    if (users[chatId]) {
      users[chatId].places = [];
      this.saveUsers(users);
    }
  }
}
