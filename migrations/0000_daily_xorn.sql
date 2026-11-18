CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`reason` text,
	`note` text,
	`others_can_come` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_date_idx` ON `bookings` (`date`,`start`);