import subprocess,re,json,sys,statistics,datetime
import os
R=os.environ.get('DEALII_REPO','dealii')
def g(*a): return subprocess.run(['git','-C',R,*a],capture_output=True,text=True).stdout
mh={}
for line in g('log','--merges','--format=%H %ad %s','--date=short').splitlines():
    m=re.match(r'(\S+) (\S+) Merge pull request #(\d+)',line)
    if m: mh[int(m.group(3))]=(m.group(1),m.group(2))
res={}
for n in map(int,sys.argv[1:]):
    M,date=mh[n]
    p1,p2=g('rev-parse',M+'^1').strip(),g('rev-parse',M+'^2').strip()
    B=g('merge-base',p1,p2).strip()
    files=[f for f in g('diff','--name-only',B,p2).split() if f.startswith(('include/','source/')) and not f.endswith('.inst.in')]
    times=[]
    for f in files:
        d=g('diff','-U0',B,p2,'--',f)
        nlines=len(g('show',f'{B}:{f}').splitlines()) or 1
        for h in re.finditer(r'^@@ -(\d+)(?:,(\d+))? ',d,re.M):
            a=int(h.group(1)); c=int(h.group(2)) if h.group(2) is not None else 1
            if c==0: lo,hi=max(1,a),min(nlines,a+1)
            else: lo,hi=a,a+c-1
            if a==0: continue
            out=g('blame','--porcelain','-L',f'{lo},{hi}',B,'--',f)
            times+= [int(t) for t in re.findall(r'^author-time (\d+)',out,re.M)]
    if not times: res[n]=None; continue
    fixd=datetime.date.fromisoformat(date)
    ages=[(fixd-datetime.date.fromtimestamp(t)).days/365.25 for t in times]
    res[n]={'fix_date':date,'files':files,'n_blamed_commits':len(times),'min_age_y':round(min(ages),1),'median_age_y':round(statistics.median(ages),1),'max_age_y':round(max(ages),1)}
    print(n,res[n]['fix_date'],res[n]['min_age_y'],res[n]['median_age_y'],res[n]['max_age_y'],files,flush=True)
json.dump(res,open('latency.json','w'),indent=1)
