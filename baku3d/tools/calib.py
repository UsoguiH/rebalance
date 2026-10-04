import json, numpy as np, cv2, trimesh
ratio=0.7; RES=1024
m = trimesh.load('baku_fig_up.ply', force='mesh', process=False)
V=np.asarray(m.vertices).astype(np.float64); F=np.asarray(m.faces)
# target layout (same as infer.py, at 1024)
mk=(cv2.imread('mask_fig.png',0)>127).astype(np.uint8)
ys,xs=np.where(mk>0); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
h,w=y1-y0,x1-x0; s=int(max(h,w)/ratio); oy,ox=(s-h)//2,(s-w)//2
panel=cv2.imread('panel_clean.png')
canvas=np.full((s,s,3),128,np.uint8); alpha=np.zeros((s,s),np.uint8)
canvas[oy:oy+h,ox:ox+w]=panel[y0:y1,x0:x1]; alpha[oy:oy+h,ox:ox+w]=mk[y0:y1,x0:x1]*255
canvas=cv2.resize(canvas,(RES,RES),interpolation=cv2.INTER_AREA); alpha=cv2.resize(alpha,(RES,RES),interpolation=cv2.INTER_AREA)
target=alpha>127
# silhouette of the mesh with the nominal TripoSR camera
f=0.5*RES/np.tan(np.radians(20)); d=1.9
z=np.maximum(d-V[:,2],0.05); u=RES/2+f*V[:,0]/z; v=RES/2-f*V[:,1]/z
img=np.zeros((RES,RES),np.uint8); cv2.fillPoly(img,list(np.stack([u,v],1)[F].astype(np.int32)),255)
sil=img>0; print('nominal IoU', (sil&target).sum()/(sil|target).sum())
best=(0,1,0,0)
src=img.astype(np.float32)
for sc in np.arange(0.88,1.13,0.01):
    for dx in range(-40,41,4):
        for dy in range(-40,41,4):
            A=np.array([[sc,0,(1-sc)*RES/2+dx],[0,sc,(1-sc)*RES/2+dy]],np.float32)
            wp=cv2.warpAffine(src,A,(RES,RES))>127
            iou=(wp&target).sum()/(wp|target).sum()
            if iou>best[0]: best=(iou,sc,dx,dy)
iou,sc,dx,dy=best
# refine
for sc2 in np.arange(sc-0.01,sc+0.0101,0.0025):
    for dx2 in range(dx-4,dx+5,1):
        for dy2 in range(dy-4,dy+5,1):
            A=np.array([[sc2,0,(1-sc2)*RES/2+dx2],[0,sc2,(1-sc2)*RES/2+dy2]],np.float32)
            wp=cv2.warpAffine(src,A,(RES,RES))>127; i2=(wp&target).sum()/(wp|target).sum()
            if i2>best[0]: best=(i2,sc2,dx2,dy2)
iou,sc,dx,dy=best; print('calibrated IoU',round(iou,3),'scale',round(sc,4),'dx,dy px@1024',dx,dy)
# uv transform: texture uv = ((ndc*0.5+0.5) - 0.5 - shift)/scale + 0.5 ; shift in uv units (y flipped)
json.dump({'scale':float(sc),'dx':float(dx)/RES,'dy':float(-dy)/RES,'iou':float(iou)},open('proj.json','w'))
rgba=np.dstack([canvas,cv2.erode(alpha,np.ones((7,7),np.uint8))])
cv2.imwrite('proj_tex.png',rgba)
print(open('proj.json').read())
