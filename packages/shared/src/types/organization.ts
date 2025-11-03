// Organization (Tenant) Types

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
}

export enum OrganizationRole {
  OWNER = 'owner',
  TD = 'td', // Tournament Director
  SCOREKEEPER = 'scorekeeper',
  STREAMER = 'streamer',
}
