PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "descript" TEXT,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scalecondition" (
    "id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL CHECK (json_valid("condition")),
    PRIMARY KEY ("id", "test.id"),
    FOREIGN KEY ("test.id") REFERENCES "test" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "itemcondition" (
    "id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL CHECK (json_valid("condition")),
    PRIMARY KEY ("id", "test.id"),
    FOREIGN KEY ("test.id") REFERENCES "test" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "normcondition" (
    "id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL CHECK (json_valid("condition")),
    PRIMARY KEY ("id", "test.id"),
    FOREIGN KEY ("test.id") REFERENCES "test" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "scale" (
    "id" TEXT NOT NULL,
    "struct" TEXT NOT NULL CHECK (json_valid("struct")),
    "condition.id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    PRIMARY KEY ("id", "test.id", "condition.id"),
    FOREIGN KEY ("test.id", "condition.id") REFERENCES "scalecondition" ("test.id", "id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "item" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "text" TEXT,
    "template_id" TEXT NOT NULL,
    "meta_json" TEXT,
    "condition.id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    "choice.id" TEXT NOT NULL,
    PRIMARY KEY ("id", "test.id", "condition.id", "template_id", "choice.id"),
    CONSTRAINT "uq_test.id_condition.id_item.no" UNIQUE ("test.id", "condition.id", "no"),
    FOREIGN KEY ("template_id") REFERENCES "template" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    FOREIGN KEY ("test.id", "condition.id") REFERENCES "itemcondition" ("test.id", "id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    FOREIGN KEY ("choice.id") REFERENCES "choice" ("id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "norm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL CHECK (json_valid("map")),
    "condition.id" TEXT NOT NULL,
    "test.id" TEXT NOT NULL,
    PRIMARY KEY ("id", "test.id", "condition.id"),
    FOREIGN KEY ("test.id", "condition.id") REFERENCES "normcondition" ("test.id", "id")
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS "choice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contents" TEXT NOT NULL CHECK (json_valid("contents")),
    PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ix_scalecondition_test.id"
    ON "scalecondition" ("test.id");

CREATE INDEX IF NOT EXISTS "ix_itemcondition_test.id"
    ON "itemcondition" ("test.id");

CREATE INDEX IF NOT EXISTS "ix_normcondition_test.id"
    ON "normcondition" ("test.id");

CREATE INDEX IF NOT EXISTS "ix_scale_test.id_condition.id"
    ON "scale" ("test.id", "condition.id");

CREATE INDEX IF NOT EXISTS "ix_item_template_id"
    ON "item" ("template_id");

CREATE INDEX IF NOT EXISTS "ix_item_test.id_condition.id"
    ON "item" ("test.id", "condition.id");

CREATE INDEX IF NOT EXISTS "ix_item_choice.id"
    ON "item" ("choice.id");

CREATE INDEX IF NOT EXISTS "ix_norm_test.id_condition.id"
    ON "norm" ("test.id", "condition.id");
