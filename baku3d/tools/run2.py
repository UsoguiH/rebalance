import numpy as np, cv2, onnxruntime as ort, time
img = cv2.imread('panel_clean.png'); H,W = img.shape[:2]
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)/255.
def depth(model, h, w):
    s = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
    r = cv2.resize(rgb,(w,h),interpolation=cv2.INTER_CUBIC)
    r = (r-np.array([0.485,0.456,0.406]))/np.array([0.229,0.224,0.225])
    x = r.transpose(2,0,1)[None].astype(np.float32)
    t=time.time(); d = s.run(None,{'pixel_values':x})[0][0]; print(model, time.time()-t)
    return cv2.resize(d,(W,H),interpolation=cv2.INTER_CUBIC)
d = depth('depth_large.onnx', 14*72, 14*58)
np.save('depth_large.npy', d)
dn=(d-d.min())/(d.max()-d.min()); cv2.imwrite('depth_large.png',(dn*255).astype(np.uint8))
# mask
s2 = ort.InferenceSession('seg_RMBG-1.4.onnx')
r = cv2.resize(rgb,(1024,1024),interpolation=cv2.INTER_AREA); r=(r-0.5)
m = s2.run(None,{s2.get_inputs()[0].name:r.transpose(2,0,1)[None].astype(np.float32)})[0][0,0]
m = cv2.resize(m,(W,H),interpolation=cv2.INTER_CUBIC); m=(m-m.min())/(m.max()-m.min())
cv2.imwrite('mask.png',(m*255).astype(np.uint8))
dc=cv2.applyColorMap((dn*255).astype(np.uint8),cv2.COLORMAP_INFERNO)
cv2.imwrite('viz2.png', np.hstack([cv2.resize(x,(517,628)) for x in (img,dc,cv2.cvtColor((m*255).astype(np.uint8),cv2.COLOR_GRAY2BGR))]))
