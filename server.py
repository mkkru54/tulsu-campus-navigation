#!/usr/bin/env python3
"""Local static server and fixed-origin Tulsu JSON adapter. Python 3.9+, stdlib only."""
import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode, urlsplit, parse_qs
from urllib.request import Request, urlopen
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
BASE = 'https://tulsu.ru/schedule/queries/'
CACHE = {}
class SourceError(Exception):
    pass

def upstream(name, params):
    request = Request(BASE + name + '?' + urlencode(params), headers={'Accept': 'application/json', 'User-Agent': 'Building9-StudentProject/1.0'})
    try:
        with urlopen(request, timeout=15) as response:
            if response.status != 200:
                raise SourceError('Ошибка источника')
            data = response.read(4_000_001)
            if len(data) > 4_000_000:
                raise SourceError('Ответ слишком большой')
            return json.loads(data.decode('utf-8-sig'))
    except Exception as exc:
        raise SourceError('Источник расписания недоступен или изменил формат') from exc

def get_schedule(group, fetch=upstream):
    if not re.fullmatch(r'[0-9][0-9A-Za-zА-Яа-яЁё:.-]{1,39}', group):
        return 400, {'status': 'invalid_group', 'message': 'Проверьте номер группы.'}
    dictionaries = fetch('GetDictionaries.php', {'term': group})
    if not isinstance(dictionaries, list) or any(not isinstance(x, dict) for x in dictionaries):
        raise SourceError('Изменился формат справочника')
    exact = next((x for x in dictionaries if x.get('SORT') in ('1', 1) and x.get('value') == group), None)
    if exact is None:
        return 404, {'status': 'invalid_group', 'message': 'Группа не найдена в публичном справочнике ТулГУ. Укажите точный номер с официального сайта.'}
    dates = fetch('GetDates.php', {'search_value': group})
    if not isinstance(dates, dict) or dates.get('SEARCH_FIELD') != 'GROUP_P':
        raise SourceError('Изменился формат поиска группы')
    if not dates.get('MIN_DATE') or not dates.get('MAX_DATE'):
        return 200, {'status': 'no_data', 'group': group, 'lessons': [], 'message': 'Для группы пока не опубликовано расписание.'}
    rows = fetch('GetSchedule.php', {'search_field': 'GROUP_P', 'search_value': group})
    if not isinstance(rows, list) or any(not isinstance(x, dict) or not all(k in x for k in ('DATE_Z', 'TIME_Z', 'DISCIP', 'AUD')) for x in rows):
        raise SourceError('Изменился формат занятий')
    # Refuse cross-group or ambiguous upstream responses rather than guessing.
    if any(not isinstance(r.get('GROUPS'), list) or not any(isinstance(g, dict) and g.get('GROUP_P') == group for g in r['GROUPS']) for r in rows):
        raise SourceError('Источник вернул занятия другой группы')
    return 200, {'status': 'ok' if rows else 'no_data', 'group': group, 'lessons': rows,
                 'range': {'start': dates['MIN_DATE'], 'end': dates['MAX_DATE']},
                 'fetchedAt': time.time(), 'source': 'https://tulsu.ru/schedule/'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parts = urlsplit(self.path)
        if parts.path != '/api/schedule':
            if parts.path.startswith('/api/'):
                return self.send_json(404, {'status': 'not_found'})
            return super().do_GET()
        query = parse_qs(parts.query)
        group = query.get('group', [''])[0].strip().replace('–', '-').replace('—', '-')
        try:
            cached = CACHE.get(group)
            if cached and time.monotonic() - cached[0] < 300:
                status, data = cached[1]
            else:
                status, data = get_schedule(group)
                if status == 200:
                    if len(CACHE) >= 100:
                        CACHE.clear()
                    CACHE[group] = (time.monotonic(), (status, data))
            self.send_json(status, data)
        except SourceError:
            self.send_json(502, {'status': 'no_data', 'message': 'Нет данных: сервис ТулГУ недоступен или изменил формат. Попробуйте позже либо откройте официальное расписание.'})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    print(f'Откройте http://127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
