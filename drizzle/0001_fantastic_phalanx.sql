CREATE TYPE "public"."audit_action" AS ENUM('auth.register', 'auth.login', 'auth.logout', 'auth.login_failed', 'store.create', 'store.update', 'store.delete', 'store.qr_generated', 'stamp.scan', 'reward.generate_token', 'reward.verify', 'food.create', 'food.update', 'food.delete', 'food.reserve', 'food.pickup', 'food.cancel', 'admin.access', 'admin.stats_view', 'admin.audit_log_view');--> statement-breakpoint
CREATE TYPE "public"."food_status" AS ENUM('available', 'reserved', 'sold_out', 'expired');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'picked_up', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"userId" integer,
	"userEmail" varchar(320),
	"action" "audit_action" NOT NULL,
	"resource" varchar(255),
	"ipAddress" varchar(45),
	"userAgent" varchar(500),
	"metadata" varchar(2000),
	"success" integer DEFAULT 1 NOT NULL,
	"errorMessage" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "food_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"storeId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"originalPrice" numeric(10, 0) NOT NULL,
	"discountedPrice" numeric(10, 0) NOT NULL,
	"quantity" integer NOT NULL,
	"remainingQuantity" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"imageUrl" varchar(500),
	"status" "food_status" DEFAULT 'available' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_reservations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "food_reservations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"foodItemId" integer NOT NULL,
	"userId" integer NOT NULL,
	"storeId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"reservationCode" varchar(64) NOT NULL,
	"qrPayload" varchar(500) NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"pickedUpAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "food_reservations_reservationCode_unique" UNIQUE("reservationCode")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_logs_userId_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "food_items_storeId_idx" ON "food_items" USING btree ("storeId");--> statement-breakpoint
CREATE UNIQUE INDEX "food_items_status_idx" ON "food_items" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "food_items_expiresAt_idx" ON "food_items" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "food_reservations_userId_idx" ON "food_reservations" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "food_reservations_foodItemId_idx" ON "food_reservations" USING btree ("foodItemId");--> statement-breakpoint
CREATE UNIQUE INDEX "food_reservations_status_idx" ON "food_reservations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "food_reservations_code_idx" ON "food_reservations" USING btree ("reservationCode");