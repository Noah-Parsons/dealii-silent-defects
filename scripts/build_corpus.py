import subprocess, json, re, sys
import os
R=os.environ.get('DEALII_REPO','dealii')
def g(*a): return subprocess.run(['git','-C',R,*a],capture_output=True,text=True).stdout
log=g('log','--merges','--format=%H%x00%P%x00%ad%x00%s%x00%b%x1e','--date=short')
out=open('prs.jsonl','w')
n=0
for rec in log.split('\x1e'):
    rec=rec.strip('\n')
    if not rec: continue
    H,P,D,S,B=rec.split('\x00')
    m=re.match(r'Merge pull request #(\d+) from (\S+)',S)
    if not m: continue
    num=int(m.group(1))
    if num<15400: continue
    ps=P.split()
    if len(ps)<2: continue
    p1,p2=ps[0],ps[1]
    commits=g('log','--no-merges','--format=%h%x00%an%x00%s%x00%b%x1e',f'{p1}..{p2}')
    cl=[]
    for c in commits.split('\x1e'):
        c=c.strip('\n')
        if not c: continue
        h,an,s,b=c.split('\x00')
        cl.append({'h':h,'author':an,'subject':s,'body':b.strip()})
    files=g('diff','--name-status',p1,H)
    fl=[l.split('\t') for l in files.strip().splitlines() if l]
    out.write(json.dumps({'pr':num,'date':D,'branch':m.group(2),'title':B.strip(),'commits':cl,'files':fl})+'\n')
    n+=1
print(n)
