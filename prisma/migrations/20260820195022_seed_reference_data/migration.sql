INSERT INTO roles(name)
VALUES ('USER'),
       ('MODERATOR'),
       ('ADMIN')
ON CONFLICT DO NOTHING;

INSERT INTO currencies(name)
VALUES ('EUR'),
       ('USD'),
       ('RON')
ON CONFLICT (lower(name)) DO NOTHING;

INSERT INTO account_types(name)
VALUES ('CASH'),
       ('CARD'),
       ('BANK'),
       ('SAVINGS')
ON CONFLICT DO NOTHING;