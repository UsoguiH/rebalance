# Paths below point at the working folder used while building this; adjust them to rerun.
"""Merge rotoscope results into motion.data.js, keeping the glyph, wave and registered-mark tables.

Clean-ups that make the data transfer to any letter:
  * ownership: a piece that lands on another letter's home is given to that letter
    (the fit can explain the second "a" with the first "a" moved one letter over);
  * slices: angles where the original letter has no ink carry no information, so they
    take the state of the nearest inked angle; otherwise a typed letter that borrows a
    thin letter's motion (the l) would stay mostly hidden;
  * matching: each piece is linked to the piece it becomes in the next frame, so the
    player can interpolate between the original's 25 frames per second.
"""
import json, glob, sys, numpy as np
from scipy import ndimage
d='/tmp/claude-0/-home-user-rebalance/14085734-e60a-58c7-8bca-4961e3f63675/scratchpad/'
pattern=sys.argv[1]; target='/home/user/rebalance/logo-replica/motion.data.js'
R={}
for f in glob.glob(d+'rig/'+pattern): R.update({int(k):v for k,v in json.load(open(f)).items()})
masks=np.load(d+'rv/letter_masks.npy'); DS=2; XH=106.0; NB=72
H,W=masks.shape[1:]; yy,xx=np.mgrid[0:H,0:W]
CEN=[]; INK=[]
for m in masks:
    ys,xs=np.nonzero(m); cx,cy=(xs.min()+xs.max())/2,(ys.min()+ys.max())/2; CEN.append((cx,cy))
    b=((np.degrees(np.arctan2(yy[m]-cy,xx[m]-cx))%360)/(360/NB)).astype(int)%NB
    ink=np.zeros(NB,bool); ink[np.unique(b)]=True
    INK.append(ndimage.binary_dilation(ink,iterations=1))
def fill_inkless(bits,ink):
    b=np.array([c=='1' for c in bits])
    if ink.all(): return b
    out=b.copy(); idx=np.where(ink)[0]
    for k in np.where(~ink)[0]:
        dist=np.minimum((idx-k)%NB,(k-idx)%NB); near=idx[dist==dist.min()]
        out[k]=b[near].any()
    return out
def runs(b):
    n=len(b)
    if b.all(): return [[0,360]]
    if not b.any(): return []
    start=int(np.where(~b)[0][0]); out=[]; k0=None
    for j in range(1,n+1):
        i=(start+j)%n
        if b[i] and k0 is None: k0=i
        if (not b[i] or j==n) and k0 is not None:
            end=i if not b[i] else i+1; a0=k0*5; a1=end*5
            if a1<=a0: a1+=360
            out.append([a0,a1]); k0=None
    return out
frames=[]; kept=0; total=0; relabelled=0
for i in range(1,58):
    fr=[]
    for p in R.get(i,[]):
        total+=1
        if p['area']<60 or p['iou']<0.4: continue
        if i>=45 and p['area']<600: continue
        th,s,tx,ty=p['prm']; cls={'h':0,'g':1,'c':2}[p['cls']]; li=p['letter']
        tx*=DS; ty*=DS
        land=(CEN[li][0]+tx,CEN[li][1]+ty)
        if np.hypot(tx,ty)>0.45*XH:
            k=int(np.argmin([np.hypot(land[0]-c[0],land[1]-c[1]) for c in CEN]))
            if k!=li and np.hypot(land[0]-CEN[k][0],land[1]-CEN[k][1])<0.45*XH:
                tx,ty=land[0]-CEN[k][0],land[1]-CEN[k][1]; li=k; relabelled+=1
        b=fill_inkless(p['bins'],INK[p['letter']])
        rr=runs(b)
        if i>=45 and cls==2: rr=[[0,360]]
        if not rr: continue
        a=min(1,p['alpha']) if cls else min(0.85,p['alpha'])
        fr.append([cls,li,round(th,1),round(s,3),round(tx/XH,4),round(ty/XH,4),round(a,2),rr,b])
        kept+=1
    fr.sort(key=lambda q:q[0]); frames.append(fr)
# link pieces to their continuation in the next frame
def cost(p,q):
    if p[0]!=q[0] or p[1]!=q[1]: return 1e9
    jac=(p[8]&q[8]).sum()/max(1,(p[8]|q[8]).sum())
    dth=abs((p[2]-q[2]+180)%360-180)
    return dth/25+abs(p[3]-q[3])/0.2+np.hypot(p[4]-q[4],p[5]-q[5])/0.2+(1-jac)*2.5
links=0
for i in range(56):
    A,B=frames[i],frames[i+1]
    pairs=sorted((cost(p,q),a,b) for a,p in enumerate(A) for b,q in enumerate(B))
    usedA=set(); usedB=set()
    for c,a,b in pairs:
        if c>3.0: break
        if a in usedA or b in usedB: continue
        usedA.add(a); usedB.add(b); A[a].append(b); links+=1
    for a,p in enumerate(A):
        if len(p)==9: p.append(-1)
for p in frames[56]: p.append(-1)
for fr in frames:
    for p in fr: del p[8]
src=open(target).read(); M=json.loads(src[src.index('=')+1:src.rindex(';')])
M['frames']=frames
M['pieceFormat']='[class 0 ghost|1 green|2 cream, original letter, rotation deg, scale, shift x, shift y (x-heights), opacity, visible slices [[from,to] deg], index of the same piece in the next frame or -1]'
open(target,'w').write(src[:src.index('=')+1]+json.dumps(M,separators=(',',':'))+';\n')
print('kept',kept,'of',total,'relabelled',relabelled,'links',links,'->',len(open(target).read())//1024,'KB')
