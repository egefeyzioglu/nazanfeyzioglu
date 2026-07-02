CREATE TABLE `nazanfeyzioglu_exhibition` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text(32) NOT NULL,
	`name` text(256) NOT NULL,
	`location` text(256) NOT NULL,
	`date` text(128) NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `nazanfeyzioglu_print` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seriesId` integer NOT NULL,
	`title` text(256) NOT NULL,
	`image` text NOT NULL,
	`imageWidth` integer DEFAULT 1000 NOT NULL,
	`imageHeight` integer DEFAULT 1000 NOT NULL,
	`spec` text NOT NULL,
	`edition` text NOT NULL,
	`price` text(128),
	`position` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`seriesId`) REFERENCES `nazanfeyzioglu_series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `print_series_idx` ON `nazanfeyzioglu_print` (`seriesId`);--> statement-breakpoint
CREATE TABLE `nazanfeyzioglu_series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text(128) NOT NULL,
	`title` text(256) NOT NULL,
	`coverImage` text NOT NULL,
	`coverWidth` integer DEFAULT 1000 NOT NULL,
	`coverHeight` integer DEFAULT 1000 NOT NULL,
	`statusNote` text(256),
	`position` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nazanfeyzioglu_series_slug_unique` ON `nazanfeyzioglu_series` (`slug`);--> statement-breakpoint
CREATE TABLE `nazanfeyzioglu_site_content` (
	`key` text(128) PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `nazanfeyzioglu_work` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seriesId` integer NOT NULL,
	`title` text(256) NOT NULL,
	`image` text NOT NULL,
	`imageWidth` integer DEFAULT 1000 NOT NULL,
	`imageHeight` integer DEFAULT 1000 NOT NULL,
	`medium` text NOT NULL,
	`price` text(128),
	`digital` integer DEFAULT false NOT NULL,
	`note` text,
	`position` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`seriesId`) REFERENCES `nazanfeyzioglu_series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_series_idx` ON `nazanfeyzioglu_work` (`seriesId`);