import json, re
ch=json.load(open('changes.json'))
pats={
 'never_worked':r"never (?:worked|been (?:correct|right|working|tested|used))|has never|did never",
 'latent':r"for (?:many |several |a few )?years|since (?:at least |the )?(?:version|release|\d\.\d|commit|PR|#\d+|it was introduced)|long[- ]standing|went unnoticed|nobody noticed|no one noticed|not noticed|unnoticed|apparently",
 'broken':r"(?:has|had|have) been (?:broken|wrong|incorrect)|was (?:broken|wrong|incorrect)|were (?:broken|wrong|incorrect)",
 'wrong_result':r"wrong (?:result|answer|value|gradient|output|number|sign|index|indices|matrix|solution)s?|incorrect (?:result|answer|value|output|number|sign|solution)s?|gave wrong|returned? (?:a )?wrong|computed wrong|produced? wrong|incorrectly",
 'silent':r"silent(?:ly)?|without (?:an |any )?(?:error|warning|assertion)|no error",
 'untested':r"not (?:been )?tested|untested|no test|not covered|test coverage|wasn't tested|was not tested",
 'regression':r"regression|introduced (?:in|by) #?\d+|broke(?:n)? (?:in|by) #\d+",
 'surprise':r"surpris|astonish|amazing(?:ly)?|shock|wow|oops|embarrass",
}
rows=[]
for l in open('prs.jsonl'):
    d=json.loads(l)
    txt=d['title']+'\n'+'\n'.join(c['subject']+'\n'+c['body'] for c in d['commits'])
    cl='\n'.join(e['text'] for e in ch.get(str(d['pr']),[]))
    full=(txt+'\n'+cl)
    low=full.lower()
    hits={k:len(re.findall(p,low)) for k,p in pats.items()}
    fixed=bool(re.search(r'^\s*fixed:',cl,re.I|re.M)) or bool(re.search(r'\bfix',d['title'].lower()))
    newtest=any(x[0].startswith('A') and x[-1].startswith('tests/') for x in d['files'])
    src=any(x[-1].startswith(('include/','source/')) for x in d['files'])
    score=3*hits['never_worked']+2*hits['latent']+2*hits['broken']+2*hits['wrong_result']+2*hits['silent']+2*hits['untested']+1*hits['regression']+2*hits['surprise']
    score+= (2 if fixed else 0)+(1 if newtest and src else 0)
    rows.append({'pr':d['pr'],'date':d['date'],'title':d['title'].split('\n')[0],'fixed':fixed,'newtest':newtest,'src':src,'hits':{k:v for k,v in hits.items() if v},'score':score,'has_cl':str(d['pr']) in ch})
json.dump(rows,open('screen.json','w'))
import collections
print(len(rows), sum(r['fixed'] for r in rows), sum(r['fixed'] and r['newtest'] and r['src'] for r in rows))
for t in [4,6,8,10]: print(t, sum(r['score']>=t and r['fixed'] for r in rows))
