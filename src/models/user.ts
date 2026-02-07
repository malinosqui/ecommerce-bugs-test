import { ID, ISODateString } from "./common";

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SUPPORT = "SUPPORT"
}

export interface Address {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface User {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  addresses: Address[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastLoginAt?: ISODateString;
}

export interface CreateUserInput {
  email: string;
  name: string;
  phone?: string;
  role?: UserRole;
  addresses?: Address[];
}
