import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "user" | "admin";
  isSubscribed: boolean;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "unpaid";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  role?: "user" | "admin";
  isSubscribed?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  isSubscribed: boolean;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "unpaid";
}

export function sanitizeUser(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSubscribed: user.isSubscribed,
    subscriptionStatus: user.subscriptionStatus,
  };
}
