# Paths below point at the working folder used while building this; adjust them to rerun.
"""Merge rotoscope results into motion.data.js, keeping the glyph, wave and registered-mark tables."""
import json, glob, sys, numpy as np
d='/tmp/claude-0/-home-user-rebalance/14085734-e60a-58c7-8bca-4961e3f63675/scratchpad/'
pattern=sys.argv[1]; target='/home/user/rebalance/logo-replica/motion.data.js'
R={}
for f in glob.glob(d+'rig/'+pattern): R.update({int(k):v for k,v in json.load(open(f)).items()})
masks=np.load(d+'rv/letter_masks.npy'); DS=2; XH=106.0
def runs(bits):
    b=[c=='1' for c in bits]; n=len(b)
    if all(b): return [[0,360]]
    start=next(i for i in range(n) if not b[i]); out=[]; k0=None
    for j in range(1,n+1):
        i=(start+j)%n
        if b[i] and k0 is None: k0=i
        if (not b[i] or j==n) and k0 is not None:
            end=i if not b[i] else i+1; a0=k0*5; a1=end*5
            if a1<=a0: a1+=360
            out.append([a0,a1]); k0=None
    return out
frames=[]; kept=0; total=0
for i in range(1,58):
    fr=[]
    for p in R.get(i,[]):
        total+=1
        if p['area']<60 or p['iou']<0.4: continue
        th,s,tx,ty=p['prm']; cls={'h':0,'g':1,'c':2}[p['cls']]
        a=min(1,p['alpha']) if cls else min(0.85,p['alpha'])
        rr=runs(p['bins'])
        if i>=45:
            if p['area']<600: continue        # stray fragments once the word has settled
            if cls==2: rr=[[0,360]]          # finished letters: no slivers missing
        fr.append([cls,p['letter'],round(th,1),round(s,3),round(tx*DS/XH,4),round(ty*DS/XH,4),round(a,2),rr]); kept+=1
    fr.sort(key=lambda q:q[0]); frames.append(fr)
src=open(target).read(); M=json.loads(src[src.index('=')+1:src.rindex(';')])
M['frames']=frames
open(target,'w').write(src[:src.index('=')+1]+json.dumps(M,separators=(',',':'))+';\n')
print('kept',kept,'of',total,'->',len(open(target).read())//1024,'KB')
