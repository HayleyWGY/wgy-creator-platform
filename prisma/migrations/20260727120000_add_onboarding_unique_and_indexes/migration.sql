-- Idempotency for the onboarding drip: one row per (creator, step). The drip
-- claims this row inside a transaction before sending, so a concurrent cron
-- run or a retry hits this constraint (P2002) instead of double-sending a DM.
-- This unique index also serves the drip's (creatorId, templateId) lookup.
CREATE UNIQUE INDEX "OnboardingMessageSent_creatorId_templateId_key"
  ON "OnboardingMessageSent"("creatorId", "templateId");

-- The admin inbox lists DM threads ordered by updatedAt desc.
CREATE INDEX "DmThread_updatedAt_idx" ON "DmThread"("updatedAt");

-- campaignType is filtered in the campaign-filter OR clause. The member feed
-- is cached, but the admin filter path (adminAll) is uncached and hits this.
CREATE INDEX "Post_campaignType_idx" ON "Post"("campaignType");
