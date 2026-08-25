#!/bin/bash
set -e

service postgresql start

su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='itsm_admin'\" | grep -q 1 || psql -c \"CREATE USER itsm_admin WITH PASSWORD 'password' SUPERUSER;\""

su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='itsm_test'\" | grep -q 1 || psql -c \"CREATE DATABASE itsm_test OWNER itsm_admin;\""

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/14/main/postgresql.conf || true
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/14/main/pg_hba.conf
echo "host all all ::0/0 md5" >> /etc/postgresql/14/main/pg_hba.conf
echo "local all all trust" >> /etc/postgresql/14/main/pg_hba.conf

service postgresql restart
echo "PostgreSQL setup completed successfully!"
