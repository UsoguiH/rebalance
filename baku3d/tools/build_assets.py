import numpy as np, cv2, os
from scipy.ndimage import gaussian_filter
img = cv2.imread('panel_clean.png'); H,W = img.shape[:2]
d = np.load('depth_large.npy'); dn=(d-d.min())/(d.max()-d.min())
m = cv2.imread('mask.png',0).astype(np.float32)/255.
m = np.clip((m-0.25)/0.5,0,1); m = gaussian_filter(m,2)
L = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32)/255.

# --- fused height field: character in front of a flatter backdrop, plus artwork-driven micro relief
base = gaussian_filter(dn,1.5)
bg   = 0.05 + 0.10*base                     # wall/throne posts sit just behind the figure
fg   = 0.18 + 0.82*base
z    = m*fg + (1-m)*bg
detail = gaussian_filter(L,3.2) - gaussian_filter(L,26)   # dark creases/ink -> inward, highlights -> outward
face_boost = np.zeros_like(L)                              # extra relief on head/hand region from the cheek up
yy,xx = np.mgrid[0:H,0:W]
head = np.exp(-(((xx-640)/150.)**2 + ((yy-250)/190.)**2))
z = z + (0.030 + 0.050*head)*detail*m
z = gaussian_filter(z,1.0)
z = (z-z.min())/(z.max()-z.min())
np.save('z.npy', z)

os.makedirs('out',exist_ok=True)
cv2.imwrite('out/depth.png',(z*255+0.5).astype(np.uint8))
cv2.imwrite('out/color.jpg',img,[cv2.IMWRITE_JPEG_QUALITY,93])

# --- normal map from the float height (strength matches viewer depth scale ~0.5 units over 1.0 width)
zs = gaussian_filter(z,2.6)*0.50   # height in 'width units'
dx = np.gradient(zs,axis=1)*W; dy = np.gradient(zs,axis=0)*W   # slope per pixel
nx,ny,nz = -dx, dy, np.ones_like(dx)
n = np.sqrt(nx**2+ny**2+nz**2); nx/=n; ny/=n; nz/=n
nm = np.stack([(nz*0.5+0.5),(ny*0.5+0.5),(nx*0.5+0.5)],-1)   # BGR for imwrite -> RGB = (nx,ny,nz)
cv2.imwrite('out/normal.png',(nm*255+0.5).astype(np.uint8))

# --- back layer: the backdrop with the figure removed (revealed at silhouettes while orbiting)
s=0.25; sm = cv2.resize(img,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
mk = cv2.resize((m>0.15).astype(np.uint8)*255,(sm.shape[1],sm.shape[0]),interpolation=cv2.INTER_NEAREST)
mk = cv2.dilate(mk,np.ones((9,9),np.uint8))
bgimg = cv2.inpaint(sm,mk,18,cv2.INPAINT_TELEA)
bgimg = cv2.GaussianBlur(cv2.resize(bgimg,(W,H),interpolation=cv2.INTER_CUBIC),(0,0),5)
cv2.imwrite('out/back.jpg',bgimg,[cv2.IMWRITE_JPEG_QUALITY,88])
cv2.imwrite('out/mask.png',(m*255).astype(np.uint8))
print('ok',W,H,z.min(),z.max())
cv2.imwrite('chk2.png', np.hstack([cv2.resize(x,(400,486)) for x in (cv2.cvtColor((z*255).astype(np.uint8),cv2.COLOR_GRAY2BGR), (nm*255).astype(np.uint8), bgimg)]))
