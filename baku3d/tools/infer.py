import sys, time, numpy as np, torch, trimesh
sys.path.insert(0,'TripoSR'); import types; sys.modules['rembg']=types.ModuleType('rembg')
from PIL import Image
from tsr.system import TSR
torch.set_num_threads(4)
RES = int(sys.argv[1]) if len(sys.argv)>1 else 192
RATIO = float(sys.argv[2]) if len(sys.argv)>2 else 0.85
THR = float(sys.argv[3]) if len(sys.argv)>3 else 25.0
TAG = sys.argv[4] if len(sys.argv)>4 else str(RES)
img = np.array(Image.open('panel_clean.png').convert('RGB')).astype(np.float32)/255.
m = np.array(Image.open('mask.png').convert('L')).astype(np.float32)/255.
m = (m>0.5).astype(np.float32)
# crop to foreground bbox, pad to square (foreground ratio 0.85), composite on grey like TripoSR's run.py
ys,xs = np.where(m>0); y0,y1,x0,x1 = ys.min(),ys.max()+1,xs.min(),xs.max()+1
crop = img[y0:y1,x0:x1]; mc = m[y0:y1,x0:x1,None]
h,w = mc.shape[:2]; s = int(max(h,w)/RATIO)
canvas = np.full((s,s,3),0.5,np.float32); 
oy,ox = (s-h)//2,(s-w)//2
canvas[oy:oy+h,ox:ox+w] = crop*mc + 0.5*(1-mc)
im = Image.fromarray((canvas*255).astype(np.uint8)).resize((512,512),Image.LANCZOS)
im.save(f'tsr_input_{TAG}.png'); print('input', im.size, flush=True)
t=time.time()
model = TSR.from_pretrained('.', config_name='config.yaml', weight_name='model.ckpt')
model.renderer.set_chunk_size(4096); model.to('cpu'); print('loaded', time.time()-t, flush=True)
t=time.time()
with torch.no_grad():
    codes = model([im], device='cpu')
print('scene codes', time.time()-t, flush=True); t=time.time()
meshes = model.extract_mesh(codes, True, resolution=RES, threshold=THR)
print('mesh', time.time()-t, flush=True)
mesh = meshes[0]
mesh.export(f'baku_tsr_{TAG}.obj'); mesh.export(f'baku_tsr_{TAG}.glb')
print('verts', len(mesh.vertices), 'faces', len(mesh.faces), 'bounds', mesh.bounds.tolist(), flush=True)
