import json, subprocess
import os
R=os.environ.get('DEALII_REPO','dealii')
H={}
mh={}
log=subprocess.run(['git','-C',R,'log','--merges','--format=%H %s'],capture_output=True,text=True).stdout
import re
for line in log.splitlines():
    m=re.match(r'(\S+) Merge pull request #(\d+)',line)
    if m: mh[int(m.group(2))]=m.group(1)
res={}
for l in open('prs.jsonl'):
    d=json.loads(l)
    for x in d['files']:
        if x[0].startswith('A') and x[-1].startswith('doc/news/changes/'):
            r=subprocess.run(['git','-C',R,'show',f"{mh[d['pr']]}:{x[-1]}"],capture_output=True,text=True)
            res.setdefault(d['pr'],[]).append({'path':x[-1],'text':r.stdout})
json.dump(res,open('changes.json','w'))
print(len(res))
