"""Create the ScriptBuilder database if it does not already exist.

Connects to `master` (autocommit — CREATE DATABASE cannot run in a transaction),
then creates the target database named in .env.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pyodbc  # noqa: E402

from app.config import get_settings  # noqa: E402


def main() -> int:
    settings = get_settings()
    master_conn_str = settings.odbc_connection_string.replace(
        f"DATABASE={settings.mssql_database}", "DATABASE=master"
    )

    try:
        with pyodbc.connect(master_conn_str, autocommit=True) as conn:
            cursor = conn.cursor()
            exists = cursor.execute(
                "SELECT 1 FROM sys.databases WHERE name = ?", settings.mssql_database
            ).fetchone()
            if exists:
                print(f"Database [{settings.mssql_database}] already exists.")
            else:
                cursor.execute(f"CREATE DATABASE [{settings.mssql_database}]")
                print(f"Created database [{settings.mssql_database}].")
    except pyodbc.Error as exc:
        print(f"Could not connect to SQL Server: {exc}", file=sys.stderr)
        print("Is the MSSQLSERVER service running? Try: net start MSSQLSERVER", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
