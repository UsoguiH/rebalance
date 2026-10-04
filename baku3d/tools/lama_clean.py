import numpy as np, cv2, onnxruntime as ort
img = cv2.imread('panel.png'); H,W = img.shape[:2]
s = ort.InferenceSession('lama.onnx',providers=['CPUExecutionProvider'])
out = img.copy()
def run(x0,y0,mask_fn):
    crop = img[y0:y0+512,x0:x0+512]
    m = np.zeros((H,W),np.uint8); mask_fn(m); mc = m[y0:y0+512,x0:x0+512]
    mc = cv2.dilate(mc,np.ones((9,9),np.uint8))
    rgb = cv2.cvtColor(crop,cv2.COLOR_BGR2RGB).astype(np.float32)/255.
    r = s.run(None,{'image':rgb.transpose(2,0,1)[None],'mask':(mc[None,None]>0).astype(np.float32)})[0][0]
    r = r.transpose(1,2,0)
    if r.max()<=1.5: r=r*255
    r = np.clip(r,0,255).astype(np.uint8); r = cv2.cvtColor(r,cv2.COLOR_RGB2BGR)
    a = cv2.GaussianBlur(mc.astype(np.float32)/255.,(0,0),2)[...,None]
    out[y0:y0+512,x0:x0+512] = (r*a + out[y0:y0+512,x0:x0+512]*(1-a)).astype(np.uint8)
run(0,0,lambda m: cv2.rectangle(m,(64,79),(356,213),255,-1))
def lower(m):
    cv2.rectangle(m,(611,971),(908,1108),255,-1); cv2.circle(m,(990,1152),58,255,-1)
run(521,744,lower)
cv2.imwrite('panel_clean.png',out)
cv2.imwrite('chk.png', np.hstack([cv2.resize(out[40:260,30:400],(740,440)), cv2.resize(out[900:1256,520:1033],(616,428))]))
