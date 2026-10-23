# Paths below point at the working folder used while building this; adjust them to rerun.
"""Rotoscope the original: every coloured piece in every frame = a similarity-transformed copy of one
letter, clipped to the angular sectors (around that copy's centre) where the piece is visible."""
import numpy as np, json, sys
from PIL import Image
from scipy import ndimage, optimize
d='/tmp/claude-0/-home-user-rebalance/14085734-e60a-58c7-8bca-4961e3f63675/scratchpad/'
bg=np.array([2,39,19.]); Cc=np.array([205,228,177.]); Gc=np.array([24,199,107.])
Pm=np.linalg.pinv(np.stack([Gc-bg,Cc-bg],1))
masks=np.load(d+'rv/letter_masks.npy')
names=['s','l','a1','a2','c','e']
DS=2; NB=72
def al(i):
    a=np.asarray(Image.open(d+'src/fr/%02d.png'%i).convert('RGB')).astype(float)
    return np.clip((a-bg)@Pm.T,0,1)[::DS,::DS]
def disk(r):
    y,x=np.mgrid[-r:r+1,-r:r+1]; return x*x+y*y<=r*r
fin=np.mean([np.clip((np.asarray(Image.open(d+'src/fr/%02d.png'%i).convert('RGB')).astype(float)-bg)@Pm.T,0,1) for i in range(48,58)],0)[...,1]
H,W=fin[::DS,::DS].shape
YY,XX=np.mgrid[0:H,0:W].astype(float)
GL=[];CEN=[]
for li in range(6):
    m=masks[li]; ys,xs=np.nonzero(m)
    GL.append(np.where(ndimage.binary_dilation(m,iterations=1),fin,0)[::DS,::DS])
    CEN.append((((xs.min()+xs.max())/2)/DS,((ys.min()+ys.max())/2)/DS))
def local(li,prm,sl):
    th,s,tx,ty=prm; cx,cy=CEN[li]
    qx=XX[sl]-cx-tx; qy=YY[sl]-cy-ty
    c,sn=np.cos(np.radians(-th)),np.sin(np.radians(-th))
    lx=(c*qx-sn*qy)/s; ly=(sn*qx+c*qy)/s
    return lx,ly
def predict(li,prm,sl,comp_local_bins=None,comp=None):
    lx,ly=local(li,prm,sl); cx,cy=CEN[li]
    val=ndimage.map_coordinates(GL[li],[ly+cy,lx+cx],order=1,cval=0)
    b=((np.degrees(np.arctan2(ly,lx))%360)/(360/NB)).astype(int)%NB
    if comp is not None:
        occ=np.zeros(NB,bool); occ[np.unique(b[comp & (val>0.5)])]=True
        # close gaps of up to two bins (the wave and the cleanup openings carve thin holes)
        occ=occ|(np.roll(occ,1)&np.roll(occ,-1))|(np.roll(occ,1)&np.roll(occ,-2))|(np.roll(occ,2)&np.roll(occ,-1))
    else: occ=comp_local_bins
    return (val>0.5)&occ[b],occ,val
def fit_comp(comp_full,valid_full,cands,prev):
    ys,xs=np.nonzero(comp_full)
    y0,y1,x0,x1=max(0,ys.min()-70),min(H,ys.max()+70),max(0,xs.min()-70),min(W,xs.max()+70)
    sl=(slice(y0,y1),slice(x0,x1)); comp=comp_full[sl]; valid=valid_full[sl]
    best=None
    for li in cands:
        cx,cy=CEN[li]; mx,my=xs.mean(),ys.mean()
        inits=[[0,1,0,0],[0,1,mx-cx- (GL[li][int(cy),int(cx)]*0),my-cy]]
        for th in (-90,-45,45,90,180):
            inits.append([th,1.2,0,0])
        for p in prev.get(li,[]): inits.insert(0,list(p))
        def loss(p):
            p=[p[0],min(2.8,max(0.5,p[1])),p[2],p[3]]
            pr,_,_=predict(li,p,sl,comp=comp)
            pr&=valid
            u=(pr|comp).sum(); return 1-(pr&comp).sum()/max(u,1)
        for x0_ in inits[:7]:
            r=optimize.minimize(loss,x0_,method='Powell',options={'xtol':0.05,'ftol':1e-3,'maxfev':500})
            if best is None or r.fun<best[0]:
                best=(r.fun,li,[float(r.x[0]),float(min(2.8,max(0.5,r.x[1]))),float(r.x[2]),float(r.x[3])])
    l,li,p=best
    _,occ,_=predict(li,p,sl,comp=comp)
    return dict(letter=int(li),prm=[round(v,3) for v in p],bins=''.join('1' if o else '0' for o in occ),iou=round(1-l,3))
def run(f0,f1,out):
    res={}; prev={'c':{},'g':{},'h':{}}
    for i in range(f0,f1+1):
        A=al(i); g,c=A[...,0],A[...,1]
        gm=g>0.4; wave=ndimage.binary_dilation(gm&~ndimage.binary_opening(gm,disk(3)),iterations=1)
        oc=ndimage.binary_opening((c>0.72)&~wave,disk(1))
        og=ndimage.binary_opening((g>0.6)&(c<0.3)&~wave,disk(1))&~oc
        oh=ndimage.binary_opening((c>0.2)&(c<0.72)&(g<0.35)&~wave,disk(1))&~oc&~og
        pieces=[]
        for cls,obs,valid in (('c',oc,np.ones_like(oc)),('g',og,~oc),('h',oh,~(oc|og))):
            lab,n=ndimage.label(obs)
            newprev={}
            for k in range(1,n+1):
                comp0=lab==k
                if comp0.sum()<40: continue
                explained=np.zeros_like(comp0)
                for rep in range(3):          # overlapping copies of one colour merge into one blob
                    comp=ndimage.binary_opening(comp0&~explained,disk(1))
                    if comp.sum()<(40 if rep==0 else 70): break
                    lab2,n2=ndimage.label(comp)
                    if n2>1:
                        sz=np.bincount(lab2.ravel())[1:]; comp=lab2==(np.argmax(sz)+1)
                    ys,xs=np.nonzero(comp); mx,my=xs.mean(),ys.mean()
                    dist=[np.hypot(mx-CEN[li][0],my-CEN[li][1]) for li in range(6)]
                    cands=list(np.argsort(dist)[:3])
                    r=fit_comp(comp,valid&~explained,cands,prev[cls])
                    if rep>0 and r['iou']<0.45: break
                    r['cls']=cls; r['area']=int(comp.sum())
                    if cls=='h': r['alpha']=round(float(np.median(c[comp])),3)
                    elif cls=='g': r['alpha']=round(float(np.median(g[comp])),3)
                    else: r['alpha']=1.0
                    pieces.append(r); newprev.setdefault(r['letter'],[]).append(r['prm'])
                    occ=np.array([b_=='1' for b_ in r['bins']])
                    pr,_,_=predict(r['letter'],r['prm'],(slice(0,H),slice(0,W)),comp_local_bins=occ)
                    explained|=pr&comp0
            prev[cls]=newprev
        res[i]=pieces
        print('f%d'%i,len(pieces),'pieces, mean iou %.3f'%(np.mean([p['iou'] for p in pieces]) if pieces else 1),
              ' '.join(f"{p['cls']}{names[p['letter']]}:{p['iou']:.2f}" for p in pieces),flush=True)
    json.dump(res,open(out,'w'))
if __name__=='__main__':
    run(int(sys.argv[1]),int(sys.argv[2]),sys.argv[3])
