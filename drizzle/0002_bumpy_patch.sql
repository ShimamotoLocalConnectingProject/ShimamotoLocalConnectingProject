ALTER TYPE "public"."audit_action" ADD VALUE 'notification.subscribe' BEFORE 'admin.access';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'notification.unsubscribe' BEFORE 'admin.access';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'notification.sent' BEFORE 'admin.access';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'notification.preference_update' BEFORE 'admin.access';--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"newProductsEnabled" integer DEFAULT 1 NOT NULL,
	"expiringItemsEnabled" integer DEFAULT 1 NOT NULL,
	"reservationRemindersEnabled" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "push_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions" USING btree ("userId");