(() => {
  "use strict";
  const A4 = 440;
  const noteNames = ["دو","دو♯","ري","ري♯","مي","فا","فا♯","صول","صول♯","لا","لا♯","سي"];
  const presets = {
    oud: {
      label:"العود",
      tunings:[
        {id:"arabic-c",name:"شائع: دو–فا–لا–ري–صول–دو",note:"ترتيب شائع من القرار إلى الجواب؛ تختلف أوتار الدوزان بحسب المدرسة وعدد الأوتار.",strings:[["دو", "C2",65.406],["فا","F2",87.307],["لا","A2",110],["ري","D3",146.832],["صول","G3",195.998],["دو","C4",261.626]]},
        {id:"arabic-f",name:"بديل: فا–لا–ري–صول–دو–فا",note:"بديل شائع لدى بعض العازفين، وليس قاعدة عامة.",strings:[["فا","F2",87.307],["لا","A2",110],["ري","D3",146.832],["صول","G3",195.998],["دو","C4",261.626],["فا","F4",349.228]]}
      ]},
    guitar:{label:"الجيتار",tunings:[
      {id:"standard",name:"الضبط القياسي E A D G B E",note:"الضبط القياسي للجيتار ذي الستة أوتار، من الوتر السادس الغليظ إلى الأول الرفيع.",strings:[["مي","E2",82.407],["لا","A2",110],["ري","D3",146.832],["صول","G3",195.998],["سي","B3",246.942],["مي","E4",329.628]]},
      {id:"drop-d",name:"Drop D",note:"مثل القياسي مع خفض الوتر السادس إلى ري.",strings:[["ري","D2",73.416],["لا","A2",110],["ري","D3",146.832],["صول","G3",195.998],["سي","B3",246.942],["مي","E4",329.628]]}
    ]},
    buzuq:{label:"البزق",tunings:[
      {id:"common",name:"ترتيب ابتدائي قابل للتعديل",note:"توجد اختلافات واسعة في البزق بعدد الأوتار وأبعادها والتقاليد المحلية؛ اعتبر هذا الترتيب نقطة بداية فقط وعدّله حسب آلتك.",strings:[["صول","G2",97.999],["ري","D3",146.832],["لا","A3",220],["ري","D4",293.665]]},
      {id:"fifths",name:"ضبط خماسي ابتدائي",note:"توزيع تقريبي للتجربة وليس معياراً موحداً للبزق.",strings:[["دو","C3",130.813],["صول","G3",195.998],["ري","D4",293.665],["لا","A4",440]]}
    ]},
    violin:{label:"الكمان الغربي",tunings:[
      {id:"standard",name:"الضبط القياسي G D A E",note:"أربعة أوتار من الغليظ إلى الرفيع.",strings:[["صول","G3",195.998],["ري","D4",293.665],["لا","A4",440],["مي","E5",659.255]]}
    ]},
    easternViolin:{label:"الكمان الشرقي",tunings:[
      {id:"common",name:"الدوزان الشرقي: صول–ري–صول–ري (G D G D)",note:"الدوزان الشرقي المعتمد هنا من الوتر الغليظ إلى الرفيع: صول، ري، صول، ري.",strings:[["صول","G3",195.998],["ري","D4",293.665],["صول","G4",391.995],["ري","D5",587.33]]},
      {id:"custom",name:"ضبط مخصص",note:"يمكنك تعديل تردد كل وتر بالنقر المزدوج على بطاقة الوتر.",strings:[["صول","G3",195.998],["ري","D4",293.665],["صول","G4",391.995],["ري","D5",587.33]]}
    ]}
  };
  const $ = id => document.getElementById(id);
  const state = {instrument:"oud",tuningIndex:0,stringIndex:0,stream:null,context:null,analyser:null,buffer:null,raf:0,selectedFrequency:0};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  function currentTuning(){return presets[state.instrument].tunings[state.tuningIndex];}
  function currentStrings(){return currentTuning().strings;}
  function renderTuning(){
    const select=$("tuningSelect"),list=$("stringList");
    select.innerHTML="";
    presets[state.instrument].tunings.forEach((t,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=t.name;select.append(o);});
    state.tuningIndex=0;state.stringIndex=0;select.value="0";
    $("tuningNote").textContent=currentTuning().note;
    renderStrings();
  }
  function renderStrings(){
    const list=$("stringList");list.innerHTML="";
    currentStrings().forEach((s,i)=>{
      const b=document.createElement("button");b.type="button";b.className="string-item"+(i===state.stringIndex?" active":"");
      b.innerHTML='<span class="string-note"></span><span class="string-meta"><b></b><small>اضغط لاختيار الوتر · انقر مرتين لتعديل التردد</small></span><span class="string-hz"></span>';
      b.querySelector(".string-note").textContent=s[0];
      b.querySelector(".string-meta b").textContent="الوتر "+(i+1)+" · "+s[1];
      b.querySelector(".string-hz").textContent=s[2].toFixed(2)+" Hz";
      b.addEventListener("click",()=>{state.stringIndex=i;renderStrings();});
      b.addEventListener("dblclick",()=>editFrequency(i));
      list.append(b);
    });
    state.selectedFrequency=currentStrings()[state.stringIndex][2];
  }
  function editFrequency(i){
    const s=currentStrings()[i],answer=window.prompt("أدخل التردد الجديد للوتر "+s[1]+" بوحدة Hz:",String(s[2]));
    if(answer===null)return;
    const value=Number(answer);
    if(!Number.isFinite(value)||value<20||value>2000){window.alert("أدخل رقماً بين 20 و2000 Hz.");return;}
    s[2]=value;s[1]=frequencyToNote(value).name+frequencyToNote(value).octave;
    s[0]=frequencyToNote(value).name;renderStrings();
    $("guidance").textContent="تم تحديث تردد الوتر. سيُستخدم هذا المرجع في القياس والنغمة المسموعة.";
  }
  function frequencyToNote(freq){
    const exactMidi=69+12*Math.log2(freq/A4);
    const midi=Math.round(exactMidi*2)/2;
    const name=noteName(midi),octave=Math.floor(midi/12)-1;
    return {midi,name,octave,frequency:A4*Math.pow(2,(midi-69)/12)};
  }
  function updateMeter(cents){
    $("meterNeedle").style.left=(50+clamp(cents,-50,50))+"%";
    $("centsValue").textContent=(cents>0?"+":"")+Math.round(cents)+" سنت";
    $("centsValue").style.color=Math.abs(cents)<=5?"var(--green)":"var(--gold)";
  }
  function clearReading(){
    $("noteName").textContent="—";$("noteOctave").textContent="";$("frequency").textContent="—";$("centsValue").textContent="— سنت";$("meterNeedle").style.left="50%";$("pitchState").textContent="بانتظار الصوت";
  }
  function autoCorrelate(buf,sampleRate){
    // Downsample by two, then run a bounded YIN difference search.
    // This avoids the previous full O(n^2) autocorrelation on every animation frame.
    const size=Math.floor(buf.length/2);
    if(size<8)return -1;
    const data=new Float32Array(size);
    let rms=0;
    for(let i=0;i<size;i++){
      const value=(buf[i*2]+buf[i*2+1])*.5;
      data[i]=value;rms+=value*value;
    }
    rms=Math.sqrt(rms/size);
    if(rms<.008)return -1;
    const rate=sampleRate/2;
    const minLag=Math.max(2,Math.floor(rate/1200));
    const maxLag=Math.min(size-2,Math.ceil(rate/35));
    if(maxLag<=minLag)return -1;
    const diff=new Float32Array(maxLag+1);
    const cmnd=new Float32Array(maxLag+1);
    const count=size-maxLag;
    for(let lag=1;lag<=maxLag;lag++){
      let sum=0;
      for(let j=0;j<count;j++){
        const delta=data[j]-data[j+lag];
        sum+=delta*delta;
      }
      diff[lag]=sum;
    }
    let cumulative=0;
    for(let lag=1;lag<=maxLag;lag++){
      cumulative+=diff[lag];
      cmnd[lag]=cumulative>0?diff[lag]*lag/cumulative:1;
    }
    let chosen=-1;
    for(let lag=minLag;lag<=maxLag;lag++){
      if(cmnd[lag]<.15){
        while(lag+1<=maxLag&&cmnd[lag+1]<cmnd[lag])lag++;
        chosen=lag;break;
      }
    }
    if(chosen<0){
      let best=.35;
      for(let lag=minLag;lag<=maxLag;lag++){
        if(cmnd[lag]<best){best=cmnd[lag];chosen=lag;}
      }
      if(chosen<0)return -1;
    }
    const left=cmnd[chosen-1]??cmnd[chosen];
    const center=cmnd[chosen];
    const right=cmnd[chosen+1]??center;
    const denominator=left-2*center+right;
    const shift=denominator?Math.max(-.5,Math.min(.5,.5*(left-right)/denominator)):0;
    const period=chosen+shift;
    return period>0?rate/period:-1;
  }
  function tick(){
    if(!state.analyser)return;
    state.analyser.getFloatTimeDomainData(state.buffer);
    const hz=autoCorrelate(state.buffer,state.context.sampleRate);
    if(hz>35&&hz<1200){
      const n=frequencyToNote(hz);
      const targetFrequency=currentStrings()[state.stringIndex][2];
      const targetNote=frequencyToNote(targetFrequency);
      const cents=1200*Math.log2(hz/targetFrequency);
      $("noteName").textContent=n.name;$("noteOctave").textContent=n.octave;
      $("frequency").textContent=hz.toFixed(2);
      $("pitchState").textContent=Math.abs(cents)<=5?"مضبوط تقريباً":cents<0?"أخفض من الهدف":"أعلى من الهدف";
      if(Math.abs(cents)<=5)$("guidance").textContent="ممتاز! الوتر قريب جداً من التردد المرجعي المحدد.";
      else if(Math.abs(cents)>100)$("guidance").textContent="النغمة بعيدة عن الوتر المحدد ("+targetNote.name+targetNote.octave+"). تأكد من اختيار الوتر الصحيح.";
      else $("guidance").textContent=cents<0?"ارفع شدّ الوتر قليلاً لزيادة التردد.":"أرخِ الوتر قليلاً لخفض التردد.";
      updateMeter(cents);
    }
    state.raf=requestAnimationFrame(tick);
  }
  async function start(){
    $("errorMessage").hidden=true;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showError("المتصفح لا يدعم الوصول إلى الميكروفون. افتح الموقع عبر HTTPS أو localhost واستخدم متصفحاً حديثاً.");return;}
    try{
      state.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      state.context=new (window.AudioContext||window.webkitAudioContext)();
      if(state.context.state==="suspended")await state.context.resume();
      const source=state.context.createMediaStreamSource(state.stream);state.analyser=state.context.createAnalyser();state.analyser.fftSize=4096;state.analyser.smoothingTimeConstant=.15;source.connect(state.analyser);
      state.buffer=new Float32Array(state.analyser.fftSize);$("startButton").disabled=true;$("stopButton").disabled=false;$("micStatus").classList.add("on");$("micStatus").innerHTML="<i></i> يستمع الآن";$("pitchState").textContent="استمع إلى الوتر";
      tick();
    }catch(err){
      let msg="تعذر تشغيل الميكروفون. تحقق من توصيله ومن إعدادات الخصوصية ثم حاول مجدداً.";
      if(err&&err.name==="NotAllowedError")msg="تم رفض إذن الميكروفون. اسمح للموقع باستخدام الميكروفون من رمز القفل بجانب العنوان أو إعدادات المتصفح، ثم أعد المحاولة.";
      else if(err&&err.name==="NotFoundError")msg="لم يتم العثور على ميكروفون متصل بالجهاز.";
      else if(err&&err.name==="NotReadableError")msg="الميكروفون مستخدم من تطبيق آخر أو يتعذر الوصول إليه حالياً.";
      else if(location.protocol!=="https:"&&location.hostname!=="localhost")msg="يجب فتح الموالف عبر اتصال HTTPS آمن أو localhost حتى يتمكن المتصفح من استخدام الميكروفون.";
      showError(msg);stop();
    }
  }
  function showError(msg){$("errorMessage").textContent=msg;$("errorMessage").hidden=false;}
  function stop(){
    if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;
    if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null;}
    if(state.context){state.context.close().catch(()=>{});state.context=null;}
    state.analyser=null;state.buffer=null;$("startButton").disabled=false;$("stopButton").disabled=true;$("micStatus").classList.remove("on");$("micStatus").innerHTML="<i></i> الميكروفون متوقف";clearReading();
  }
  function playReference(){
    const freq=currentStrings()[state.stringIndex][2];
    const ctx=new (window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type="sine";osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.22,ctx.currentTime+.04);gain.gain.setTargetAtTime(.0001,ctx.currentTime+1.15,.18);
    osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+2);
    osc.onended=()=>ctx.close();
  }

  const maqams = {
    bayati:{name:"بيات",root:62,rootLabel:"ري",steps:[0,3,6,10,14,16,20,24],desc:"بيات على ري: ري، مي نصف بيمول، فا، صول، لا، سي بيمول، دو، ري. قد تُرفع السادسة إلى سي نصف بيمول في بعض الأداءات."},
    kurd:{name:"كرد",root:62,rootLabel:"ري",steps:[0,2,6,10,14,16,20,24],desc:"كرد على ري: ري، مي بيمول، فا، صول، لا، سي بيمول، دو، ري."},
    saba:{name:"صبا",root:62,rootLabel:"ري",steps:[0,3,6,8,14,16,20,22],desc:"صبا على ري: ري، مي نصف بيمول، فا، صول بيمول، لا، سي بيمول، دو، ري بيمول. هذه صيغة صاعدة لا تنتهي بالأوكتاف."},
    sikah:{name:"سيكاه",root:63.5,rootLabel:"مي نصف بيمول",steps:[0,3,7,11,14,17,21,24],desc:"سيكاه على مي نصف بيمول: مي نصف بيمول، فا، صول، لا، سي نصف بيمول، دو، ري، ثم مي نصف بيمول جواباً."},
    hijaz:{name:"حجاز",root:62,rootLabel:"ري",steps:[0,2,8,10,14,16,20,24],labels:["ري","مي بيمول","فا دييز","صول","لا","سي بيمول","دو","ري"],desc:"حجاز على ري: ري، مي بيمول، فا دييز، صول، لا، سي بيمول، دو، ثم ري جواباً."},
    huzam:{name:"هزام",root:63.5,rootLabel:"مي نصف بيمول",steps:[0,3,7,9,15,17,21,24],desc:"هزام على مي نصف بيمول: مي نصف بيمول، فا، صول، لا بيمول، سي، دو، ري، ثم مي نصف بيمول جواباً."},
    ajam:{name:"عجم",root:60,rootLabel:"دو",steps:[0,4,8,10,14,18,22,24],desc:"عجم على درجة دو، وهو السلم الكبير المعروف بأبعاده المنتظمة."},
    nahawand:{name:"نهاوند",root:60,rootLabel:"دو",steps:[0,4,6,10,14,16,20,24],desc:"نهاوند على درجة دو، بصيغة السلم الصغير الطبيعي."},
    rast:{name:"رست",root:60,rootLabel:"دو",steps:[0,4,7,10,14,18,21,24],desc:"رست على دو: دو، ري، مي نصف بيمول، فا، صول، لا، سي نصف بيمول، دو. في الهبوط قد تختلف السابعة وتُؤدّى سي بيمول."}
  };
  const chromatic=["دو","ري بيمول","ري","مي بيمول","مي","فا","صول بيمول","صول","لا بيمول","لا","سي بيمول","سي"];
  const natural=["دو","ري","مي","فا","صول","لا","سي"];
  const rootChoices=Array.from({length:12},(_,i)=>({value:i+60,label:chromatic[i]}));
  rootChoices.push({value:"63.5",label:"مي نصف بيمول"});
  const pianoState={context:null,oscillators:[],sequenceTimer:null,sequenceIndex:0,notes:[]};
  function noteName(midi){
    const lower=Math.floor(midi),fraction=midi-lower;
    if(Math.abs(fraction-.5)<.001)return chromatic[(Math.round(lower)+1)%12]+" نصف بيمول";
    return chromatic[((Math.round(midi)%12)+12)%12];
  }
  function pianoPosition(semitone){
    const centers=[.5,1,1.5,2,2.5,3.5,4,4.5,5,5.5,6,6.5];
    const s=((semitone%12)+12)%12,lo=Math.floor(s),hi=(lo+1)%12;
    const next=hi===0?7:centers[hi];
    return centers[lo]+(next-centers[lo])*(s-lo);
  }
  function intervalLabel(q){
    const labels={1:"ربع تون",2:"نصف تون",3:"ثلاثة أرباع تون",4:"تون كامل",5:"تون وربع",6:"تون ونصف",7:"تون وثلاثة أرباع",8:"تونان"};
    return labels[q]||((q/2)+" تون");
  }
  function getMaqamData(){
    const m=maqams[$("maqamSelect").value];
    const selected=$("maqamRoot").value;
    const root=selected===""?m.root:Number(selected);
    return {...m,root,labels:root===m.root?m.labels:null,notes:m.steps.map(q=>root+q/2)};
  }
  const heldPianoNotes=new Map();
  const releasedPianoKeys=new Set();
  function stopHeldPianoNote(key){
    const held=heldPianoNotes.get(key);if(!held){releasedPianoKeys.add(key);return;}
    const now=held.context.currentTime;
    held.gain.gain.cancelScheduledValues(now);held.gain.gain.setTargetAtTime(.0001,now,.035);
    try{held.osc.stop(now+.18);}catch(e){}
    heldPianoNotes.delete(key);
  }
  async function startHeldPianoNote(midi,label,key){
    try{
      releasedPianoKeys.delete(key);
      if(heldPianoNotes.has(key))return;
      if(!pianoState.context)pianoState.context=new (window.AudioContext||window.webkitAudioContext)();
      const ctx=pianoState.context;if(ctx.state==="suspended")await ctx.resume();
      if(releasedPianoKeys.has(key)){releasedPianoKeys.delete(key);return;}
      if(heldPianoNotes.has(key))return;
      const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
      osc.type="triangle";osc.frequency.value=A4*Math.pow(2,(midi-69)/12);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.16,now+.025);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);
      heldPianoNotes.set(key,{osc,gain,context:ctx});
      $("pianoNowPlaying").textContent="تعزف الآن: "+label+" · "+(A4*Math.pow(2,(midi-69)/12)).toFixed(2)+" Hz";
    }catch(error){$("pianoNowPlaying").textContent="تعذر تشغيل الصوت. تحقق من إعدادات الصوت.";}
  }
  function buildPiano(){
    const data=getMaqamData(),keyboard=$("pianoKeyboard");
    keyboard.innerHTML="";
    $("pianoMaqamName").textContent="مقام "+data.name+" · "+noteName(data.root);
    $("maqamDescription").textContent=data.desc;
    keyboard.className="maqam-note-grid";
    keyboard.setAttribute("aria-label","درجات مقام "+data.name);
    data.steps.forEach((q,i)=>{
      const midi=data.root+q/2,label=data.labels?.[i]||noteName(midi),isRoot=i===0,isLast=i===data.steps.length-1,isJawab=isLast&&Math.abs(q-24)<.001;
      const key=document.createElement("button");
      key.type="button";
      key.className="maqam-note-key"+(isRoot?" root-note-key":"")+(isJawab?" jawab-note-key":(isLast?" ending-note-key":""));
      key.setAttribute("aria-label","الدرجة "+(i+1)+": "+label+"، اضغط لسماع النغمة");
      key.innerHTML='<span class="maqam-degree"></span><strong class="maqam-note-label"></strong><small class="maqam-note-kind"></small>';
      key.querySelector(".maqam-degree").textContent=data.labels?.[i]|| (isRoot?"القرار":isJawab?"الجواب":isLast?"القفلة":"الدرجة "+(i+1));
      key.querySelector(".maqam-note-label").textContent=label;
      key.querySelector(".maqam-note-kind").textContent=(Math.abs((midi%1)-.5)<.001)?"ربع صوت":"";
      const token="maqam-tile-"+i;
      key.addEventListener("pointerdown",e=>{
        e.preventDefault();
        try{key.setPointerCapture(e.pointerId);}catch(error){}
        key.classList.add("pressed");
        startHeldPianoNote(midi,label,token);
      });
      const release=()=>{stopHeldPianoNote(token);key.classList.remove("pressed");};
      key.addEventListener("pointerup",release);
      key.addEventListener("pointercancel",release);
      key.addEventListener("lostpointercapture",release);
      key.addEventListener("contextmenu",e=>e.preventDefault());
      keyboard.append(key);
    });
    renderScaleDetails(data);
    $("pianoNowPlaying").textContent="اضغط على أي مربع لسماع درجته، أو استمع إلى المقام كاملاً.";
  }
  function renderScaleDetails(data){
    const notes=$("scaleNotes"),intervals=$("scaleIntervals");notes.innerHTML="";intervals.innerHTML="";
    data.steps.forEach((q,i)=>{
      const item=document.createElement("div");item.className="scale-note"+(i===0?" root-note":"");
      const name=document.createElement("b");name.textContent=data.labels?.[i]||noteName(data.root+q/2);
      const detail=document.createElement("small");detail.textContent=i===0?"القرار / البداية":i===data.steps.length-1?(Math.abs(q-24)<.001?"الجواب / الأوكتاف":"القفلة / الدرجة الأخيرة"):"الدرجة "+(i+1);
      item.append(name,detail);notes.append(item);
    });
    for(let i=1;i<data.steps.length;i++){
      const diff=data.steps[i]-data.steps[i-1],chip=document.createElement("span");chip.className="interval-chip";
      const degree=document.createElement("b");degree.textContent=(i)+"→"+(i+1);
      chip.append(degree,document.createTextNode(intervalLabel(diff)));intervals.append(chip);
    }
  }
  async function playPianoNote(midi,label,duration=.65){
    try{
      if(!pianoState.context)pianoState.context=new (window.AudioContext||window.webkitAudioContext)();
      const ctx=pianoState.context;if(ctx.state==="suspended")await ctx.resume();
      const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
      osc.type="triangle";osc.frequency.value=A4*Math.pow(2,(midi-69)/12);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.18,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.03);
      pianoState.oscillators.push(osc);osc.onended=()=>{pianoState.oscillators=pianoState.oscillators.filter(x=>x!==osc);};
      $("pianoNowPlaying").textContent="النغمة: "+label+" · "+(A4*Math.pow(2,(midi-69)/12)).toFixed(2)+" Hz";
    }catch(error){$("pianoNowPlaying").textContent="تعذر تشغيل الصوت. جرّب الضغط على المفتاح مرة أخرى.";}
  }
  function stopScalePlayback(){
    if(pianoState.sequenceTimer){clearTimeout(pianoState.sequenceTimer);pianoState.sequenceTimer=null;}
    pianoState.oscillators.forEach(osc=>{try{osc.stop();}catch(e){}});
    [...heldPianoNotes.keys()].forEach(stopHeldPianoNote);
    pianoState.oscillators=[];$("playScale").disabled=false;$("stopScale").disabled=true;
    $("pianoNowPlaying").textContent="تم إيقاف العزف.";
  }
  function playFullScale(){
    stopScalePlayback();const data=getMaqamData();pianoState.notes=data.steps.map(q=>data.root+q/2);pianoState.sequenceIndex=0;
    $("playScale").disabled=true;$("stopScale").disabled=false;
    const next=()=>{if(pianoState.sequenceIndex>=pianoState.notes.length){pianoState.sequenceTimer=null;$("playScale").disabled=false;$("stopScale").disabled=true;$("pianoNowPlaying").textContent="انتهى عزف مقام "+data.name+".";return;}
      const index=pianoState.sequenceIndex++,midi=pianoState.notes[index],label=data.labels?.[index]||noteName(midi);playPianoNote(midi,label,.48);pianoState.sequenceTimer=setTimeout(next,560);};
    next();
  }
  function initMaqam(){
    const select=$("maqamRoot");
    rootChoices.forEach(item=>{const option=document.createElement("option");option.value=String(item.value);option.textContent=item.label;select.append(option);});
    function updateRootDefault(){const m=maqams[$("maqamSelect").value];select.value=String(m.root);}
    $("maqamSelect").addEventListener("change",()=>{updateRootDefault();stopScalePlayback();buildPiano();});
    select.addEventListener("change",()=>{stopScalePlayback();buildPiano();});
    $("playScale").addEventListener("click",playFullScale);$("stopScale").addEventListener("click",stopScalePlayback);
    updateRootDefault();buildPiano();
  }



  const drumNames={dum:"دُم",tak:"تَك",daf:"دَف",riq:"رَق",clap:"تصفيق",cymbal:"صَنج",snare:"سنير",bass:"باس",slap:"صفعة",sagat:"صاجات",shaker:"شيكر",tom:"توم"};
  const drumKeys={dum:"1",tak:"2",daf:"3",riq:"4",clap:"5",cymbal:"6",snare:"7",bass:"8",slap:"9",sagat:"0",shaker:"Q",tom:"W"};
  const rhythmPatterns={
    maqsum:{name:"مقسوم",beats:4,description:"إيقاع شرقي رباعي شائع",steps:{0:["dum"],3:["tak"],4:["tak"],6:["dum"],8:["dum"],11:["tak"],12:["tak"],14:["dum"]}},
    baladi:{name:"بلدي",beats:4,description:"إيقاع بلدي بأربع نبضات",steps:{0:["dum"],2:["tak"],4:["dum"],6:["tak"],8:["dum"],10:["tak"],12:["dum"],14:["tak"]}},
    malfuf:{name:"ملفوف",beats:2,description:"إيقاع سريع بحركة ثنائية",steps:{0:["dum"],2:["tak"],4:["tak"],6:["dum"]}},
    saidi:{name:"صعيدي",beats:4,description:"إيقاع صعيدي قوي",steps:{0:["dum"],2:["tak"],4:["dum"],6:["tak"],8:["dum"],10:["dum"],12:["tak"],14:["tak"]}},
    wahda:{name:"وحدة كبيرة",beats:4,description:"إيقاع هادئ بأربع نبضات",steps:{0:["dum"],4:["tak"],8:["dum"],12:["tak"]}}
  };
  let drumAudioContext=null;
  const rhythmState={timer:null,nextStep:0,nextTime:0,bpm:100,playing:false,pattern:"maqsum"};
  function getDrumContext(){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)throw new Error("Web Audio API غير مدعوم في هذا المتصفح");
    if(!drumAudioContext||drumAudioContext.state==="closed")drumAudioContext=new AudioCtx();
    return drumAudioContext;
  }
  function drumNoise(ctx,output,{duration=.12,filter="highpass",frequency=1200,level=.4,decay=.1,at=ctx.currentTime}={}){
    const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*(1-i/length*.18);
    const source=ctx.createBufferSource(),filterNode=ctx.createBiquadFilter(),amp=ctx.createGain();
    source.buffer=buffer;filterNode.type=filter;filterNode.frequency.setValueAtTime(frequency,at);
    amp.gain.setValueAtTime(Math.max(.0001,level),at);
    amp.gain.exponentialRampToValueAtTime(.0001,at+Math.max(.015,decay));
    source.connect(filterNode);filterNode.connect(amp);amp.connect(output);
    source.start(at);source.stop(at+duration);
  }
  function drumTone(ctx,output,{start=120,end=60,duration=.2,level=.6,wave="sine",at=ctx.currentTime}={}){
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    osc.type=wave;osc.frequency.setValueAtTime(Math.max(1,start),at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+duration);
    amp.gain.setValueAtTime(Math.max(.0001,level),at);
    amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(amp);amp.connect(output);osc.start(at);osc.stop(at+duration+.01);
  }
  function playDrumSound(ctx,type,at=ctx.currentTime){
    const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
    master.gain.setValueAtTime(.82,at);
    compressor.threshold.setValueAtTime(-8,at);compressor.knee.setValueAtTime(12,at);
    compressor.ratio.setValueAtTime(5,at);compressor.attack.setValueAtTime(.003,at);compressor.release.setValueAtTime(.15,at);
    master.connect(compressor);compressor.connect(ctx.destination);
    if(type==="dum"||type==="bass"){
      drumTone(ctx,master,{start:type==="bass"?105:155,end:type==="bass"?38:48,duration:.3,level:.95,at});
      drumNoise(ctx,master,{duration:.05,filter:"lowpass",frequency:650,level:.2,decay:.04,at});
    }else if(type==="tak"||type==="snare"){
      drumNoise(ctx,master,{duration:.13,filter:"bandpass",frequency:type==="snare"?1750:2300,level:.85,decay:.1,at});
      drumTone(ctx,master,{start:270,end:125,duration:.07,level:.16,at});
    }else if(type==="daf"){
      drumTone(ctx,master,{start:118,end:75,duration:.24,level:.62,at});
      drumNoise(ctx,master,{duration:.24,filter:"bandpass",frequency:950,level:.55,decay:.21,at});
    }else if(type==="riq"){
      drumNoise(ctx,master,{duration:.34,filter:"highpass",frequency:5600,level:.8,decay:.32,at});
      [2350,3190,4170,5280].forEach(f=>drumTone(ctx,master,{start:f,end:f*.985,duration:.22,level:.12,wave:"square",at}));
    }else if(type==="clap"){
      [0,.025,.052].forEach((offset,i)=>drumNoise(ctx,master,{duration:.1,filter:"bandpass",frequency:1350,level:i===2?.62:.42,decay:.075,at:at+offset}));
    }else if(type==="cymbal"){
      drumNoise(ctx,master,{duration:.8,filter:"highpass",frequency:7600,level:.72,decay:.78,at});
      [1730,2410,3190,4020,5180].forEach(f=>drumTone(ctx,master,{start:f,end:f*.997,duration:.55,level:.055,wave:"square",at}));
    }else if(type==="slap"){
      drumTone(ctx,master,{start:210,end:95,duration:.11,level:.65,wave:"triangle",at});
      drumNoise(ctx,master,{duration:.07,filter:"bandpass",frequency:1250,level:.7,decay:.06,at});
    }else if(type==="sagat"){
      [3100,3900,4700,5600].forEach(f=>drumTone(ctx,master,{start:f,end:f*.99,duration:.16,level:.09,wave:"square",at}));
      drumNoise(ctx,master,{duration:.18,filter:"highpass",frequency:6500,level:.35,decay:.16,at});
    }else if(type==="shaker"){
      drumNoise(ctx,master,{duration:.16,filter:"highpass",frequency:4200,level:.42,decay:.14,at});
    }else if(type==="tom"){
      drumTone(ctx,master,{start:230,end:105,duration:.25,level:.72,wave:"sine",at});
    }
  }
  function setDrumStatus(message){const status=$("drumNowPlaying");if(status)status.textContent=message;}
  function flashDrumPad(type){
    const pad=document.querySelector('.drum-pad[data-drum="'+type+'"]');
    if(!pad)return;
    pad.classList.add("is-hit");
    window.setTimeout(()=>pad.classList.remove("is-hit"),110);
  }
  async function triggerDrum(type){
    try{
      const ctx=getDrumContext();
      if(ctx.state!=="running")await ctx.resume();
      if(ctx.state!=="running")throw new Error("لم يتم تفعيل الصوت؛ اضغط مرة أخرى أو تحقق من إعدادات الصوت");
      playDrumSound(ctx,type);flashDrumPad(type);
      setDrumStatus("يُعزف الآن: "+drumNames[type]);
    }catch(error){setDrumStatus("تعذر تشغيل الصوت: "+(error.message||"تحقق من إعدادات الصوت والمتصفح"));}
  }
  function updateRhythmControls(){
    const start=$("rhythmStart"),stop=$("rhythmStop"),label=$("rhythmPlayState");
    if(start)start.disabled=rhythmState.playing;
    if(stop)stop.disabled=!rhythmState.playing;
    if(label)label.textContent=rhythmState.playing?"الإيقاع يعمل الآن":"الإيقاع متوقف";
  }
  function scheduleRhythmStep(ctx){
    const pattern=rhythmPatterns[rhythmState.pattern];
    const step=rhythmState.nextStep;
    const hits=pattern.steps[step]||[];
    hits.forEach(type=>{
      playDrumSound(ctx,type,rhythmState.nextTime);
      const delay=Math.max(0,(rhythmState.nextTime-ctx.currentTime)*1000);
      window.setTimeout(()=>flashDrumPad(type),delay);
    });
    const beat=Math.floor(step/4)+1;
    const beatEl=$("rhythmBeat");
    if(beatEl)beatEl.textContent="النبضة "+beat+" / "+pattern.beats;
    const stepDuration=60/rhythmState.bpm/4;
    rhythmState.nextTime+=stepDuration;
    rhythmState.nextStep=(step+1)%(pattern.beats*4);
  }
  async function startRhythm(){
    try{
      const ctx=getDrumContext();
      if(ctx.state!=="running")await ctx.resume();
      if(ctx.state!=="running")throw new Error("تعذر تفعيل الصوت");
      if(rhythmState.playing)return;
      rhythmState.pattern=$("rhythmSelect").value;
      rhythmState.bpm=Number($("rhythmTempo").value)||100;
      rhythmState.nextStep=0;rhythmState.nextTime=ctx.currentTime+.06;rhythmState.playing=true;
      const lookAhead=()=>{
        if(!rhythmState.playing)return;
        while(rhythmState.nextTime<ctx.currentTime+.12)scheduleRhythmStep(ctx);
      };
      lookAhead();rhythmState.timer=window.setInterval(lookAhead,25);
      updateRhythmControls();
      setDrumStatus("يعمل الآن: "+rhythmPatterns[rhythmState.pattern].name+" · "+rhythmState.bpm+" BPM");
    }catch(error){setDrumStatus("تعذر تشغيل الإيقاع: "+(error.message||"تحقق من إعدادات الصوت"));}
  }
  function stopRhythm(){
    rhythmState.playing=false;
    if(rhythmState.timer!==null){window.clearInterval(rhythmState.timer);rhythmState.timer=null;}
    updateRhythmControls();
    const beat=$("rhythmBeat");if(beat)beat.textContent="جاهز";
    setDrumStatus("تم إيقاف الإيقاع. يمكنك اختيار إيقاع آخر أو العزف الحر.");
  }

    document.querySelectorAll("[data-drum-mode]").forEach(button=>{
      button.addEventListener("click",()=>{
        const ready=button.dataset.drumMode==="ready";
        document.querySelectorAll("[data-drum-mode]").forEach(tab=>{
          const active=tab===button;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));
        });
        $("freeDrumMode").hidden=ready;
        $("readyDrumMode").hidden=!ready;
      });
    });

  function initDrumPads(){
    const pads=$("drumPads");if(!pads)return;
    pads.addEventListener("click",event=>{
      const pad=event.target.closest(".drum-pad[data-drum]");
      if(pad)triggerDrum(pad.dataset.drum);
    });
    document.addEventListener("keydown",event=>{
      if(event.repeat||event.ctrlKey||event.altKey||event.metaKey)return;
      const active=document.activeElement;
      if(active&&(/INPUT|TEXTAREA|SELECT/.test(active.tagName)||active.isContentEditable))return;
      const type=Object.keys(drumKeys).find(key=>drumKeys[key].toLowerCase()===event.key.toLowerCase());
      if(type){event.preventDefault();triggerDrum(type);}
      if(event.code==="Space"&&rhythmState.playing){event.preventDefault();stopRhythm();}
    });
    $("rhythmTempo").addEventListener("input",event=>{
      rhythmState.bpm=Number(event.target.value);
      $("rhythmTempoValue").textContent=rhythmState.bpm+" BPM";
      if(rhythmState.playing){
        const ctx=getDrumContext();rhythmState.nextTime=Math.max(rhythmState.nextTime,ctx.currentTime+.03);
      }
    });
    $("rhythmSelect").addEventListener("change",event=>{
      rhythmState.pattern=event.target.value;
      $("rhythmDescription").textContent=rhythmPatterns[rhythmState.pattern].description;
      if(rhythmState.playing){stopRhythm();startRhythm();}
    });
    $("rhythmStart").addEventListener("click",startRhythm);
    $("rhythmStop").addEventListener("click",stopRhythm);
    updateRhythmControls();
  }

  function initNavigation(){
    const nav=document.querySelector(".main-nav");
    const brand=document.querySelector(".brand");
    const pages=()=>Array.from(document.querySelectorAll(".site-page"));

    function showPage(target,shouldScroll=true){
      const destination=document.getElementById(target);
      if(!destination||!destination.classList.contains("site-page"))return false;

      pages().forEach(page=>{
        const isCurrent=page===destination;
        page.hidden=!isCurrent;
        page.setAttribute("aria-hidden",String(!isCurrent));
      });

      document.querySelectorAll(".main-nav [data-page]").forEach(link=>{
        const active=link.dataset.page===target;
        link.classList.toggle("active",active);
        if(active)link.setAttribute("aria-current","page");
        else link.removeAttribute("aria-current");
      });

      if(target==="maqamPage")buildPiano();
      if(target!=="drumsPage"&&rhythmState.playing)stopRhythm();
      if(shouldScroll)window.scrollTo({top:0,behavior:"smooth"});
      return true;
    }

    // Delegate at document level so every current or future navbar item works.
    document.addEventListener("click",event=>{
      const link=event.target instanceof Element
        ? event.target.closest(".main-nav [data-page]")
        : null;
      if(!link)return;
      event.preventDefault();
      showPage(link.dataset.page);
    });

    // The brand always returns to the tuner without reloading the website.
    if(brand)brand.addEventListener("click",event=>{
      event.preventDefault();
      showPage("tunerPage");
    });

    const initial=pages().find(page=>!page.hidden)||pages()[0];
    if(initial)showPage(initial.id,false);
  }

  $("instrumentGrid").addEventListener("click",e=>{const b=e.target.closest("[data-instrument]");if(!b)return;state.instrument=b.dataset.instrument;document.querySelectorAll(".instrument").forEach(x=>x.classList.toggle("active",x===b));renderTuning();});
  $("tuningSelect").addEventListener("change",e=>{state.tuningIndex=Number(e.target.value);state.stringIndex=0;$("tuningNote").textContent=currentTuning().note;renderStrings();});
  $("startButton").addEventListener("click",start);$("stopButton").addEventListener("click",stop);$("playReference").addEventListener("click",playReference);
  renderTuning();
  initMaqam();
  initDrumPads();
  initNavigation();
})();