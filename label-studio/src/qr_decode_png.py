"""End-to-end: read the QR back OUT of an exported PNG and decode it."""
import sys
from PIL import Image

EXP=[0]*512; LOG=[0]*256
x=1
for i in range(255):
    EXP[i]=x; LOG[x]=i; x<<=1
    if x&256: x^=0x11d
for j in range(255,512): EXP[j]=EXP[j-255]
def gmul(a,b): return 0 if a==0 or b==0 else EXP[LOG[a]+LOG[b]]
VER={1:(19,7),2:(34,10),3:(55,15),4:(80,20),5:(108,26)}
ALIGN={1:None,2:18,3:22,4:26,5:30}

def fnmap(n,ver):
    fn=[[False]*n for _ in range(n)]
    def mark(cx,cy):
        for dy in range(-4,5):
            for dx in range(-4,5):
                x,y=cx+dx,cy+dy
                if 0<=x<n and 0<=y<n: fn[y][x]=True
    mark(3,3); mark(n-4,3); mark(3,n-4)
    for i in range(n): fn[6][i]=True; fn[i][6]=True
    if ALIGN[ver] is not None:
        a=ALIGN[ver]
        for dy in range(-2,3):
            for dx in range(-2,3): fn[a+dy][a+dx]=True
    for i in range(9): fn[i][8]=True; fn[8][i]=True
    for i in range(8): fn[8][n-1-i]=True; fn[n-1-i][8]=True
    fn[n-8][8]=True
    return fn

def mask_fn(k,x,y):
    return [ (x+y)%2==0, y%2==0, x%3==0, (x+y)%3==0,
             (y//2+x//3)%2==0, ((x*y)%2)+((x*y)%3)==0,
             (((x*y)%2)+((x*y)%3))%2==0, (((x+y)%2)+((x*y)%3))%2==0 ][k]

def decode(m):
    n=len(m); ver=(n-17)//4
    bits=[]
    for i in range(15):
        if i<6: b=m[i][8]
        elif i==6: b=m[7][8]
        elif i==7: b=m[8][8]
        elif i==8: b=m[8][7]
        else: b=m[8][14-i]
        bits.append(b)
    raw=0
    for i in range(14,-1,-1): raw=(raw<<1)|bits[i]
    f=raw^0x5412
    rem=f
    for i in range(14,9,-1):
        if (rem>>i)&1: rem^=0x537<<(i-10)
    assert rem==0,'format BCH failed'
    ec=(f>>13)&3; mask=(f>>10)&7
    assert ec==1,'EC level != L'
    fn=fnmap(n,ver)
    u=[r[:] for r in m]
    for y in range(n):
        for x in range(n):
            if not fn[y][x] and mask_fn(mask,x,y): u[y][x]^=1
    b=[]; up=True; col=n-1
    while col>0:
        if col==6: col-=1
        for r in range(n):
            row=(n-1-r) if up else r
            for c in range(2):
                xx=col-c
                if not fn[row][xx]: b.append(u[row][xx])
        up=not up; col-=2
    nData,nEc=VER[ver]
    cw=[]
    i=0
    while i+8<=len(b) and len(cw)<nData+nEc:
        v=0
        for k in range(8): v=(v<<1)|b[i+k]
        cw.append(v); i+=8
    for s in range(nEc):
        acc=0
        for c in cw: acc=gmul(acc,EXP[s])^c
        assert acc==0, 'RS syndrome %d non-zero'%s
    p=[0]
    def rd(k):
        v=0
        for _ in range(k):
            v=(v<<1)|b[p[0]]; p[0]+=1
        return v
    mode=rd(4); assert mode==4,'mode %d'%mode
    ln=rd(8)
    by=bytes(rd(8) for _ in range(ln))
    return by.decode('utf-8'), ver, mask, n

# ---- sample the symbol out of the exported PNG -----------------------------
png, plate_w, plate_h = sys.argv[1], 466, 884
BLEED_MM, TRIM_W = 3.0, 46.0
PPM = plate_w/TRIM_W
im=Image.open(png).convert('L'); W,H=im.size
bleed_px = BLEED_MM*PPM
scale = W/(plate_w+2*bleed_px)
off = bleed_px*scale
fx,fy,fs = 145,500,176           # QR slot frame in plate px
quiet, n = 4, 29
mod = (fs*scale)/(n+quiet*2)
x0 = fx*scale+off + quiet*mod
y0 = fy*scale+off + quiet*mod
px=im.load()
m=[[1 if px[int(x0+(c+.5)*mod), int(y0+(r+.5)*mod)]<128 else 0 for c in range(n)] for r in range(n)]
txt,ver,mask,nn = decode(m)
print('module px in export : %.2f  (%.3f mm)'%(mod, mod/scale/PPM))
print('decoded from PNG    :', txt)
print('version %d · mask %d · %dx%d modules'%(ver,mask,nn,nn))
