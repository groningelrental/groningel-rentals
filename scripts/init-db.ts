#!/usr/bin/env tsx

import { getDb } from '../src/lib/mongodb';

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');
    
    const db = await getDb();
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    if (!collectionNames.includes('users')) {
      await db.createCollection('users');
      console.log('✅ Created users collection');
    }
    
    // Create indexes for better performance
    const usersCollection = db.collection('users');
    
    // Create unique index on email
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Created unique index on email');
    
    // Create index on id for faster lookups
    await usersCollection.createIndex({ id: 1 });
    console.log('✅ Created index on id');
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase(); 