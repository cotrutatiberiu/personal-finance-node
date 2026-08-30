CREATE TYPE account_type_enum AS ENUM ('CASH', 'CARD', 'BANK', 'SAVINGS');

CREATE TABLE IF NOT EXISTS roles
(
    id   INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users
(
    id         INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    first_name VARCHAR(50)                                        NOT NULL,
    last_name  VARCHAR(50)                                        NOT NULL,
    email      VARCHAR(255)                                       NOT NULL,
    password   VARCHAR(255)                                       NOT NULL,
    role_id    INT                                                NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (lower(email));

CREATE TABLE IF NOT EXISTS currencies
(
    id   INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(3) NOT NULL UNIQUE,
    CONSTRAINT chk_currency_name_format CHECK (name ~ '^[A-Z]+$'
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_currency_name ON currencies (lower(name));

CREATE TABLE IF NOT EXISTS accounts
(
    id              INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id         INT                       NOT NULL references users (id) ON DELETE CASCADE,
    account_type    account_type_enum         NOT NULL,
    currency_id     INT                       NOT NULL references currencies (id) ON DELETE SET NULL,
    name            VARCHAR(20)                  NOT NULL,
    archived        BOOL           DEFAULT false NOT NULL,
    balance         NUMERIC(19, 4) DEFAULT 0     NOT NULL,
    created_at      TIMESTAMPTZ    DEFAULT now() NOT NULL,
    updated_at      TIMESTAMPTZ    DEFAULT now() NOT NULL,

    CONSTRAINT chk_account_name_length CHECK (length(name) >= 3 AND length(name) <= 20)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_user_name ON accounts (user_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_currency_id ON accounts (currency_id);

CREATE TABLE IF NOT EXISTS categories
(
    id                 INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name               VARCHAR(255) NOT NULL,
    user_id            INT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_category_id INT       REFERENCES categories (id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 1. Enforce uniqueness for top-level categories (Where parent_category_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_top_level_name
    ON categories (user_id, LOWER(name)) WHERE parent_category_id IS NULL;

-- 2. Enforce uniqueness for sub-categories (Where a parent exists)
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_sub_name
    ON categories (user_id, parent_category_id, LOWER(name)) WHERE parent_category_id IS NOT NULL;

-- 3. General performance index for lookups by user
CREATE INDEX IF NOT EXISTS idx_categories_user_id
    ON categories (user_id);

CREATE TABLE IF NOT EXISTS transactions
(
    id          INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    amount      NUMERIC(19, 4) NOT NULL,
    description VARCHAR(255),
    type        VARCHAR(20)    NOT NULL,
    user_id     INT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    account_id  INT         NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    category_id INT         NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    occurred_at TIMESTAMPTZ    NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT chk_transaction_type CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_tx_user_occurred
    ON transactions (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_tx_account_occurred
    ON transactions (account_id, occurred_at DESC);