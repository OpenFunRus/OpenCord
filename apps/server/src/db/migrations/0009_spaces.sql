CREATE TABLE `spaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar_id` integer,
	`position` integer NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`avatar_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `spaces_position_idx` ON `spaces` (`position`);
--> statement-breakpoint
CREATE INDEX `spaces_is_default_idx` ON `spaces` (`is_default`);
--> statement-breakpoint
CREATE TABLE `space_roles` (
	`space_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`space_id`, `role_id`),
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `space_roles_space_idx` ON `space_roles` (`space_id`);
--> statement-breakpoint
CREATE INDEX `space_roles_role_idx` ON `space_roles` (`role_id`);
--> statement-breakpoint
INSERT INTO `spaces` (`name`, `position`, `is_default`, `created_at`)
SELECT 'Гостевое', 1, true, CAST(strftime('%s','now') AS integer) * 1000
WHERE NOT EXISTS (SELECT 1 FROM `spaces` WHERE `is_default` = true);
--> statement-breakpoint
ALTER TABLE `categories` ADD `space_id` integer REFERENCES `spaces`(`id`) ON DELETE cascade;
--> statement-breakpoint
UPDATE `categories`
SET `space_id` = (SELECT `id` FROM `spaces` WHERE `is_default` = true ORDER BY `id` LIMIT 1)
WHERE `space_id` IS NULL;
--> statement-breakpoint
CREATE INDEX `categories_space_idx` ON `categories` (`space_id`);
--> statement-breakpoint
CREATE INDEX `categories_space_position_idx` ON `categories` (`space_id`, `position`);
--> statement-breakpoint
ALTER TABLE `channels` ADD `space_id` integer REFERENCES `spaces`(`id`) ON DELETE cascade;
--> statement-breakpoint
UPDATE `channels`
SET `space_id` = (SELECT `id` FROM `spaces` WHERE `is_default` = true ORDER BY `id` LIMIT 1)
WHERE `space_id` IS NULL AND `is_dm_channel` = false;
--> statement-breakpoint
CREATE INDEX `channels_space_idx` ON `channels` (`space_id`);
--> statement-breakpoint
CREATE INDEX `channels_space_category_position_idx` ON `channels` (`space_id`, `category_id`, `position`);
