ALTER TABLE `users` ADD `can_see_users_from_own_roles` integer NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `users` ADD `visible_user_ids` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `users` ADD `visible_role_ids` text NOT NULL DEFAULT '[]';
