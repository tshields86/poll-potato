import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const poll = pgTable(
  "poll",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    question: text("question").notNull(),
    // FK to Better Auth's user.id is added in M2 once that table exists.
    creatorUserId: uuid("creator_user_id"),
    creatorToken: text("creator_token"),
    allowMultiple: boolean("allow_multiple").notNull().default(false),
    requireName: boolean("require_name").notNull().default(false),
    hideResults: boolean("hide_results").notNull().default(false),
    status: text("status").notNull().default("open"),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("poll_status_check", sql`${t.status} in ('open', 'closed')`),
    index("poll_creator_user_id_idx").on(t.creatorUserId),
    index("poll_creator_token_idx").on(t.creatorToken),
  ],
);

export const pollOption = pgTable(
  "poll_option",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => poll.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull(),
    voteCount: integer("vote_count").notNull().default(0),
  },
  (t) => [index("poll_option_poll_id_position_idx").on(t.pollId, t.position)],
);

export const vote = pgTable(
  "vote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => poll.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOption.id, { onDelete: "cascade" }),
    // FK to Better Auth's user.id is added in M2.
    userId: uuid("user_id"),
    voterToken: text("voter_token"),
    voterName: text("voter_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("vote_poll_id_idx").on(t.pollId),
    index("vote_option_id_idx").on(t.optionId),
    // A signed-in voter cannot vote for the same option twice in a poll.
    uniqueIndex("vote_unique_user_option")
      .on(t.pollId, t.userId, t.optionId)
      .where(sql`${t.userId} is not null`),
    // An anonymous voter (identified by cookie token) cannot either.
    uniqueIndex("vote_unique_token_option")
      .on(t.pollId, t.voterToken, t.optionId)
      .where(sql`${t.voterToken} is not null`),
  ],
);

export type Poll = typeof poll.$inferSelect;
export type NewPoll = typeof poll.$inferInsert;
export type PollOption = typeof pollOption.$inferSelect;
export type NewPollOption = typeof pollOption.$inferInsert;
export type Vote = typeof vote.$inferSelect;
export type NewVote = typeof vote.$inferInsert;
