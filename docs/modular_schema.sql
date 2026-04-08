PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "descript" TEXT,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scale_condition" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL CHECK (json_valid("condition")),
    PRIMARY KEY ("id"),
    CONSTRAINT "uq_scale_condition_test_id_id" UNIQUE ("test_id", "id"),
    FOREIGN KEY ("test_id") REFERENCES "test" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "scale" (
    "id" TEXT NOT NULL,
    "struct" TEXT NOT NULL CHECK (json_valid("struct")),
    "scale_condition_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("test_id", "scale_condition_id") REFERENCES "scale_condition" ("test_id", "id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "item_condition" (
    "id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL CHECK (json_valid("condition")),
    PRIMARY KEY ("id"),
    CONSTRAINT "uq_item_condition_test_id_id" UNIQUE ("test.id", "id"),
    FOREIGN KEY ("test.id") REFERENCES "test" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "item" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "text" TEXT,
    "template_id" TEXT NOT NULL,
    "meta_json" TEXT,
    "item_condition_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "choice_id" TEXT NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "uq_item_test_id_item_condition_id_no" UNIQUE ("test_id", "item_condition_id", "no"),
    FOREIGN KEY ("template_id") REFERENCES "template" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    FOREIGN KEY ("test_id", "item_condition_id") REFERENCES "item_condition" ("test.id", "id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    FOREIGN KEY ("choice_id") REFERENCES "choice" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "norm_condition" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL CHECK (json_valid("condition")),
    PRIMARY KEY ("id"),
    CONSTRAINT "uq_norm_condition_test_id_id" UNIQUE ("test_id", "id"),
    FOREIGN KEY ("test_id") REFERENCES "test" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "norm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL CHECK (json_valid("map")),
    "norm_condition_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("test_id", "norm_condition_id") REFERENCES "norm_condition" ("test_id", "id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "template" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "choice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contents" TEXT NOT NULL CHECK (json_valid("contents")),
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_test_difinition" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "test.ids" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "seletedscales" TEXT NOT NULL,
    "additionalinfo" TEXT,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_user" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "custom_test_link" (
    "custom_test_link_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "create" TEXT NOT NULL,
    "update" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    PRIMARY KEY ("custom_test_link_id"),
    FOREIGN KEY ("custom_test_link_id") REFERENCES "custom_test_difinition" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "admin_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ix_admin_user_username"
    ON "admin_user" ("username");

CREATE TABLE IF NOT EXISTS "client_user" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolage" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "brithdate" TEXT NOT NULL,
    "memo" TEXT,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_user" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS "ix_scale_condition_test_id"
    ON "scale_condition" ("test_id");

CREATE INDEX IF NOT EXISTS "ix_scale_test_id_scale_condition_id"
    ON "scale" ("test_id", "scale_condition_id");

CREATE INDEX IF NOT EXISTS "ix_item_condition_test_id"
    ON "item_condition" ("test.id");

CREATE INDEX IF NOT EXISTS "ix_item_template_id"
    ON "item" ("template_id");

CREATE INDEX IF NOT EXISTS "ix_item_test_id_item_condition_id"
    ON "item" ("test_id", "item_condition_id");

CREATE INDEX IF NOT EXISTS "ix_item_choice_id"
    ON "item" ("choice_id");

CREATE INDEX IF NOT EXISTS "ix_norm_condition_test_id"
    ON "norm_condition" ("test_id");

CREATE INDEX IF NOT EXISTS "ix_norm_test_id_norm_condition_id"
    ON "norm" ("test_id", "norm_condition_id");

CREATE INDEX IF NOT EXISTS "ix_custom_test_difinition_admin_user_id"
    ON "custom_test_difinition" ("admin_user_id");

CREATE INDEX IF NOT EXISTS "ix_client_user_admin_user_id"
    ON "client_user" ("admin_user_id");
