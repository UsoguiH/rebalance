import sys, itertools, numpy as np, cv2, trimesh
src, ratio = sys.argv[1], float(sys.argv[2])
m = trimesh.load(src, force='mesh', process=False)
V = np.asarray(m.vertices).astype(np.float64); F = np.asarray(m.faces)
# --- the foreground mask on the 512 canvas exactly as infer.py laid it out
mk = (cv2.imread('mask.png',0)>127).astype(np.uint8)
ys,xs = np.where(mk>0); y0,y1,x0,x1 = ys.min(),ys.max()+1,xs.min(),xs.max()+1
h,w = y1-y0,x1-x0; s=int(max(h,w)/ratio); oy,ox=(s-h)//2,(s-w)//2
cv = np.zeros((s,s),np.uint8); cv[oy:oy+h,ox:ox+w]=mk[y0:y1,x0:x1]*255
target = cv2.resize(cv,(512,512),interpolation=cv2.INTER_AREA)>127
# --- all 24 proper axis rotations
def rots():
    out=[]
    for perm in itertools.permutations(range(3)):
        for sg in itertools.product([1,-1],repeat=3):
            R=np.zeros((3,3)); 
            for i,p in enumerate(perm): R[i,p]=sg[i]
            if np.linalg.det(R)>0: out.append(R)
    return out
f = 0.5*512/np.tan(np.radians(20)); d=1.9
best=[]
for k,R in enumerate(rots()):
    P = V@R.T          # new coords (X right, Y up, Z toward camera)
    z = d - P[:,2]
    ok = z>0.05
    u = 256 + f*P[:,0]/np.maximum(z,0.05); v = 256 - f*P[:,1]/np.maximum(z,0.05)
    img = np.zeros((512,512),np.uint8)
    pts = np.stack([u,v],1)[F].astype(np.int32)
    cv2.fillPoly(img, list(pts), 255)
    pred = img>0
    iou = (pred&target).sum()/max(1,(pred|target).sum())
    best.append((iou,k,R))
best.sort(key=lambda t:-t[0])
for iou,k,R in best[:4]: print(round(iou,3), k, R.astype(int).tolist())
np.save('best_R.npy', best[0][2]); print('saved best')
