import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import get_schedule, SourceError

class ServerTests(unittest.TestCase):
    def fetch(self, name, params):
        if name == 'GetDictionaries.php':
            return [{'value': '221351', 'SORT': '1'}]
        if name == 'GetDates.php':
            return {'MIN_DATE': '2026-09-01', 'MAX_DATE': '2026-12-31', 'SEARCH_FIELD': 'GROUP_P'}
        return [{'DATE_Z': '07.10.2026', 'TIME_Z': '09:40 - 11:15', 'DISCIP': 'Тест', 'AUD': '9-714', 'GROUPS': [{'GROUP_P': '221351'}]}]
    def test_valid(self):
        status, data = get_schedule('221351', self.fetch)
        self.assertEqual(status, 200)
        self.assertEqual(data['status'], 'ok')
    def test_invalid(self):
        self.assertEqual(get_schedule('../x', self.fetch)[0], 400)
        self.assertEqual(get_schedule('22-13-51', self.fetch)[0], 404)
    def test_empty(self):
        def fetch(name, params):
            return [] if name == 'GetSchedule.php' else self.fetch(name, params)
        self.assertEqual(get_schedule('221351', fetch)[1]['status'], 'no_data')
    def test_unpublished(self):
        def fetch(name, params):
            return {'SEARCH_FIELD': 'GROUP_P', 'MIN_DATE': '', 'MAX_DATE': ''} if name == 'GetDates.php' else self.fetch(name, params)
        self.assertEqual(get_schedule('221351', fetch)[1]['status'], 'no_data')
    def test_changed_format(self):
        with self.assertRaises(SourceError):
            get_schedule('221351', lambda name, params: {'bad': True})
    def test_other_group(self):
        def fetch(name, params):
            rows = self.fetch(name, params)
            if name == 'GetSchedule.php':
                rows[0]['GROUPS'][0]['GROUP_P'] = '999999'
            return rows
        with self.assertRaises(SourceError):
            get_schedule('221351', fetch)

if __name__ == '__main__':
    unittest.main()
