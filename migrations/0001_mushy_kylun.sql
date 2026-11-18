CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`name` text,
	`started_at` text NOT NULL,
	`ended_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_number_unique` ON `seasons` (`number`);--> statement-breakpoint
CREATE TABLE `tacos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`giver_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`reason` text NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tacos_season_recipient_idx` ON `tacos` (`season_id`,`recipient_id`);