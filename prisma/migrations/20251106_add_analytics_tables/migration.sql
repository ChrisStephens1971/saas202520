-- CreateTable: analytics_events
-- Raw event tracking for all analytics-relevant activities
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "event_data" JSONB NOT NULL,
    "user_id" TEXT,
    "session_id" VARCHAR(255),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: revenue_aggregates
-- Pre-computed revenue metrics for fast dashboard queries
CREATE TABLE "revenue_aggregates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "period_type" VARCHAR(20) NOT NULL,
    "mrr" DECIMAL(10,2),
    "arr" DECIMAL(10,2),
    "new_revenue" DECIMAL(10,2),
    "churned_revenue" DECIMAL(10,2),
    "expansion_revenue" DECIMAL(10,2),
    "total_revenue" DECIMAL(10,2),
    "payment_count" INTEGER,
    "payment_success_count" INTEGER,
    "refund_count" INTEGER,
    "refund_amount" DECIMAL(10,2),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_cohorts
-- User retention analysis by signup cohort
CREATE TABLE "user_cohorts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cohort_month" DATE NOT NULL,
    "cohort_size" INTEGER NOT NULL,
    "month_number" INTEGER NOT NULL,
    "retained_users" INTEGER NOT NULL,
    "retention_rate" DECIMAL(5,2) NOT NULL,
    "revenue" DECIMAL(10,2),
    "ltv" DECIMAL(10,2),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tournament_aggregates
-- Tournament performance metrics by time period
CREATE TABLE "tournament_aggregates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "period_type" VARCHAR(20) NOT NULL,
    "tournament_count" INTEGER,
    "completed_count" INTEGER,
    "completion_rate" DECIMAL(5,2),
    "total_players" INTEGER,
    "avg_players" DECIMAL(10,2),
    "avg_duration_minutes" DECIMAL(10,2),
    "most_popular_format" VARCHAR(100),
    "revenue" DECIMAL(10,2),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: scheduled_reports
-- Configuration for automated report delivery
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "frequency" VARCHAR(20) NOT NULL,
    "recipients" TEXT[] NOT NULL,
    "parameters" JSONB,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: analytics_events indexes
CREATE INDEX "analytics_events_tenant_id_event_type_idx" ON "analytics_events"("tenant_id", "event_type");
CREATE INDEX "analytics_events_tenant_id_timestamp_idx" ON "analytics_events"("tenant_id", "timestamp" DESC);
CREATE INDEX "analytics_events_user_id_timestamp_idx" ON "analytics_events"("user_id", "timestamp" DESC);

-- CreateIndex: revenue_aggregates indexes
CREATE UNIQUE INDEX "revenue_aggregates_tenant_id_period_type_period_start_key" ON "revenue_aggregates"("tenant_id", "period_type", "period_start");
CREATE INDEX "revenue_aggregates_tenant_id_period_start_idx" ON "revenue_aggregates"("tenant_id", "period_start" DESC);

-- CreateIndex: user_cohorts indexes
CREATE UNIQUE INDEX "user_cohorts_tenant_id_cohort_month_month_number_key" ON "user_cohorts"("tenant_id", "cohort_month", "month_number");
CREATE INDEX "user_cohorts_tenant_id_cohort_month_idx" ON "user_cohorts"("tenant_id", "cohort_month" DESC);

-- CreateIndex: tournament_aggregates indexes
CREATE UNIQUE INDEX "tournament_aggregates_tenant_id_period_type_period_start_key" ON "tournament_aggregates"("tenant_id", "period_type", "period_start");
CREATE INDEX "tournament_aggregates_tenant_id_period_start_idx" ON "tournament_aggregates"("tenant_id", "period_start" DESC);

-- CreateIndex: scheduled_reports indexes
CREATE INDEX "scheduled_reports_tenant_id_idx" ON "scheduled_reports"("tenant_id");
CREATE INDEX "idx_scheduled_reports_next_run" ON "scheduled_reports"("next_run_at");

-- AddForeignKey: analytics_events -> organizations
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: analytics_events -> users
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: revenue_aggregates -> organizations
ALTER TABLE "revenue_aggregates" ADD CONSTRAINT "revenue_aggregates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: user_cohorts -> organizations
ALTER TABLE "user_cohorts" ADD CONSTRAINT "user_cohorts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: tournament_aggregates -> organizations
ALTER TABLE "tournament_aggregates" ADD CONSTRAINT "tournament_aggregates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: scheduled_reports -> organizations
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "analytics_events" IS 'Raw event tracking for all analytics-relevant activities (payments, signups, tournaments)';
COMMENT ON TABLE "revenue_aggregates" IS 'Pre-computed revenue metrics (MRR, ARR, churn) aggregated by time period';
COMMENT ON TABLE "user_cohorts" IS 'User retention analysis by signup cohort with LTV calculations';
COMMENT ON TABLE "tournament_aggregates" IS 'Tournament performance metrics aggregated by time period';
COMMENT ON TABLE "scheduled_reports" IS 'Configuration for automated report generation and delivery';

-- Column comments for key fields
COMMENT ON COLUMN "analytics_events"."event_type" IS 'Event type: payment_completed, user_signup, tournament_completed, etc.';
COMMENT ON COLUMN "analytics_events"."event_data" IS 'Flexible JSON data specific to event type';
COMMENT ON COLUMN "revenue_aggregates"."period_type" IS 'Aggregation period: day, week, month, quarter, year';
COMMENT ON COLUMN "revenue_aggregates"."mrr" IS 'Monthly Recurring Revenue';
COMMENT ON COLUMN "revenue_aggregates"."arr" IS 'Annual Recurring Revenue (MRR * 12)';
COMMENT ON COLUMN "user_cohorts"."cohort_month" IS 'First day of signup month (YYYY-MM-01)';
COMMENT ON COLUMN "user_cohorts"."month_number" IS 'Months since signup: 0 = signup month, 1 = month 1, etc.';
COMMENT ON COLUMN "user_cohorts"."ltv" IS 'Cumulative lifetime value per user in cohort';
COMMENT ON COLUMN "scheduled_reports"."frequency" IS 'Report frequency: daily, weekly, monthly';
