import socket
import unittest
from urllib.parse import urlparse

from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine


class DatabaseConnectivityTests(unittest.TestCase):
    def test_database_connection(self) -> None:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar_one()

        self.assertEqual(result, 1)

    def test_postgis_extension_is_available(self) -> None:
        with engine.connect() as connection:
            extension = connection.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'postgis'")
            ).scalar_one_or_none()
            version = connection.execute(text("SELECT PostGIS_Version()")).scalar_one()

        self.assertEqual(extension, "postgis")
        self.assertTrue(str(version).startswith("3."))

    def test_redis_accepts_ping(self) -> None:
        parsed = urlparse(get_settings().redis_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=2) as connection:
            connection.sendall(b"PING\r\n")
            reply = connection.recv(16)

        self.assertTrue(reply.startswith(b"+PONG"))


if __name__ == "__main__":
    unittest.main()
