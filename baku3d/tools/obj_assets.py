import numpy as np, cv2, os
from scipy.ndimage import gaussian_filter, binary_fill_holes, label
img = cv2.imread('panel_clean.png'); H,W = img.shape[:2]
z = np.load('z.npy'); m = cv2.imread('mask.png',0).astype(np.float32)/255.

# --- silhouette: largest component, filled, cleaned, eroded a few px so no backdrop colour bleeds onto the object
b = (gaussian_filter(m,2)>0.45)
seat = np.zeros((H,W),np.uint8)       # throne seat + armrests the figure sits on (lower band of the panel)
cv2.fillPoly(seat,[np.array([(16,896),(230,884),(260,862),(800,862),(842,872),(1010,872),(1024,1256),(16,1256)],np.int32)],255)
b = b | (seat>0)
lab,n = label(b); sizes = np.bincount(lab.ravel()); sizes[0]=0
b = lab==sizes.argmax(); b = binary_fill_holes(b)
b8 = b.astype(np.uint8)*255
b8 = cv2.morphologyEx(b8,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
b8 = cv2.morphologyEx(b8,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
b8 = cv2.erode(b8,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
b8 = (cv2.GaussianBlur(b8,(0,0),1.5)>127).astype(np.uint8)*255
os.makedirs('obj',exist_ok=True); cv2.imwrite('obj/mask.png',b8)

# --- heights: front keeps the relief (face/suit detail); back is a smooth rounded backing
z0 = 0.30
hf = np.clip(z - z0, 0, None); hf = hf/hf.max()
cv2.imwrite('obj/front.png',(hf*255+0.5).astype(np.uint8))
inside = (b8>0).astype(np.float32)
# mask-aware blur so the edges don't fade to zero
num = gaussian_filter(hf*inside,22); den = gaussian_filter(inside,22)+1e-4
hb = num/den
hb = hb*0.85
cv2.imwrite('obj/back_depth.png',(np.clip(hb,0,1)*255+0.5).astype(np.uint8))

# --- back colour: heavily blurred (mask-aware) front colours; the head area becomes hair, not a face
f = img.astype(np.float32)
bk = np.stack([gaussian_filter(f[...,c]*inside,12)/ (gaussian_filter(inside,12)+1e-4) for c in range(3)],-1)
yy,xx = np.mgrid[0:H,0:W]
head = np.clip(1.3 - np.sqrt(((xx-640)/185.)**2 + ((yy-235)/215.)**2), 0, 1)[...,None]   # soft ellipse around head
head = np.clip(head*2.2,0,1)
hair = np.array([222,228,232],np.float32)   # BGR cream-white
noise = gaussian_filter(np.random.RandomState(3).randn(H,W),1.2)*7
hairtex = hair[None,None,:] + noise[...,None] + 10*np.sin(((xx*0.6+yy*1.0)/5.0))[...,None]   # faint comb lines
bk = bk*(1-head) + hairtex*head
# darken a touch so the back reads as shaded cloth
bk = bk*0.93
cv2.imwrite('obj/back_color.jpg',np.clip(bk,0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,90])
cv2.imwrite('obj/color.jpg',img,[cv2.IMWRITE_JPEG_QUALITY,94])
print('done', b.sum()/b.size)
vis = np.hstack([cv2.resize(x,(344,418)) for x in (cv2.cvtColor(b8,cv2.COLOR_GRAY2BGR), cv2.cvtColor((hf*255).astype(np.uint8),cv2.COLOR_GRAY2BGR), cv2.cvtColor((hb*255).astype(np.uint8),cv2.COLOR_GRAY2BGR), np.clip(bk,0,255).astype(np.uint8))])
cv2.imwrite('obj_chk.png',vis)

# --- backdrop: the clean panel with the figure area replaced by inpainted backdrop (that area is hidden behind the object)
mk = cv2.dilate(b8,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
s=0.25; sm = cv2.resize(img,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
mks = cv2.resize(mk,(sm.shape[1],sm.shape[0]),interpolation=cv2.INTER_NEAREST)
fill = cv2.inpaint(sm,mks,12,cv2.INPAINT_TELEA)
fill = cv2.GaussianBlur(cv2.resize(fill,(W,H),interpolation=cv2.INTER_CUBIC),(0,0),6)
a = cv2.GaussianBlur(mk.astype(np.float32)/255.,(0,0),6)[...,None]
bd = (fill*a + img*(1-a)).astype(np.uint8)
cv2.imwrite('obj/backdrop.jpg',bd,[cv2.IMWRITE_JPEG_QUALITY,90])
