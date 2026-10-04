import sys, numpy as np, trimesh
src, dst = sys.argv[1], sys.argv[2]
m = trimesh.load(src, force='mesh', process=False)
# TripoSR frame: z-up, camera on +x, image-right = +y  ->  three.js frame: Y-up, camera on +Z, right = +X
M = np.array([[0,1,0,0],[0,0,1,0],[1,0,0,0],[0,0,0,1]],float)   # X=y, Y=z, Z=x
m.apply_transform(M)
trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=-0.53, iterations=12)
m.export(dst)
print(dst, len(m.vertices), len(m.faces), m.bounds.round(3).tolist())
