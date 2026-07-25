/* Compact QR generator — byte mode, EC level L, versions 1..5 (single block). */
var QRGen=(function(){
  var EXP=[],LOG=[];
  (function(){var x=1;for(var i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d;}
    for(var j=255;j<512;j++)EXP[j]=EXP[j-255];})();
  function gmul(a,b){return (a===0||b===0)?0:EXP[LOG[a]+LOG[b]];}
  function rsGen(n){var g=[1];for(var i=0;i<n;i++){var ng=new Array(g.length+1).fill(0);
    for(var j=0;j<g.length;j++){ng[j]^=g[j];ng[j+1]^=gmul(g[j],EXP[i]);}g=ng;}return g;}
  function rsEnc(data,n){var g=rsGen(n),res=new Array(n).fill(0);
    for(var k=0;k<data.length;k++){var f=data[k]^res[0];res.shift();res.push(0);
      for(var i=0;i<n;i++)res[i]^=gmul(g[i+1],f);}return res;}
  /* version: [dataCodewords, ecCodewords] for EC-L single block */
  var VER={1:[19,7],2:[34,10],3:[55,15],4:[80,20],5:[108,26]};
  var ALIGN={1:null,2:18,3:22,4:26,5:30};

  function utf8(s){var out=[];for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);
    if(c<128)out.push(c);
    else if(c<2048){out.push(192|(c>>6),128|(c&63));}
    else{out.push(224|(c>>12),128|((c>>6)&63),128|(c&63));}}
    return out;}

  function build(text){
    var bytes=utf8(text),ver=0;
    for(var v=1;v<=5;v++){ if(bytes.length+2<=VER[v][0]){ver=v;break;} }
    if(!ver)throw new Error('QR: texto demasiado largo (máx ~106 caracteres)');
    var nData=VER[ver][0],nEc=VER[ver][1];
    /* bit stream */
    var bits=[];
    function put(val,len){for(var i=len-1;i>=0;i--)bits.push((val>>i)&1);}
    put(4,4); put(bytes.length,8);
    for(var i=0;i<bytes.length;i++)put(bytes[i],8);
    var cap=nData*8;
    for(var t=0;t<4&&bits.length<cap;t++)bits.push(0);
    while(bits.length%8)bits.push(0);
    var dc=[];
    for(var b=0;b<bits.length;b+=8){var byte=0;for(var k=0;k<8;k++)byte=(byte<<1)|bits[b+k];dc.push(byte);}
    var padA=0xEC,padB=0x11,p=0;
    while(dc.length<nData){dc.push(p++%2?padB:padA);}
    var ec=rsEnc(dc,nEc);
    var all=dc.concat(ec);

    /* matrix */
    var n=17+ver*4;
    var m=[],fn=[];
    for(var y=0;y<n;y++){m.push(new Array(n).fill(0));fn.push(new Array(n).fill(false));}
    function setF(x,y,v){m[y][x]=v?1:0;fn[y][x]=true;}
    function finder(cx,cy){
      for(var dy=-4;dy<=4;dy++)for(var dx=-4;dx<=4;dx++){
        var x=cx+dx,y=cy+dy; if(x<0||y<0||x>=n||y>=n)continue;
        var d=Math.max(Math.abs(dx),Math.abs(dy));
        setF(x,y,(d===0||d===1||d===3)?1:0);
      }
    }
    finder(3,3);finder(n-4,3);finder(3,n-4);
    /* timing */
    for(var i2=8;i2<n-8;i2++){setF(i2,6,i2%2===0?1:0);setF(6,i2,i2%2===0?1:0);}
    /* alignment */
    if(ALIGN[ver]!==null){var a=ALIGN[ver];
      for(var dy2=-2;dy2<=2;dy2++)for(var dx2=-2;dx2<=2;dx2++){
        var d2=Math.max(Math.abs(dx2),Math.abs(dy2));
        setF(a+dx2,a+dy2,(d2===0||d2===2)?1:0);}}
    /* dark module + format reserve */
    setF(8,n-8,1);
    for(var i3=0;i3<9;i3++){ if(i3!==6){ if(!fn[i3][8])setF(8,i3,0); if(!fn[8][i3])setF(i3,8,0);} }
    for(var i4=0;i4<8;i4++){ setF(n-1-i4,8,0); setF(8,n-1-i4,0); }
    setF(8,8,0);

    /* data placement */
    var idx=0,bitIdx=0;
    function nextBit(){ if(idx>=all.length)return 0; var bit=(all[idx]>>(7-bitIdx))&1; bitIdx++; if(bitIdx===8){bitIdx=0;idx++;} return bit; }
    var up=true;
    for(var col=n-1;col>0;col-=2){
      if(col===6)col--;
      for(var r=0;r<n;r++){
        var row=up?(n-1-r):r;
        for(var c2=0;c2<2;c2++){
          var x2=col-c2;
          if(fn[row][x2])continue;
          m[row][x2]=nextBit();
        }
      }
      up=!up;
    }
    /* mask + format, pick best by penalty */
    function maskFn(k,x,y){
      switch(k){case 0:return (x+y)%2===0;case 1:return y%2===0;case 2:return x%3===0;
        case 3:return (x+y)%3===0;case 4:return (Math.floor(y/2)+Math.floor(x/3))%2===0;
        case 5:return ((x*y)%2)+((x*y)%3)===0;case 6:return (((x*y)%2)+((x*y)%3))%2===0;
        default:return (((x+y)%2)+((x*y)%3))%2===0;}
    }
    function fmtBits(mask){
      var data=(1<<3)|mask;           /* EC-L = 01 -> value 1 */
      var rem=data;
      for(var i=0;i<10;i++)rem=(rem<<1)^(((rem>>9)&1)*0x537);
      return ((data<<10)|rem)^0x5412;
    }
    function applyFormat(mm,mask){
      var f=fmtBits(mask);
      for(var i=0;i<15;i++){
        var bit=(f>>i)&1;
        /* around top-left */
        if(i<6)mm[i][8]=bit; else if(i===6)mm[7][8]=bit; else if(i===7)mm[8][8]=bit;
        else if(i===8)mm[8][7]=bit; else mm[8][14-i]=bit;
        /* around the other two finders */
        if(i<8)mm[8][n-1-i]=bit; else mm[n-15+i][8]=bit;
      }
      mm[n-8][8]=1;
    }
    function penalty(mm){
      var pen=0,i,j,run,dark=0;
      for(i=0;i<n;i++){ run=1;
        for(j=1;j<n;j++){ if(mm[i][j]===mm[i][j-1])run++; else {if(run>=5)pen+=3+(run-5);run=1;} }
        if(run>=5)pen+=3+(run-5);
      }
      for(j=0;j<n;j++){ run=1;
        for(i=1;i<n;i++){ if(mm[i][j]===mm[i-1][j])run++; else {if(run>=5)pen+=3+(run-5);run=1;} }
        if(run>=5)pen+=3+(run-5);
      }
      for(i=0;i<n-1;i++)for(j=0;j<n-1;j++){
        var s=mm[i][j]+mm[i][j+1]+mm[i+1][j]+mm[i+1][j+1];
        if(s===0||s===4)pen+=3;
      }
      var pat=[1,0,1,1,1,0,1,0,0,0,0],pat2=[0,0,0,0,1,0,1,1,1,0,1];
      function match(arr,st,p){for(var k=0;k<11;k++)if(arr[st+k]!==p[k])return false;return true;}
      for(i=0;i<n;i++){
        var rowA=mm[i],colA=[];for(j=0;j<n;j++)colA.push(mm[j][i]);
        for(j=0;j+11<=n;j++){ if(match(rowA,j,pat)||match(rowA,j,pat2))pen+=40;
          if(match(colA,j,pat)||match(colA,j,pat2))pen+=40; }
      }
      for(i=0;i<n;i++)for(j=0;j<n;j++)dark+=mm[i][j];
      var pct=dark*100/(n*n);
      pen+=Math.floor(Math.abs(pct-50)/5)*10;
      return pen;
    }
    var best=null,bestPen=Infinity;
    for(var k2=0;k2<8;k2++){
      var mm=m.map(function(r){return r.slice();});
      for(var y3=0;y3<n;y3++)for(var x3=0;x3<n;x3++){
        if(!fn[y3][x3]&&maskFn(k2,x3,y3))mm[y3][x3]^=1;
      }
      applyFormat(mm,k2);
      var pn=penalty(mm);
      if(pn<bestPen){bestPen=pn;best=mm;}
    }
    return best;
  }
  return {matrix:build};
})();
if(typeof module!=='undefined')module.exports=QRGen;
