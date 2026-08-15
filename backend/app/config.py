from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mssql_server: str = "localhost"
    mssql_database: str = "ScriptBuilder"
    mssql_driver: str = "ODBC Driver 18 for SQL Server"
    mssql_trusted_connection: bool = True
    mssql_username: str = ""
    mssql_password: str = ""
    mssql_encrypt: str = "yes"
    mssql_trust_server_certificate: str = "yes"

    cors_origins: str = "http://localhost:5173"

    @property
    def odbc_connection_string(self) -> str:
        parts = [
            f"DRIVER={{{self.mssql_driver}}}",
            f"SERVER={self.mssql_server}",
            f"DATABASE={self.mssql_database}",
            f"Encrypt={self.mssql_encrypt}",
            f"TrustServerCertificate={self.mssql_trust_server_certificate}",
        ]
        if self.mssql_trusted_connection:
            parts.append("Trusted_Connection=yes")
        else:
            parts.append(f"UID={self.mssql_username}")
            parts.append(f"PWD={self.mssql_password}")
        return ";".join(parts)

    @property
    def database_url(self) -> str:
        return f"mssql+pyodbc:///?odbc_connect={quote_plus(self.odbc_connection_string)}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
