export type Error = {
  error: string;
  code: number;
};

export type OutagePage = string;

export type OutageTimeRange = {
  startHour: number;
  endHour: number;
};

export type ScrapedOutage = {
  date: Date;
  places: PlaceOutage[];
};

export type Place = {
  phrase: string;
  alias: string;
};

export type PlaceOutage = {
  place: Place;
  outageTimes: OutageTimeRange[];
};
