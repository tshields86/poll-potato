-- Now that neon_auth.user exists (created by Neon Auth), back-reference it from
-- the user-bearing columns we deferred in 0000_init.sql. ON DELETE SET NULL so a
-- deleted user's polls/votes are preserved (they fall back to anonymous identity
-- via the creator_token / voter_token columns).
ALTER TABLE "poll"
  ADD CONSTRAINT "poll_creator_user_id_neon_auth_user_id_fk"
  FOREIGN KEY ("creator_user_id")
  REFERENCES "neon_auth"."user"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "vote"
  ADD CONSTRAINT "vote_user_id_neon_auth_user_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "neon_auth"."user"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
