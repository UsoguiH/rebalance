import json, subprocess
plan=json.load(open('work/plan.json'))
inputs=['src/A_033826.mp4','src/B_033502.mp4']; idx={'A_033826':0,'B_033502':1}
punch=[1.00,1.08,1.01,1.09,1.00,1.07,1.02,1.08]  # alternating punch-in per cut
vf=[];af=[]
for i,p in enumerate(plan):
    k=idx[p['take']]; s,e,d=p['src_in'],p['src_out'],p['dur']
    z0=punch[i%len(punch)]; z1=z0+0.035
    zexpr=f"({z0}+({z1-z0:.3f})*t/{d:.3f})"
    vf.append(f"[{k}:v]trim=start={s}:end={e},setpts=PTS-STARTPTS,fps=30,"
      f"scale=w='trunc(1080*{zexpr}/2)*2':h=-2:eval=frame:flags=lanczos,"
      f"crop=1080:1920:'(iw-1080)/2':'(ih-1920)*0.62',setsar=1[v{i}]")
    af.append(f"[{k}:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS,aresample=48000,pan=mono|c0=0.5*c0+0.5*c1,"
      f"afade=t=in:d=0.012,afade=t=out:st={d-0.012:.3f}:d=0.012[a{i}]")
n=len(plan)
vf.append(''.join(f'[v{i}]' for i in range(n))+f"concat=n={n}:v=1:a=0,format=yuv420p[vcat]")
af.append(''.join(f'[a{i}]' for i in range(n))+f"concat=n={n}:v=0:a=1[acat]")
# grade
vf.append("[vcat]eq=contrast=1.06:saturation=1.05,colorbalance=rs=-0.03:bs=0.05:rm=-0.02:bm=0.04,unsharp=5:5:0.4:5:5:0.0,vignette=angle=PI/6,format=yuv420p[vout]")
fc=';'.join(vf+af)
open('work/fc.txt','w').write(fc)
cmd=['ffmpeg','-y','-hide_banner','-loglevel','error']
for f in inputs: cmd+=['-i',f]
cmd+=['-filter_complex_script','work/fc.txt','-map','[vout]','-r','30','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-an','work/base_video.mp4',
      '-map','[acat]','-c:a','pcm_s16le','work/voice_raw.wav']
print(subprocess.run(cmd,capture_output=True,text=True).stderr[-2000:])
