function sha256(ascii){function rr(v,a){return(v>>>a)|(v<<(32-a))}var mL=ascii.length*8,i,j,w=[],H=[],K=[],p=Math.pow,res='',pr=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311];
for(i=0;i<64;i++){K[i]=(p(pr[i],1/3)*4294967296)|0;if(i<8)H[i]=(p(pr[i],1/2)*4294967296)|0;}
ascii+='\x80';while(ascii.length%64-56)ascii+='\x00';
for(i=0;i<ascii.length;i++){j=ascii.charCodeAt(i);if(j>>8)return'';w[i>>2]|=j<<((3-i)%4)*8;}
w[w.length]=(mL/4294967296)|0;w[w.length]=mL;
for(j=0;j<w.length;){var ch=w.slice(j,j+=16),oH=H.slice(0);
for(i=0;i<64;i++){var w15=ch[i-15],w2=ch[i-2],a=H[0],e=H[4],
t1=H[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&H[5])^(~e&H[6]))+K[i]+(ch[i]=i<16?ch[i]:(ch[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+ch[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0),
t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&H[1])^(a&H[2])^(H[1]&H[2]));
H=[(t1+t2)|0].concat(H);H[4]=(H[4]+t1)|0;H.pop();}
for(i=0;i<8;i++)H[i]=(H[i]+oH[i])|0;}
for(i=0;i<8;i++)for(j=3;j+1;j--){var b=(H[i]>>(j*8))&255;res+=((b<16)?0:'')+b.toString(16);}return res;}