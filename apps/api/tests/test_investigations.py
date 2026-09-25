import asyncio
import unittest

from app.main import health_check, root


class ApiHealthTests(unittest.TestCase):
    def test_root_and_health(self) -> None:
        self.assertEqual(asyncio.run(root())["message"], "SAATRAAI API is running")
        self.assertEqual(asyncio.run(health_check())["status"], "ok")
