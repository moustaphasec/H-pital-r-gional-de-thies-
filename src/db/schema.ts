import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: text('email'),
  specialty: text('specialty').notNull(),
  date: text('date').notNull(),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().default('En attente'),
  createdAt: timestamp('created_at').defaultNow(),
});
