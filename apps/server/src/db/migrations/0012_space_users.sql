CREATE TABLE `space_users` (
	`space_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`space_id`, `user_id`),
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `space_users_space_idx` ON `space_users` (`space_id`);
--> statement-breakpoint
CREATE INDEX `space_users_user_idx` ON `space_users` (`user_id`);
