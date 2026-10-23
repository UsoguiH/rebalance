"""Path parsing and polygon helpers for building the font."""
import re, numpy as np
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

def parse_path(d, samples=12):
    """SVG path with M, c (relative cubic), l, z -> list of closed point rings."""
    toks=re.findall(r'[MmCcLlZz]|-?\d*\.?\d+(?:e-?\d+)?',d)
    rings=[]; cur=[]; i=0; x=y=0; cmd=None
    while i<len(toks):
        t=toks[i]
        if t in 'MmCcLlZz':
            cmd=t; i+=1
            if t in 'Zz':
                if cur: rings.append(np.array(cur)); cur=[]
            continue
        if cmd in 'Mm':
            nx,ny=float(toks[i]),float(toks[i+1]); i+=2
            if cmd=='m': nx+=x; ny+=y
            if cur: rings.append(np.array(cur))
            cur=[(nx,ny)]; x,y=nx,ny; cmd='l' if cmd=='m' else 'L'
        elif cmd in 'Cc':
            v=[float(toks[i+k]) for k in range(6)]; i+=6
            if cmd=='c': v=[v[0]+x,v[1]+y,v[2]+x,v[3]+y,v[4]+x,v[5]+y]
            p0=np.array([x,y]); p1=np.array(v[0:2]); p2=np.array(v[2:4]); p3=np.array(v[4:6])
            for t_ in np.linspace(0,1,samples+1)[1:]:
                mt=1-t_; cur.append(tuple(mt**3*p0+3*mt*mt*t_*p1+3*mt*t_*t_*p2+t_**3*p3))
            x,y=v[4],v[5]
        elif cmd in 'Ll':
            nx,ny=float(toks[i]),float(toks[i+1]); i+=2
            if cmd=='l': nx+=x; ny+=y
            cur.append((nx,ny)); x,y=nx,ny
    if cur: rings.append(np.array(cur))
    return rings

def rings_to_shape(rings):
    """Even-odd rings -> shapely geometry (outer rings minus holes)."""
    polys=[Polygon(r).buffer(0) for r in rings if len(r)>=3]
    polys.sort(key=lambda p:-p.area)
    shape=None
    for p in polys:
        if shape is None: shape=p
        elif shape.contains(p.representative_point()): shape=shape.difference(p)
        else: shape=shape.union(p)
    return shape

def superellipse(cx,cy,rx,ry,n=2.6,steps=240,a0=0,a1=2*np.pi):
    t=np.linspace(a0,a1,steps)
    c,s=np.cos(t),np.sin(t)
    x=cx+rx*np.sign(c)*np.abs(c)**(2/n); y=cy+ry*np.sign(s)*np.abs(s)**(2/n)
    return np.stack([x,y],1)

def sq(cx,cy,rx,ry,n=2.6): return Polygon(superellipse(cx,cy,rx,ry,n))
def rect(x0,y0,x1,y1): return Polygon([(x0,y0),(x1,y0),(x1,y1),(x0,y1)])
def lens(x0,x1,yc,h,bulge=0.5):
    """Pointed horizontal slit: two arcs meeting in sharp points at x0 and x1."""
    t=np.linspace(0,1,80); x=x0+(x1-x0)*t
    w=np.sin(np.pi*t)**bulge*h/2
    return Polygon(np.r_[np.stack([x,yc-w],1),np.stack([x[::-1],yc+w[::-1]],1)])
def poly(pts): return Polygon(pts)
def flipx(g,cx): 
    from shapely import affinity; return affinity.scale(g,xfact=-1,yfact=1,origin=(cx,0))
def flipy(g,cy):
    from shapely import affinity; return affinity.scale(g,xfact=1,yfact=-1,origin=(0,cy))
def rot180(g,cx,cy):
    from shapely import affinity; return affinity.rotate(g,180,origin=(cx,cy))
def move(g,dx,dy=0):
    from shapely import affinity; return affinity.translate(g,dx,dy)
