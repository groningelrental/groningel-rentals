import { getDb } from "@/lib/mongodb";
import {
  User,
  CreateUserData,
  UserResponse,
  sanitizeUser,
} from "@/lib/models/user";

const COLLECTION_NAME = "users";

export async function createUser(
  userData: CreateUserData
): Promise<UserResponse> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  const now = new Date();
  const userId = `user-${Date.now()}`;

  const newUser: User = {
    id: userId,
    email: userData.email.toLowerCase(),
    passwordHash: userData.passwordHash,
    name: userData.name,
    role: userData.role || "user",
    createdAt: now,
    updatedAt: now,
    isSubscribed: false,
  };

  await collection.insertOne(newUser);
  return sanitizeUser(newUser);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  return await collection.findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  return await collection.findOne({ id });
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<UserResponse | null> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  const updateData = {
    ...updates,
    updatedAt: new Date(),
  };

  const result = await collection.findOneAndUpdate(
    { id },
    { $set: updateData },
    { returnDocument: "after" }
  );

  if (!result) {
    return null;
  }

  return sanitizeUser(result);
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function getAllUsers(): Promise<UserResponse[]> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  const users = await collection.find({}).toArray();
  return users.map(sanitizeUser);
}

export async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
  const db = await getDb();
  const collection = db.collection<User>(COLLECTION_NAME);

  return await collection.findOne({ stripeCustomerId });
}
