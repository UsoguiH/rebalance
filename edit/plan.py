import json, subprocess, re
# speech intervals from silencedetect (-38 dB, d>=0.25)
def speech(take):
    out=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',f'work/{take}.16k.wav','-af','silencedetect=noise=-38dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]
    en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
    dur=float(re.search(r'time=(\d+):(\d+):([\d.]+)',out.split('size=')[-1] if False else out).group(0)[5:].split(':')[-1]) if False else None
    return st,en
KEEP={ # take: list of (speech_start, speech_end) chosen from silence-bounded speech
 'A_033826':[(3.07,4.80),(5.33,5.70),(6.01,6.50),(7.19,8.28),(8.83,13.49),(14.11,16.47),(19.89,20.69),(21.13,21.99),(22.44,24.86)],
 'B_033502':[(0.66,2.42),(3.48,7.56),(9.91,11.11),(12.18,12.94),(13.50,14.51),(14.95,17.13),(17.85,18.52),(18.81,21.81),(22.36,23.11),(23.92,25.32),(25.75,26.95)],
}
PAD_LEAD, PAD_TAIL, MERGE_GAP = 0.10, 0.14, 0.45
segs=[]
for take,iv in KEEP.items():
    cur=None
    for s,e in iv:
        if cur and s-cur[1] < MERGE_GAP: cur[1]=e; continue
        if cur: segs.append(cur)
        cur=[s,e,take]
    segs.append(cur)
# apply pads
out=[]
for s,e,take in segs:
    out.append([round(max(0,s-PAD_LEAD),3),round(e+PAD_TAIL,3),take])
# take A first tail: nothing extra; add end room tone on last
t=0
for o in out:
    o.append(round(t,3)); t+=o[1]-o[0]
plan=[dict(take=o[2],src_in=o[0],src_out=o[1],dur=round(o[1]-o[0],3),t=o[3]) for o in out]
json.dump(plan,open('work/plan.json','w'),indent=1)
print(len(plan),'segments, total %.2fs'%t)
for p in plan: print(p)
