import json,re
ch=json.load(open('changes.json'))
prs={json.loads(l)['pr']:json.loads(l) for l in open('prs.jsonl')}
noise=re.compile(r'warning|compil|typo|doc(?:umentation|s)?\b|cmake|indent|clang|gcc|msvc|nvcc|icc|cuda build|ci\b|github action|workflow|tutorial text|spelling|include guard|deprecat|tidy|format|lint|unused|header|instantiat|kokkos version|trilinos version|petsc version|build|link(?:er|ing)? error|configure|doxygen|static analy|coverity|sanitizer complaint|-wall|shadow',re.I)
out=[]
for n,d in prs.items():
    title=d['title'].split('\n')[0]
    cl='\n'.join(e['text'] for e in ch.get(str(n),[]))
    msgs=' | '.join(c['subject'] for c in d['commits'])
    fixed=bool(re.search(r'^\s*fixed:',cl,re.I|re.M)) or bool(re.search(r'\bfix|bug|wrong|incorrect|correct\b',title+' '+msgs,re.I))
    src=any(x[-1].startswith(('include/','source/')) for x in d['files'])
    if not (fixed and src): continue
    if noise.search(title) and not re.search(r'^\s*fixed:',cl,re.I|re.M): continue
    newtest=[x[-1] for x in d['files'] if x[0].startswith('A') and x[-1].startswith('tests/') and x[-1].endswith(('.cc','.cu'))]
    out.append({'pr':n,'date':d['date'],'title':title,'commits':msgs[:300],'cl':re.sub(r'\s+',' ',cl.replace('<br>',''))[:700],'newtests':len(newtest),'nsrc':sum(1 for x in d['files'] if x[-1].startswith(('include/','source/')))})
out.sort(key=lambda x:x['pr'])
json.dump(out,open('cands.json','w'),indent=0)
print(len(out), sum(1 for x in out if x['cl']), sum(1 for x in out if x['newtests']))
