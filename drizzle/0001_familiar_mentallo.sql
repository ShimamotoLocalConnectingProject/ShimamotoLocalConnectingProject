CREATE TABLE `point_balance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` decimal(10,1) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `point_balance_id` PRIMARY KEY(`id`),
	CONSTRAINT `point_balance_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `point_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeId` int,
	`delta` decimal(10,1) NOT NULL,
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `point_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(100) NOT NULL,
	`icon` varchar(20) NOT NULL DEFAULT '🏪',
	`color` varchar(20) NOT NULL DEFAULT '#8B4513',
	`reward` varchar(500) NOT NULL,
	`rewardThreshold` int NOT NULL DEFAULT 5,
	`qrSecret` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeId` int NOT NULL,
	`stampValue` decimal(3,1) NOT NULL DEFAULT '1.0',
	`visitNumber` int NOT NULL DEFAULT 1,
	`qrToken` varchar(64) NOT NULL,
	`visitedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
