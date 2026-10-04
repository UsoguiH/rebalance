import numpy as np, cv2
from scipy.ndimage import gaussian_filter1d
img = cv2.imread('panel.png'); H,W = img.shape[:2]
out = img.copy()
def vinterp(x0,x1,y0,y1,blur=0,keep=()):
    top = img[y0-8:y0-2].astype(np.float32).mean(axis=0); bot = img[y1+3:y1+9].astype(np.float32).mean(axis=0)
    if blur:
        tb = gaussian_filter1d(top,blur,axis=0); bb = gaussian_filter1d(bot,blur,axis=0)
        for (a,b) in keep: tb[a:b]=top[a:b]; bb[a:b]=bot[a:b]
        top,bot = tb,bb
    t = ((np.arange(y0,y1+1)-y0)/(y1-y0))[:,None]
    for x in range(x0,x1+1):
        out[y0:y1+1,x] = (top[x][None,:]*(1-t)+bot[x][None,:]*t).astype(np.uint8)
# box 1: wall + two gold posts. keep posts sharp, smooth the wall
vinterp(64,356,79,213,blur=5,keep=[(138,228)])
# box 2 + icon: Telea for the dark seat/trouser part ...
# dark shadow under the crossed leg: hem colour -> black -> seat colour
y0,y1,x0,x1 = 971,1108,611,850
top = img[y0-8:y0-2].astype(np.float32).mean(axis=0); bot = img[y1+3:y1+9].astype(np.float32).mean(axis=0)
black = np.array([18,8,12],np.float32)
for x in range(x0,x1+1):
    for y in range(y0,y1+1):
        t=(y-y0)/(y1-y0)
        if t<0.18: c = top[x]*(1-t/0.18)+black*(t/0.18)
        elif t<0.55: c = black
        else: c = black*(1-(t-0.55)/0.45)+bot[x]*((t-0.55)/0.45)
        out[y,x]=c.astype(np.uint8)
blk=cv2.GaussianBlur(out[y0:y1+1,x0:x1+1],(0,0),4)
a=np.ones((y1-y0+1,x1-x0+1),np.float32)
f=26
for i in range(f):
    w=(i+1)/(f+1)
    a[i,:]=np.minimum(a[i,:],w); a[-1-i,:]=np.minimum(a[-1-i,:],w); a[:,i]=np.minimum(a[:,i],w); a[:,-1-i]=np.minimum(a[:,-1-i],w)
a=a[...,None]
out[y0:y1+1,x0:x1+1]=(blk*a+img[y0:y1+1,x0:x1+1]*(1-a)).astype(np.uint8) if False else (blk*a+cv2.GaussianBlur(img,(0,0),30)[y0:y1+1,x0:x1+1]*(1-a)).astype(np.uint8)
# ... vertical continuation for right strip (gold armrest/post) and the icon area
img2 = out.copy()
def vinterp2(src,x0,x1,y0,y1):
    top = src[y0-8:y0-2].astype(np.float32).mean(axis=0); bot = src[y1+3:y1+9].astype(np.float32).mean(axis=0)
    t = ((np.arange(y0,y1+1)-y0)/(y1-y0))[:,None]
    for x in range(x0,x1+1):
        out[y0:y1+1,x] = (top[x][None,:]*(1-t)+bot[x][None,:]*t).astype(np.uint8)
vinterp2(img2,851,908,971,1108)
vinterp2(img2,925,1032,1088,1212)
cv2.imwrite('panel_clean.png',out)
# crops for inspection
cv2.imwrite('chk.png', np.hstack([cv2.resize(out[60:240,40:380],(680,360)), cv2.resize(out[940:1256,560:1033],(540,360))]))
