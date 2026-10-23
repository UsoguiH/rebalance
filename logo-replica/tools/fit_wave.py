# Paths below point at the working folder used while building this; adjust them to rerun.
import numpy as np, json
from PIL import Image
from scipy import ndimage, optimize
d='/tmp/claude-0/-home-user-rebalance/14085734-e60a-58c7-8bca-4961e3f63675/scratchpad/'
bg=np.array([2,39,19.]); C=np.array([205,228,177.]); G=np.array([24,199,107.])
P=np.linalg.pinv(np.stack([G-bg,C-bg],1))
X0=354; XH=106.0; BASE=416; HW=5.7   # half thickness of the stroke, px
def disk(r):
    y,x=np.mgrid[-r:r+1,-r:r+1]; return x*x+y*y<=r*r
y0,y1,x0,x1=240,480,330,1040
yy,xx=np.mgrid[y0:y1,x0:x1].astype(float)
def stroke(p):
    yc,A,lam,ph,xa,xb=p
    xs=np.linspace(xa,xb,max(8,int(abs(xb-xa)/3)))
    ys=yc-A*np.cos(2*np.pi*(xs-ph)/lam)
    # distance from each pixel to the polyline (sampled points; dense enough)
    m=np.zeros(xx.shape,bool)
    for x,y in zip(xs,ys):
        r=HW
        ix0,ix1=int(x-r-1)-x0,int(x+r+2)-x0; iy0,iy1=int(y-r-1)-y0,int(y+r+2)-y0
        if ix1<0 or iy1<0 or ix0>=m.shape[1] or iy0>=m.shape[0]: continue
        sl=(slice(max(0,iy0),iy1),slice(max(0,ix0),ix1))
        m[sl]|=(xx[sl]-x)**2+(yy[sl]-y)**2<=r*r
    return m
res=[]; prev=[360,23,160,630,620,740]
for i in range(1,33):
    a=np.asarray(Image.open(d+'src/fr/%02d.png'%i).convert('RGB')).astype(float)[y0:y1,x0:x1]
    A=np.clip((a-bg)@P.T,0,1); g,c=A[...,0],A[...,1]
    wave=(g>0.55)&(g<0.94)&(c<0.3)
    wave=ndimage.binary_opening(wave,disk(1))
    thin=wave&~ndimage.binary_opening(wave,disk(9))
    empty=(g<0.15)&(c<0.15)
    n=thin.sum()
    if n<60: res.append(None); print(i,'none'); continue
    def loss(p):
        if p[5]-p[4]<8 or p[2]<60 or p[2]>400: return 2
        m=stroke(p)
        miss=(thin&~m).sum(); false=(m&empty).sum()
        return (miss+false)/n
    inits=[prev,[prev[0],prev[1],prev[2],prev[3],prev[4]+20,prev[5]+20]]
    ys,xs=np.nonzero(thin); inits.append([ys.mean()+y0,23,165,prev[3],xs.min()+x0,xs.max()+x0])
    best=None
    for x in inits:
        r=optimize.minimize(loss,x,method='Powell',options={'xtol':0.2,'ftol':1e-4,'maxfev':3000})
        if best is None or r.fun<best.fun: best=r
    prev=list(best.x)
    res.append({'p':[round(float(v),2) for v in best.x],'loss':round(float(best.fun),3)})
    print(i,np.round(best.x,1),'loss %.3f n %d'%(best.fun,n),flush=True)
json.dump(res,open(d+'rig/wavefit.json','w'))
