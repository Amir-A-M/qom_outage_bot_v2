import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import axios from 'axios';
import ScrapPowerOutage from '../../../src/modules/scrapeOutage';
import * as helpers from '../../../src/modules/scrapeOutage/helpers';
import { settings } from '../../../src/settings';
import fs from 'fs';
import path from 'path';

const sampleOutageHtml = fs.readFileSync(
  path.resolve(__dirname, './sample_outage_page.html'),
  'utf8'
);

// Mock axios
vi.mock('axios');
vi.mock('../../utils/try-catch', () => ({
  tryCatch: async (fn: any) => {
    try {
      const response = await fn;
      return { response };
    } catch (error) {
      return { error };
    }
  },
}));

describe('ScrapPowerOutage', () => {
  let scraper: ScrapPowerOutage;

  beforeEach(() => {
    scraper = new ScrapPowerOutage();
    vi.clearAllMocks();
  });

  describe('Cache behavior', () => {
    it('returns false if cache is empty', () => {
      expect(scraper.getScrapCache()).toBe(false);
    });

    it('stores and retrieves cache within TTL', () => {
      const fakePage = '<html>cached</html>';
      scraper.setScrapCache(fakePage);
      expect(scraper.getScrapCache()).toBe(fakePage);
    });

    it('invalidates cache if expired or next day', () => {
      const fakePage = '<html>expired</html>';
      scraper['#scrapCache'] = {
        time: new Date(Date.now() - (settings.cacheTTL + 10) * 1000),
        value: fakePage,
      };
      expect(scraper.getScrapCache()).toBe(false);
    });
  });

  describe('getOutagePage', () => {
    it('returns cached value if available', async () => {
      scraper.setScrapCache('<html>cached</html>');
      const result = await scraper.getOutagePage();
      expect(result).toBe('<html>cached</html>');
    });

    it('fetches data from axios if no cache', async () => {
      (axios.get as any).mockResolvedValue({ data: '<html>fetched</html>' });

      const result = await scraper.getOutagePage();
      expect(result).toBe('<html>fetched</html>');
      expect(axios.get).toHaveBeenCalledWith(settings.scrapUrl);
    });

    it('returns error if axios fails', async () => {
      (axios.get as any).mockRejectedValue(new Error('Network fail'));
      const result = await scraper.getOutagePage();
      expect(result).toEqual({
        error:
          'There was an error retrieving the outage table from qepd.co.ir.',
        code: 500,
      });
    });
  });

  describe('check()', () => {
    it('returns error if no places', async () => {
      (axios.get as any).mockResolvedValue({ data: sampleOutageHtml });

      const result = await scraper.check([] as any);
      expect(result).toEqual({
        error: 'No places provided',
        code: 400,
      });
    });

    it('returns error if getOutageTableDate fails', async () => {
      (axios.get as any).mockResolvedValue({ data: '<html>page</html>' });
      vi.spyOn(helpers, 'getOutageTableDate').mockReturnValue({
        error: 'bad date',
        code: 422,
      });

      const result = await scraper.check([{ phrase: 'خیابان' } as any]);
      expect(result).toEqual({
        error: 'Could not retrieve outage date.',
        code: 422,
      });
    });

    it('returns error if parseOutagePlaces fails', async () => {
      (axios.get as any).mockResolvedValue({ data: '<html>page</html>' });
      vi.spyOn(helpers, 'getOutageTableDate').mockReturnValue(
        new Date('2025-08-26')
      );
      vi.spyOn(helpers, 'parseOutagePlaces').mockReturnValue({
        error: 'not found',
        code: 404,
      });

      const result = await scraper.check([{ phrase: 'خیابان عدالت' } as any]);
      expect(result).toEqual({ error: 'not found', code: 404 });
    });

    it('returns date and places if success', async () => {
      (axios.get as any).mockResolvedValue({ data: '<html>page</html>' });
      vi.spyOn(helpers, 'getOutageTableDate').mockReturnValue(
        new Date('2025-08-26')
      );
      vi.spyOn(helpers, 'parseOutagePlaces').mockReturnValue([
        {
          place: { phrase: 'خیابان عدالت', alias: 'باشگاه' },
          outageTimes: [{ startHour: 8, endHour: 10 }],
        },
      ]);

      const result = await scraper.check([{ phrase: 'خیابان عدالت' } as any]);
      expect(result).toEqual({
        date: new Date('2025-08-26'),
        places: [
          {
            place: { phrase: 'خیابان عدالت', alias: 'باشگاه' },
            outageTimes: [{ startHour: 8, endHour: 10 }],
          },
        ],
      });
    });
  });
});
