import json,sys,re
ch=json.load(open('changes.json'))
prs={json.loads(l)['pr']:json.loads(l) for l in open('prs.jsonl')}
for n in map(int,sys.argv[1:]):
    d=prs[n]
    print(f"===== #{n} {d['date']} {d['branch']}")
    print('TITLE:',d['title'][:300])
    for e in ch.get(str(n),[]): print('CL:',re.sub(r'\s+',' ',e['text']))
    for c in d['commits'][:6]: print(' C:',c['subject'],'|',re.sub(r'\s+',' ',c['body'])[:400])
    print(' FILES:',', '.join(f"{x[0]}:{x[-1]}" for x in d['files'] if not x[-1].endswith('.output') )[:500])
