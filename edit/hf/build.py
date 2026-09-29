import json
T=json.load(open('../timeline.json'))
s=open('index.tpl.html').read()
s=s.replace('__TL__',json.dumps(T,ensure_ascii=False))
s=s.replace('__DUR__',str(T['duration'])).replace('__VEND__',str(T['voice_end']))
for i in T['inserts']:
    s=s.replace(f"__{i['id']}_s__",str(i['start'])).replace(f"__{i['id']}_d__",str(round(i['end']-i['start'],3)))
s=s.replace('__outro_s__',str(T['outro']['start'])).replace('__outro_d__',str(round(T['outro']['end']-T['outro']['start'],3)))
s=s.replace('__title_d__',str(T['title']['out']))
open('proj/index.html','w').write(s)
print('built',len(s))
