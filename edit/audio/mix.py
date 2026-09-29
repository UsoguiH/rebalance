import numpy as np, wave, subprocess, json
from scipy import signal
SR=48000
def rd(p):
    r=subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True).stdout
    return np.frombuffer(r,dtype=np.float32).reshape(-1,2).astype(np.float64)
def wr(path,X):
    X=np.clip(X,-0.999,0.999); w=wave.open(path,'wb'); w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
    v=(X*(2**23-1)).astype(np.int32); b=np.empty((len(v),2,3),dtype=np.uint8)
    for i in range(3): b[:,:,i]=(v>>(8*i))&0xFF
    w.writeframes(b.tobytes()); w.close()
V=rd('stems/voice.wav'); N=len(V)
M=np.load('work/music.npy')[:N]; S=np.load('work/sfx.npy')[:N]
def pad(x): return np.pad(x,((0,N-len(x)),(0,0))) if len(x)<N else x
M=pad(M); S=pad(S)
# sidechain duck: voice envelope
mono=np.abs(V).mean(1); win=int(0.03*SR)
rms=np.sqrt(np.convolve(mono**2,np.ones(win)/win,'same'))
gate=np.clip((rms-0.01)/0.03,0,1)
def smooth(x,att,rel):
    y=np.zeros_like(x); a=np.exp(-1/(att*SR)); r=np.exp(-1/(rel*SR)); s=0
    for i,v in enumerate(x):
        c=a if v>s else r; s=c*s+(1-c)*v; y[i]=s
    return y
env=smooth(gate,0.02,0.35)
duck=1-0.62*env
# level music relative to voice: target ~ -20 dB under voice when voice active
def lufs(x):
    r=subprocess.run(['ffmpeg','-nostats','-i','pipe:0','-af','ebur128','-f','null','-'],input=x.astype(np.float32).tobytes(),capture_output=True) if False else None
gm=0.34  # music base gain
Mg=M*gm*duck[:,None]
Sg=S*0.55
mix=V+Mg+Sg
print('peaks V %.2f M %.2f S %.2f mix %.2f'%(np.abs(V).max(),np.abs(Mg).max(),np.abs(Sg).max(),np.abs(mix).max()))
wr('stems/music.wav',Mg); wr('stems/sfx.wav',Sg); wr('work/mix_pre.wav',mix)
