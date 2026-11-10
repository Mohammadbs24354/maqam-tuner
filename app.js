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
    const midi=Math.round(69+12*Math.log2(freq/A4)),name=noteNames[(midi%12+12)%12],octave=Math.floor(midi/12)-1;
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
    let rms=0;for(let i=0;i<buf.length;i++)rms+=buf[i]*buf[i];rms=Math.sqrt(rms/buf.length);
    if(rms<0.012)return -1;
    let r1=0,r2=buf.length-1,threshold=0.2;
    for(let i=0;i<buf.length/2;i++){if(Math.abs(buf[i])<threshold){r1=i;break;}}
    for(let i=1;i<buf.length/2;i++){if(Math.abs(buf[buf.length-i])<threshold){r2=buf.length-i;break;}}
    const data=buf.slice(r1,r2),size=data.length;
    if(size<3)return -1;
    const corr=new Float32Array(size);
    for(let lag=0;lag<size;lag++){let sum=0;for(let j=0;j<size-lag;j++)sum+=data[j]*data[j+lag];corr[lag]=sum;}
    let d=0;while(d+1<size&&corr[d]>corr[d+1])d++;
    let max=-1,maxpos=-1;
    for(let i=d;i<size;i++){if(corr[i]>max){max=corr[i];maxpos=i;}}
    if(maxpos<=0||maxpos>=size-1)return -1;
    const x1=corr[maxpos-1],x2=corr[maxpos],x3=corr[maxpos+1],a=(x1+x3-2*x2)/2,b=(x3-x1)/2;
    const shift=a?-.5*b/a:0,period=maxpos+shift;
    return period>0?sampleRate/period:-1;
  }
  function tick(){
    if(!state.analyser)return;
    state.analyser.getFloatTimeDomainData(state.buffer);
    const hz=autoCorrelate(state.buffer,state.context.sampleRate);
    if(hz>35&&hz<1200){
      const n=frequencyToNote(hz),cents=1200*Math.log2(hz/n.frequency);
      $("noteName").textContent=n.name;$("noteOctave").textContent=n.octave;
      $("frequency").textContent=hz.toFixed(2);$("pitchState").textContent=Math.abs(cents)<=5?"مضبوط تقريباً":cents<0?"أخفض من النغمة":"أعلى من النغمة";
      $("guidance").textContent=Math.abs(cents)<=5?"ممتاز! النغمة قريبة جداً من الهدف.":cents<0?"ارفع شدّ الوتر قليلاً لزيادة التردد.":"أرخِ الوتر قليلاً لخفض التردد.";
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
    bayati:{name:"بيات",root:62,rootLabel:"ري",steps:[0,3,4,7,10,12,14,24],desc:"بيات على درجة ري. يحتوي على مي نصف بيمول، وهي سمة أساسية في جنس البيات."},
    kurd:{name:"كرد",root:62,rootLabel:"ري",steps:[0,2,6,10,12,16,20,24],desc:"كرد على درجة ري، ويُعرض هنا بسلم كرد الصاعد ذي الثانية والثالثة الصغيرة."},
    saba:{name:"صبا",root:62,rootLabel:"ري",steps:[0,3,6,8,14,16,20,24],desc:"صبا على درجة ري. يتضمن مي نصف بيمول ودرجة فا، ثم صول بيمول في هذا التمثيل التعليمي."},
    sikah:{name:"سيكا",root:63.5,rootLabel:"مي نصف بيمول",steps:[0,3,7,11,13,17,21,24],desc:"سيكا على مي نصف بيمول. العلامة البنفسجية تمثل أرباع الصوت بين مفاتيح البيانو."},
    ajam:{name:"عجم",root:60,rootLabel:"دو",steps:[0,4,8,10,14,18,22,24],desc:"عجم على درجة دو، وهو السلم الكبير المعروف بأبعاده المنتظمة."},
    nahawand:{name:"نهاوند",root:60,rootLabel:"دو",steps:[0,4,6,10,14,16,20,24],desc:"نهاوند على درجة دو، بصيغة السلم الصغير الطبيعي."},
    rast:{name:"رست",root:60,rootLabel:"دو",steps:[0,4,7,8,12,16,19,24],desc:"رست على درجة دو، مع مي نصف بيمول وسي نصف بيمول."}
  };
  const chromatic=["دو","دو دييز","ري","ري دييز","مي","فا","فا دييز","صول","صول دييز","لا","لا دييز","سي"];
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
    const s=((semitone%12)+12)%12,lo=Math.floor(s),hi=Math.min(11,lo+1);
    if(s===lo)return centers[lo];
    return centers[lo]+(centers[hi]-centers[lo])*(s-lo);
  }
  function intervalLabel(q){
    const labels={1:"ربع تون",2:"نصف تون",3:"ثلاثة أرباع تون",4:"تون كامل",5:"تون وربع",6:"تون ونصف",7:"تون وثلاثة أرباع",8:"تونان"};
    return labels[q]||((q/2)+" تون");
  }
  function getMaqamData(){
    const m=maqams[$("maqamSelect").value];
    const selected=$("maqamRoot").value;
    const root=selected===""?m.root:Number(selected);
    return {...m,root,notes:m.steps.map(q=>root+q/2)};
  }
  const heldPianoNotes=new Map();
  function stopHeldPianoNote(key){
    const held=heldPianoNotes.get(key);if(!held)return;
    const now=held.context.currentTime;
    held.gain.gain.cancelScheduledValues(now);held.gain.gain.setTargetAtTime(.0001,now,.035);
    try{held.osc.stop(now+.18);}catch(e){}
    heldPianoNotes.delete(key);
  }
  async function startHeldPianoNote(midi,label,key){
    try{
      if(heldPianoNotes.has(key))return;
      if(!pianoState.context)pianoState.context=new (window.AudioContext||window.webkitAudioContext)();
      const ctx=pianoState.context;if(ctx.state==="suspended")await ctx.resume();
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
    const whitePcs=[0,2,4,5,7,9,11],blackPcs=[1,3,6,8,10],whiteCount=15;
    keyboard.style.setProperty("--white-count",whiteCount);
    const scalePcs=data.steps.slice(0,-1).map(q=>((data.root+q/2)%12+12)%12);
    for(let octave=0;octave<2;octave++){
      whitePcs.forEach((pc,index)=>{
        const midi=60+octave*12+pc,absoluteIndex=octave*7+index;
        const match=scalePcs.some(p=>Math.abs(p-pc)<.001);
        const root=Math.abs(((data.root%12)+12)%12-pc)<.001;
        const key=document.createElement("button");key.type="button";
        key.className="piano-key white"+(match?" active":"")+(root?" root":"");
        key.style.left=(absoluteIndex/whiteCount*100)+"%";key.style.width=(100/whiteCount)+"%";
        key.textContent=root?"1":(match?String(data.steps.findIndex(q=>Math.abs((((data.root+q/2)%12+12)%12)-pc)<.001)+1):"");
        key.setAttribute("aria-label",noteName(midi));key.title=noteName(midi);
        const token="white-"+midi;
        key.addEventListener("pointerdown",e=>{e.preventDefault();key.setPointerCapture(e.pointerId);startHeldPianoNote(midi,noteName(midi),token);key.classList.add("pressed");});
        const release=()=>{stopHeldPianoNote(token);key.classList.remove("pressed");};
        key.addEventListener("pointerup",release);key.addEventListener("pointercancel",release);key.addEventListener("lostpointercapture",release);
        key.addEventListener("contextmenu",e=>e.preventDefault());keyboard.append(key);
      });
    }
    for(let octave=0;octave<2;octave++){
      blackPcs.forEach(pc=>{
        const before=whitePcs.filter(n=>n<pc).length,absoluteIndex=octave*7+before;
        const midi=60+octave*12+pc,match=scalePcs.some(p=>Math.abs(p-pc)<.001);
        const key=document.createElement("button");key.type="button";
        key.className="piano-key black"+(match?" active":"");
        key.style.left=((absoluteIndex+.68)/whiteCount*100)+"%";key.style.width=(.64/whiteCount*100)+"%";
        key.setAttribute("aria-label",noteName(midi));key.title=noteName(midi);
        const token="black-"+midi;
        key.addEventListener("pointerdown",e=>{e.preventDefault();key.setPointerCapture(e.pointerId);startHeldPianoNote(midi,noteName(midi),token);key.classList.add("pressed");});
        const release=()=>{stopHeldPianoNote(token);key.classList.remove("pressed");};
        key.addEventListener("pointerup",release);key.addEventListener("pointercancel",release);key.addEventListener("lostpointercapture",release);
        key.addEventListener("contextmenu",e=>e.preventDefault());keyboard.append(key);
      });
    }
    data.steps.slice(0,-1).forEach((q,i)=>{
      const midi=data.root+q/2,pitch=((midi%12)+12)%12;
      if(Math.abs(pitch-Math.round(pitch))<.001)return;
      const semitone=Math.floor(pitch),octave=Math.floor((data.root+q/2-60)/12);
      const whiteBefore=whitePcs.filter(n=>n<=semitone).length;
      const whiteIndex=octave*7+Math.max(0,whiteBefore-1);
      const marker=document.createElement("div");marker.className="quarter-marker"+(i===0?" root-marker":"");
      marker.style.left=((whiteIndex+.5)/whiteCount*100)+"%";
      const button=document.createElement("button");button.type="button";button.textContent=String(i+1)+"¼";
      button.title=noteName(midi)+" · ربع صوت · اضغط باستمرار للعزف";
      const token="quarter-"+i;
      button.addEventListener("pointerdown",e=>{e.preventDefault();button.setPointerCapture(e.pointerId);startHeldPianoNote(midi,noteName(midi),token);button.classList.add("pressed");});
      const release=()=>{stopHeldPianoNote(token);button.classList.remove("pressed");};
      button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("lostpointercapture",release);
      const label=document.createElement("span");label.textContent=noteName(midi);
      marker.append(button,label);keyboard.append(marker);
    });
    renderScaleDetails(data);
  }
  function renderScaleDetails(data){
    const notes=$("scaleNotes"),intervals=$("scaleIntervals");notes.innerHTML="";intervals.innerHTML="";
    data.steps.forEach((q,i)=>{
      const item=document.createElement("div");item.className="scale-note"+(i===0?" root-note":"");
      const name=document.createElement("b");name.textContent=noteName(data.root+q/2);
      const detail=document.createElement("small");detail.textContent=i===0?"القرار / البداية":i===data.steps.length-1?"الجواب / الأوكتاف":"الدرجة "+(i+1);
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
      const midi=pianoState.notes[pianoState.sequenceIndex++];playPianoNote(midi,noteName(midi),.48);pianoState.sequenceTimer=setTimeout(next,560);};
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


  function initNavigation(){
    const nav=$("pageNavigation");
    nav.addEventListener("change",()=>{
      document.querySelectorAll(".site-page").forEach(page=>page.hidden=page.id!==nav.value);
      window.scrollTo({top:0,behavior:"smooth"});
      if(nav.value==="maqamPage")buildPiano();
    });
  }

  $("instrumentGrid").addEventListener("click",e=>{const b=e.target.closest("[data-instrument]");if(!b)return;state.instrument=b.dataset.instrument;document.querySelectorAll(".instrument").forEach(x=>x.classList.toggle("active",x===b));renderTuning();});
  $("tuningSelect").addEventListener("change",e=>{state.tuningIndex=Number(e.target.value);state.stringIndex=0;$("tuningNote").textContent=currentTuning().note;renderStrings();});
  $("startButton").addEventListener("click",start);$("stopButton").addEventListener("click",stop);$("playReference").addEventListener("click",playReference);
  renderTuning();
  initMaqam();
  initNavigation();
})();