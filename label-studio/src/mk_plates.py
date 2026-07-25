from PIL import Image, ImageFilter
import random, math, json
im=Image.open('ls_master/m-001-000.jpg').convert('RGB')
W,H=466,884
CROPS={'fitness':(26,66),'beauty':(532,66),'longevity':(1039,66)}
# (strip_y0, strip_y1, fill_x0, fill_y0, fill_x1, fill_y1)  — variable-data zones
ZONES=[(484,555,140,496,330,547),
       (560,626,158,573,308,611)]
def lum(p): return (p[0]*299+p[1]*587+p[2]*114)/1000
meta={}
for name,(cx,cy) in CROPS.items():
    src=im.crop((cx,cy,cx+W,cy+H)).copy()
    out=src.copy()
    for (sy0,sy1,fx0,fy0,fx1,fy1) in ZONES:
        strip=out.crop((0,sy0,W,sy1))
        ly0,ly1=fy0-sy0,fy1-sy0
        for r in (30,22,16,11,8,5.5,4,3,2,1.4):
            b=strip.filter(ImageFilter.GaussianBlur(r))
            sp=strip.load(); bp=b.load()
            for y in range(ly0,ly1):
                for x in range(fx0,fx1): sp[x,y]=bp[x,y]
        # grain matched to the surrounding artwork
        op=src.load(); sp=strip.load()
        samples=[]
        for y in list(range(sy0+2,fy0-2))+list(range(fy1+2,sy1-2)):
            row=[lum(op[x,y]) for x in range(fx0,fx1)]
            m=sum(row)/len(row); samples+=[v-m for v in row]
        mu=sum(samples)/len(samples)
        sig=max(0.5,min(math.sqrt(sum((v-mu)**2 for v in samples)/len(samples)),3.0))
        random.seed(99)
        for y in range(ly0,ly1):
            for x in range(fx0,fx1):
                n=random.gauss(0,sig); q=sp[x,y]
                sp[x,y]=tuple(max(0,min(255,int(round(q[c]+n)))) for c in range(3))
        out.paste(strip,(0,sy0))
    # ---- edge conditioning: the supplied panels are trimmed flush and the
    # outermost pixels carry a sliver of the photo background. Replace the
    # 3 px ring with the artwork just inside it so bleed-by-edge-extension
    # pulls real artwork outward instead of a white halo.
    op=out.load(); R=3
    for y in range(H):
        sy=min(max(y,R),H-1-R)
        for x in range(R): op[x,y]=op[R,sy]
        for x in range(W-R,W): op[x,y]=op[W-1-R,sy]
    for x in range(W):
        for y in range(R): op[x,y]=op[x,R]
        for y in range(H-R,H): op[x,y]=op[x,H-1-R]
    out.save('ls_master/plate_%s.png'%name)
    p=src.load()
    meta[name]={'band_bg_l':[p[x,520] for x in (40,)][0],'band_bg_r':[p[x,520] for x in (W-40,)][0]}
print(json.dumps(meta))
