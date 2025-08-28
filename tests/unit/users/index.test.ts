import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  UserService,
  UsersDb,
  UserData,
} from './../../../src/modules/users/users';
import { Place } from '../../../src/types/common';

const testDbFile = path.join(__dirname, 'users.test.json');

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    // ensure a clean db file for each test
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
    service = new UserService(testDbFile);
  });

  afterEach(() => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });

  it('creates db file if not exists', () => {
    expect(fs.existsSync(testDbFile)).toBe(true);
    const data = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
    expect(data).toEqual({});
  });

  it('saves and retrieves users', () => {
    const users: UsersDb = { '123': { places: [] } };
    service.saveUsers(users);
    const loaded = service.getUsers();
    expect(loaded).toEqual(users);
  });

  it('returns empty object if db corrupted', () => {
    fs.writeFileSync(testDbFile, '{ invalid json');
    const loaded = service.getUsers();
    expect(loaded).toEqual({});
  });

  it('gets user by chatId', () => {
    const users: UsersDb = { '42': { places: [] } };
    service.saveUsers(users);
    const user = service.getUser('42');
    expect(user).toEqual({ places: [] });
    expect(service.getUser('999')).toBeNull();
  });

  it('sets user data', () => {
    service.setUser('1', { places: [] });
    expect(service.getUser('1')).toEqual({ places: [] });

    // merges with existing
    service.setUser('1', { custom: 'test' } as any);
    expect(service.getUser('1')).toEqual({ places: [], custom: 'test' });
  });

  it('deletes a user', () => {
    service.setUser('1', { places: [] });
    service.deleteUser('1');
    expect(service.getUser('1')).toBeNull();
  });

  it('clears places for a user', () => {
    const place: Place = { phrase: 'خیابان ساحلی', alias: 'Home' };
    service.setUser('1', {
      places: [place],
    });

    service.clearPlaces('1');
    expect(service.getUser('1')?.places).toEqual([]);
  });
});
