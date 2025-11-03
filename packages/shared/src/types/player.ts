// Player Types

export interface Player {
  id: string;
  tournamentId: string;
  name: string;
  email?: string;
  phone?: string;
  rating?: PlayerRating;
  status: PlayerStatus;
  seed?: number;
  checkedInAt?: Date;
  createdAt: Date;
}

export enum PlayerStatus {
  REGISTERED = 'registered',
  CHECKED_IN = 'checked_in',
  ACTIVE = 'active',
  ELIMINATED = 'eliminated',
  NO_SHOW = 'no_show',
  WITHDRAWN = 'withdrawn',
}

export interface PlayerRating {
  system: RatingSystem;
  value: number | string;
  verified: boolean;
}

export enum RatingSystem {
  APA = 'apa',
  FARGO = 'fargo',
  BCA = 'bca',
  MANUAL = 'manual',
}

export interface PlayerContacts {
  email?: string;
  phone?: string;
  smsOptIn: boolean;
  emailOptIn: boolean;
}
