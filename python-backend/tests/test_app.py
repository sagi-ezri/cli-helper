import unittest
from app import app

class TestApp(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_analyze_history(self):
        response = self.client.get('/analyze-history')
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()
