import json, numpy as np, subprocess, wave
from scipy import signal
SR=48000
TL=json.load(open('timeline.json')); DUR=TL['duration']; N=int(DUR*SR)
rng=np.random.default_rng(7)
def t_(n): return np.arange(int(n*SR))/SR
def env_ad(n,a,d,curve=4):
    t=t_(n); e=np.minimum(t/max(a,1e-4),1)*np.exp(-curve*t/d); return e
def lp(x,fc,order=2): return signal.sosfilt(signal.butter(order,fc,'low',fs=SR,output='sos'),x)
def hp(x,fc,order=2): return signal.sosfilt(signal.butter(order,fc,'high',fs=SR,output='sos'),x)
def bp(x,lo,hi): return signal.sosfilt(signal.butter(2,[lo,hi],'band',fs=SR,output='sos'),x)
def place(buf,x,t,pan=0.0,gain=1.0):
    i=int(t*SR); x=x[:max(0,N-i)]
    if len(x)==0: return
    l=np.sqrt(0.5*(1-pan)); r=np.sqrt(0.5*(1+pan))
    buf[i:i+len(x),0]+=x*gain*l; buf[i:i+len(x),1]+=x*gain*r
# ---------------- SFX ----------------
def sweep_noise(n,f0,f1,q_bw=0.5,peak=0.5):
    x=rng.standard_normal(int(n*SR)); t=t_(n); k=len(t)
    f=f0*(f1/f0)**(np.linspace(0,1,k))
    # time-varying state-variable bandpass
    y=np.zeros(k); lo=bpv=0.0
    for i in range(k):
        F=2*np.sin(np.pi*min(f[i],SR/6)/SR); Q=1.0/(q_bw*2)
        lo+=F*bpv; hi=x[i]-lo-Q*bpv; bpv+=F*hi; y[i]=bpv
    env=np.sin(np.pi*np.clip(t/n,0,1)**(peak*2))**1.5
    y=y*env; return y/np.max(np.abs(y)+1e-9)
def tone(f,n,a=0.003,d=0.2,harm=(1,),amps=(1,),curve=5):
    t=t_(n); x=sum(A*np.sin(2*np.pi*f*h*t) for h,A in zip(harm,amps)); return x*env_ad(n,a,d,curve)
def bell(f,n=0.9,d=0.5): return tone(f,n,0.002,d,(1,2.01,3.02,4.2),(1,0.45,0.2,0.1),6)
def sfx(kind):
    if kind=='whoosh': return 0.9*sweep_noise(0.55,350,5200,0.7,0.55)
    if kind=='whoosh_up': return 0.8*sweep_noise(0.7,250,7000,0.8,0.8)
    if kind=='whoosh_down': return 0.7*sweep_noise(0.45,6000,400,0.7,0.35)
    if kind=='swipe': return 0.75*sweep_noise(0.32,600,6000,0.9,0.5)
    if kind=='pop':
        t=t_(0.09); f=420+700*np.exp(-t*40); ph=2*np.pi*np.cumsum(f)/SR
        return 0.9*np.sin(ph)*np.exp(-t*38)
    if kind=='tick':
        n=int(0.05*SR); nz=hp(rng.standard_normal(n),2500)*np.exp(-t_(0.05)*160)
        return 0.6*nz/np.max(np.abs(nz))+0.3*tone(1900,0.05,0.001,0.02,curve=8)
    if kind=='correct':
        L=int(1.2*SR); out=np.zeros(L)
        for f,o in ((1047,0),(1319,0.09),(1568,0.18)):
            b=bell(f,0.9,0.5)*0.55; i=int(o*SR); out[i:i+len(b)]+=b[:L-i]
        return out
    if kind=='chime':
        L=int(1.6*SR); out=np.zeros(L)
        for f,o in ((784,0),(1047,0.11),(1319,0.22),(1568,0.36)):
            b=bell(f,1.2,0.7)*0.5; i=int(o*SR); out[i:i+len(b)]+=b[:L-i]
        return out
    if kind=='hit':
        t=t_(0.8); f=110*np.exp(-t*5)+38; ph=2*np.pi*np.cumsum(f)/SR
        boom=np.sin(ph)*np.exp(-t*4.5)
        nz=lp(rng.standard_normal(len(t)),1800)*np.exp(-t*14)*0.5
        sh=bell(2093,0.7,0.5)*0.15
        return 0.95*boom+nz+np.pad(sh,(0,len(t)-len(sh)))[:len(t)]
    if kind=='logo':
        L=int(1.6*SR); out=np.zeros(L)
        for f,o in ((784,0),(1047,0.09),(1319,0.18),(2093,0.27)):
            b=bell(f,1.3,0.9)*0.55; i=int(o*SR); out[i:i+len(b)]+=b[:L-i]
        sp=hp(rng.standard_normal(L),6000)*np.exp(-t_(1.6)*3.2)*0.05
        return out+sp
    raise KeyError(kind)
