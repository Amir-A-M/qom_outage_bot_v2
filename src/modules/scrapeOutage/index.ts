import { Place, ScrapedOutage } from './../../types/common';
import axios from 'axios';
import { Error, OutagePage } from '../../types/common';
import { tryCatch } from '../../utils/try-catch';
import { settings } from '../../settings';
import * as cheerio from 'cheerio';
import { getOutageTableDate, parseOutagePlaces } from './helpers';

type ScrapCache = null | { time: Date; value: OutagePage };
type Check = (places: Place[]) => Promise<Error | ScrapedOutage>;
type GetOutagePage = () => Promise<Error | OutagePage>;
type GetScrapCache = () => false | OutagePage;
type SetScrapCache = (value: OutagePage) => void;

class ScrapPowerOutage {
  #scrapCache = null as ScrapCache;

  check: Check = async (places) => {
    if (!places) return { error: 'Pls provide a search phrase.', code: 400 };

    const data = await this.getOutagePage();
    if (typeof data !== 'string') {
      return data as Error;
    }

    const $ = cheerio.load(data);
    const date = getOutageTableDate($);

    if ('error' in date) {
      return { error: 'Could not retrieve outage date.', code: 422 };
    }

    const placesOutages = parseOutagePlaces($, places);
    if ('error' in placesOutages) {
      return placesOutages;
    }

    return {
      date,
      places: placesOutages,
    };
  };

  getOutagePage: GetOutagePage = async () => {
    const cache = this.getScrapCache();
    if (cache) {
      return cache;
    }

    const { response, error } = await tryCatch(axios.get(settings.scrapUrl));

    if (error) {
      console.error('Error:', error);
      return {
        error:
          'There was an error retrieving the outage table from qepd.co.ir.',
        code: 500,
      };
    }

    this.setScrapCache(response.data);
    return response.data as OutagePage;
  };

  getScrapCache: GetScrapCache = () => {
    if (this.#scrapCache === null) {
      return false;
    }

    const now = new Date();
    const cacheTime = this.#scrapCache.time;
    // time difference in seconds
    const timeDiff = (now.getTime() - cacheTime.getTime()) / 1000;

    const isSameDay =
      now.getFullYear() === cacheTime.getFullYear() &&
      now.getMonth() === cacheTime.getMonth() &&
      now.getDate() === cacheTime.getDate();

    if (timeDiff < settings.cacheTTL && isSameDay) {
      return this.#scrapCache.value;
    }

    return false;
  };

  setScrapCache: SetScrapCache = (value) => {
    this.#scrapCache = { time: new Date(), value };
  };
}

export default ScrapPowerOutage;
