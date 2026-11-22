"""Recompute data/stats.json and data/cases.csv from data/cases.json.

Counts and ages are over the silent wrong results (kind == 'wrong_result');
cases where results were correct but cost more work (kind == 'extra_cost')
are counted separately. Ages use the traced dates where a case was traced
and the git blame estimate otherwise.
"""
import csv, json, statistics
from collections import Counter
from pathlib import Path
D = Path(__file__).resolve().parent.parent / 'data'
cases = json.load(open(D / 'cases.json', encoding='utf-8'))
stats = json.load(open(D / 'stats.json', encoding='utf-8'))
wrong = [c for c in cases if c['kind'] == 'wrong_result']
ages = [c['age_y'] for c in wrong if c['age_y'] is not None]
stats.update(
    n_cases=len(cases), n_wrong=len(wrong), n_extra_cost=len(cases) - len(wrong),
    test=dict(Counter(c['test'] for c in wrong)),
    cause=dict(Counter(c['cause'] for c in wrong)),
    median_age=round(statistics.median(ages), 1),
    n_over5=sum(a > 5 for a in ages), n_aged=len(ages),
    n_traced=sum(c['traced'] for c in cases))
json.dump(stats, open(D / 'stats.json', 'w', encoding='utf-8'), indent=1)
with open(D / 'cases.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['pr', 'merged', 'kind', 'area', 'what_was_wrong', 'test_relation', 'test_note',
                'root_cause', 'approximate_age', 'age_traced', 'url'])
    for c in cases:
        w.writerow([c['pr'], c['merged'], c['kind'], c['area'], c['what'], c['test'], c['test_note'],
                    c['cause'], c['age'], c['traced'], f"https://github.com/dealii/dealii/pull/{c['pr']}"])
print(json.dumps(stats, indent=1))