S=np.zeros((N,2))
pans={'pop':0.0}
for ev in TL['sfx']:
    x=sfx(ev['type']); g={'whoosh':0.55,'whoosh_up':0.5,'whoosh_down':0.45,'swipe':0.5,'pop':0.5,'tick':0.45,'correct':0.5,'chime':0.55,'hit':0.85,'logo':0.6}[ev['type']]
    place(S,x,ev['t'],pan=0.0,gain=g)
np.save('work/sfx.npy',S)
# ---------------- MUSIC ----------------
BPM=100; beat=60/BPM; bar=4*beat
M=np.zeros((N,2))
note=lambda m: 440*2**((m-69)/12)
chords=[(48,[60,64,67,71]),(45,[57,60,64,67]),(41,[57,60,64,65+0]),(43,[59,62,65,67])]  # Cmaj7, Am7, Fmaj7(ish), G
chords[2]=(41,[57,60,64,65]); 
nbars=int(np.ceil(DUR/bar))
def adsr_block(n,a,r):
    t=t_(n); return np.minimum(t/a,1)*np.minimum((n-t)/r,1)
for b in range(nbars):
    t0=b*bar; root,tones=chords[b%4]; loud=1.0 if t0>=bar*1 else 0.6
    # pad
    L=bar+0.6; tt=t_(L); pad=np.zeros(len(tt))
    for m in tones:
        for det in (-0.07,0.0,0.07):
            f=note(m)*2**(det/12); pad+=signal.sawtooth(2*np.pi*f*tt)*0.1
    pad=lp(pad,1400)*adsr_block(L,0.5,0.6)*(0.55+0.15*np.sin(2*np.pi*0.25*tt))
    place(M,pad,t0,gain=0.6*loud)
    # bass on beats 1, 2.5(&), 3
    for off,dur in ((0,beat*1.4),(beat*2,beat*0.9),(beat*3.0,beat*0.9)):
        n=dur; bt=tone(note(root),n,0.01,n*0.9,(1,2),(1,0.25),2.5)
        place(M,bt,t0+off,gain=0.55*loud)
    # arp plucks 8ths
    seq=[0,1,2,3,2,1,2,3]
    for k in range(8):
        m=tones[seq[k]]+12; tp=t0+k*beat/2
        pl=tone(note(m),0.5,0.002,0.22,(1,2,3),(1,0.3,0.12),6)+0.4*signal.sawtooth(2*np.pi*note(m)*t_(0.5))*env_ad(0.5,0.002,0.12,7)*0.2
        pl=lp(pl,3800)
        place(M,pl,tp,pan=(-0.35 if k%2==0 else 0.35),gain=0.34*(1.0 if k%4==0 else 0.75)*(1 if b>=1 else 0.6))
    # drums from bar 2
    if b>=1:
        for k in (0,2):
            tt2=t_(0.35); f=140*np.exp(-tt2*28)+46; ph=2*np.pi*np.cumsum(f)/SR
            kick=np.sin(ph)*np.exp(-tt2*11); place(M,kick,t0+k*beat,gain=0.8)
        place(M,tone(0,0.01),t0)  # noop
        for k in (1,3):
            cl=hp(rng.standard_normal(int(0.25*SR)),1200); cl=bp(cl,1200,6500)*env_ad(0.25,0.001,0.09,6)
            place(M,cl/np.max(np.abs(cl)),t0+k*beat,gain=0.33)
        for k in range(8):
            hh=hp(rng.standard_normal(int(0.08*SR)),7000)*env_ad(0.08,0.001,0.03,8)
            place(M,hh/np.max(np.abs(hh)),t0+k*beat/2+ (0.012 if k%2 else 0),gain=(0.16 if k%2 else 0.09),pan=0.15)
# soft end: fade out from 38.3
t=np.arange(N)/SR
fade=np.clip((DUR-t)/(DUR-38.4),0,1)**1.5; fadein=np.clip(t/0.8,0,1)
M*= (fade*fadein)[:,None]
# lo-fi warmth: gentle lowpass + saturation
for c in (0,1): M[:,c]=lp(M[:,c],9500,2)
M=np.tanh(M*1.3)/1.3
M/=np.max(np.abs(M))
np.save('work/music.npy',M)
def wr(path,X,peak=0.98):
    X=np.clip(X,-peak,peak); w=wave.open(path,'wb'); w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
    v=(X*(2**23-1)).astype(np.int32); b=np.empty((len(v),2,3),dtype=np.uint8)
    for i in range(3): b[:,:,i]=(v>>(8*i))&0xFF
    w.writeframes(b.tobytes()); w.close()
wr('work/music_raw.wav',M*0.9); wr('work/sfx_raw.wav',S/max(1,np.max(np.abs(S))))
print('ok',N/SR)
