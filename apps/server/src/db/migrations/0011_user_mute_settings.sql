ALTER TABLE `users` ADD `muted_space_ids` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `users` ADD `muted_channel_ids` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `users` ADD `muted_dm_user_ids` text NOT NULL DEFAULT '[]';
