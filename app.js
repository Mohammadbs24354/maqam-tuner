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
      {id:"common",name:"الدوزان الشرقي: صول–ري–صول–ري (G D G D)",note:"أحد الدوزانات المستخدمة لدى بعض العازفين من الغليظ إلى الرفيع: صول، ري، صول، ري. ليس معياراً موحداً؛ قد يختلف حسب المدرسة وعدد الأوتار.",strings:[["صول","G3",195.998],["ري","D4",293.665],["صول","G4",391.995],["ري","D5",587.33]]},
      {id:"custom",name:"ضبط مخصص",note:"يمكنك تعديل تردد كل وتر بالنقر المزدوج على بطاقة الوتر.",strings:[["صول","G3",195.998],["ري","D4",293.665],["صول","G4",391.995],["ري","D5",587.33]]}
    ]}
  };
  const $ = id => document.getElementById(id);
  const state = {instrument:"oud",tuningIndex:0,stringIndex:0,stream:null,context:null,analyser:null,buffer:null,raf:0,selectedFrequency:0,starting:false,startToken:0,lastAnalysisAt:0};
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
    const now=performance.now();
    // Avoid running pitch detection on every display frame.
    if(now-state.lastAnalysisAt>=40){
      state.lastAnalysisAt=now;
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
    }
    state.raf=requestAnimationFrame(tick);
  }
  async function start(){
    if(state.starting||state.stream)return;
    $("errorMessage").hidden=true;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showError("المتصفح لا يدعم الوصول إلى الميكروفون. افتح الموقع عبر HTTPS أو localhost واستخدم متصفحاً حديثاً.");return;}
    state.starting=true;
    const token=++state.startToken;
    $("startButton").disabled=true;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      if(token!==state.startToken){stream.getTracks().forEach(track=>track.stop());return;}
      state.stream=stream;
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass)throw new Error("Web Audio API is not supported");
      state.context=new AudioContextClass();
      if(state.context.state==="suspended")await state.context.resume();
      if(token!==state.startToken){stream.getTracks().forEach(track=>track.stop());return;}
      const source=state.context.createMediaStreamSource(stream);state.analyser=state.context.createAnalyser();state.analyser.fftSize=4096;state.analyser.smoothingTimeConstant=.15;source.connect(state.analyser);
      state.buffer=new Float32Array(state.analyser.fftSize);state.lastAnalysisAt=0;state.starting=false;$("stopButton").disabled=false;$("micStatus").classList.add("on");$("micStatus").innerHTML="<i></i> يستمع الآن";$("pitchState").textContent="استمع إلى الوتر";
      tick();
    }catch(err){
      if(token!==state.startToken)return;
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
    state.startToken++;state.starting=false;state.lastAnalysisAt=0;
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
  const maqamVoices={
    piano:{name:"بيانو مسجل",folder:"piano",ext:"ogg",samples:[["C1",24],["C2",36],["C3",48],["C4",60],["C5",72],["C6",84],["C7",96],["C8",108]],attack:.008,release:.2,volume:.22,oneShot:true},
    electricGuitar:{name:"جيتار كهربائي مسجل",folder:"electricGuitar",ext:"ogg",samples:[["E2",40],["C3",48],["C4",60],["C5",72],["C6",84]],attack:.004,release:.14,volume:.25,oneShot:true},
    nylonGuitar:{name:"جيتار كلاسيكي مسجل",folder:"nylon",ext:"ogg",samples:[["E2",40],["A2",45],["E3",52],["A3",57],["E4",64],["E5",76]],attack:.004,release:.13,volume:.28,oneShot:true},
    steelGuitar:{name:"جيتار أكوستيك مسجل",folder:"steel",ext:"ogg",samples:[["E2",40],["A2",45],["E3",52],["A3",57],["E4",64],["E5",76]],attack:.004,release:.13,volume:.25,oneShot:true},
    flute:{name:"فلوت مسجل",folder:"flute",ext:"ogg",samples:[["C4",60],["C5",72],["C6",84],["C7",96]],attack:.035,release:.16,volume:.24,oneShot:false},
    violin:{name:"كمان مسجل",folder:"violin",ext:"ogg",samples:[["G3",55],["C4",60],["G4",67],["C5",72],["G5",79],["C6",84]],attack:.045,release:.2,volume:.2,oneShot:false},
    cello:{name:"تشيللو مسجل",folder:"cello",ext:"ogg",samples:[["C2",36],["C3",48],["C4",60],["C5",72]],attack:.05,release:.2,volume:.25,oneShot:false},
    saxophone:{name:"ساكسفون مسجل",folder:"saxophone",ext:"ogg",samples:[["E3",52],["C4",60],["E4",64],["A4",69],["C5",72],["E5",76]],attack:.025,release:.17,volume:.24,oneShot:false},
    qanun:{name:"قانون تركي مسجل",folder:"qanun",ext:"m4a",samples:[["F3",53],["G3",55],["A3",57],["B3",59],["Cs4",61],["Ds4",63],["F4",65],["G4",67],["A4",69],["B4",71],["Cs5",73],["Ds5",75],["F5",77],["G5",79],["A5",81],["B5",83],["Cs6",85],["Ds6",87]],attack:.003,release:.12,volume:.32,oneShot:true},
    oud:{name:"عود (صوت إلكتروني تجريبي)",wave:"triangle",partials:[1,.58,.3,.16,.08,.035],attack:.004,decay:.14,sustain:.025,release:.16,filter:5200},
    nay:{name:"ناي (صوت إلكتروني تجريبي)",wave:"sine",partials:[1,.16,.055,.018],attack:.09,decay:.12,sustain:.72,release:.2,filter:3000}
  };
  const pianoState={context:null,voices:[],sequenceTimer:null,sequenceIndex:0,notes:[],sampleBuffers:new Map(),playbackToken:0};
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
  let maqamOctaveShift=0;
  const MIN_MAQAM_OCTAVE=-2,MAX_MAQAM_OCTAVE=2;
  function getMaqamData(){
    const m=maqams[$("maqamSelect").value];
    const selected=$("maqamRoot").value;
    const baseRoot=selected===""?m.root:Number(selected);
    const root=baseRoot+(maqamOctaveShift*12);
    return {...m,root,labels:root===m.root?m.labels:null,notes:m.steps.map(q=>root+q/2)};
  }
  function updateMaqamOctaveControls(root){
    const octave=Math.floor(root/12)-1;
    $("maqamOctaveLabel").textContent="الأوكتاف "+octave;
    $("octaveUp").disabled=maqamOctaveShift>=MAX_MAQAM_OCTAVE;
    $("octaveDown").disabled=maqamOctaveShift<=MIN_MAQAM_OCTAVE;
  }
  const heldPianoNotes=new Map();
  const releasedPianoKeys=new Set();
  function closestMaqamSample(preset,midi){
    return preset.samples.reduce((best,item)=>!best||Math.abs(item[1]-midi)<Math.abs(best[1]-midi)?item:best,null);
  }
  async function loadMaqamSample(ctx,preset,sample){
    const url="assets/audio/"+preset.folder+"/"+sample[0]+"."+preset.ext;
    if(pianoState.sampleBuffers.has(url))return pianoState.sampleBuffers.get(url);
    const loading=(async()=>{
      const response=await fetch(url);
      if(!response.ok)throw new Error("تعذر تحميل العينة "+url);
      const encoded=await response.arrayBuffer();
      return ctx.decodeAudioData(encoded.slice(0));
    })();
    pianoState.sampleBuffers.set(url,loading);
    try{return await loading;}catch(error){pianoState.sampleBuffers.delete(url);throw error;}
  }
  async function preloadMaqamSamples(ctx,preset,notes){
    const selected=new Map();
    notes.forEach(midi=>{const sample=closestMaqamSample(preset,midi);selected.set(sample[0],sample);});
    await Promise.all([...selected.values()].map(sample=>loadMaqamSample(ctx,preset,sample)));
  }
  async function createMaqamVoice(ctx,midi,duration){
    const preset=maqamVoices[$("maqamVoice").value]||maqamVoices.piano;
    if(preset.samples){
      const sample=closestMaqamSample(preset,midi);
      const buffer=await loadMaqamSample(ctx,preset,sample);
      const now=ctx.currentTime;
      const source=ctx.createBufferSource(),envelope=ctx.createGain();
      source.buffer=buffer;
      source.playbackRate.setValueAtTime(Math.pow(2,(midi-sample[1])/12),now);
      envelope.gain.setValueAtTime(.0001,now);
      envelope.gain.linearRampToValueAtTime(preset.volume,now+preset.attack);
      source.connect(envelope);envelope.connect(ctx.destination);
      let stopped=false,voice;
      voice={
        stop(){
          if(stopped)return;stopped=true;
          const time=ctx.currentTime;
          envelope.gain.cancelScheduledValues(time);
          envelope.gain.setTargetAtTime(.0001,time,.035);
          try{source.stop(time+.18);}catch(error){}
        }
      };
      if(Number.isFinite(duration)&&!preset.oneShot){
        envelope.gain.setTargetAtTime(.0001,now+duration,preset.release);
        try{source.stop(now+duration+preset.release*4);}catch(error){}
      }
      source.onended=()=>{
        try{source.disconnect();envelope.disconnect();}catch(error){}
        pianoState.voices=pianoState.voices.filter(item=>item!==voice);
      };
      pianoState.voices.push(voice);source.start(now);
      return voice;
    }
    const now=ctx.currentTime;
    const frequency=A4*Math.pow(2,(midi-69)/12);
    const envelope=ctx.createGain(),filter=ctx.createBiquadFilter();
    filter.type="lowpass";filter.frequency.setValueAtTime(preset.filter,now);filter.Q.value=.55;
    filter.connect(envelope);envelope.connect(ctx.destination);
    envelope.gain.setValueAtTime(.0001,now);
    envelope.gain.linearRampToValueAtTime(.19,now+preset.attack);
    envelope.gain.setTargetAtTime(.19*preset.sustain,now+preset.attack,preset.decay);
    const oscillators=preset.partials.map((level,index)=>{
      const osc=ctx.createOscillator(),partial=ctx.createGain();
      osc.type=preset.wave;osc.frequency.setValueAtTime(frequency*(index+1),now);
      partial.gain.value=level/(1+index*.12);osc.connect(partial);partial.connect(filter);osc.start(now);
      return osc;
    });
    let stopped=false,voice;
    voice={
      stop(){
        if(stopped)return;stopped=true;
        const time=ctx.currentTime;
        envelope.gain.cancelScheduledValues(time);
        envelope.gain.setTargetAtTime(.0001,time,.045);
        oscillators.forEach(osc=>{try{osc.stop(time+.24);}catch(error){}});
      }
    };
    if(Number.isFinite(duration)){
      envelope.gain.setTargetAtTime(.0001,now+duration,preset.release);
      oscillators.forEach(osc=>{try{osc.stop(now+duration+preset.release*4);}catch(error){}});
    }
    oscillators[0].onended=()=>{filter.disconnect();envelope.disconnect();pianoState.voices=pianoState.voices.filter(item=>item!==voice);};
    pianoState.voices.push(voice);
    return voice;
  }
  function stopHeldPianoNote(key){
    const held=heldPianoNotes.get(key);if(!held){releasedPianoKeys.add(key);return;}
    held.voice.stop();heldPianoNotes.delete(key);
  }
  async function startHeldPianoNote(midi,label,key){
    try{
      releasedPianoKeys.delete(key);
      if(heldPianoNotes.has(key))return;
      if(!pianoState.context)pianoState.context=new (window.AudioContext||window.webkitAudioContext)();
      const ctx=pianoState.context;if(ctx.state==="suspended")await ctx.resume();
      if(releasedPianoKeys.has(key)){releasedPianoKeys.delete(key);return;}
      if(heldPianoNotes.has(key))return;
      const voice=await createMaqamVoice(ctx,midi,Infinity);
      if(releasedPianoKeys.has(key)){releasedPianoKeys.delete(key);voice.stop();return;}
      heldPianoNotes.set(key,{voice});
      $("pianoNowPlaying").textContent="تعزف الآن: "+label+" · "+(A4*Math.pow(2,(midi-69)/12)).toFixed(2)+" Hz · "+maqamVoices[$("maqamVoice").value].name;
    }catch(error){$("pianoNowPlaying").textContent="تعذر تشغيل الصوت. تحقق من إعدادات الصوت.";}
  }
  function buildPiano(){
    const data=getMaqamData(),keyboard=$("pianoKeyboard");
    keyboard.innerHTML="";
    $("pianoMaqamName").textContent="مقام "+data.name+" · "+noteName(data.root);
    updateMaqamOctaveControls(data.root);
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
  async function playPianoNote(midi,label,duration=.65,token=pianoState.playbackToken){
    try{
      if(!pianoState.context)pianoState.context=new (window.AudioContext||window.webkitAudioContext)();
      const ctx=pianoState.context;if(ctx.state==="suspended")await ctx.resume();
      const voice=await createMaqamVoice(ctx,midi,duration);
      if(token!==pianoState.playbackToken){voice.stop();return;}
      $("pianoNowPlaying").textContent="النغمة: "+label+" · "+(A4*Math.pow(2,(midi-69)/12)).toFixed(2)+" Hz · "+maqamVoices[$("maqamVoice").value].name;
    }catch(error){if(token===pianoState.playbackToken)$("pianoNowPlaying").textContent="تعذر تشغيل الصوت. جرّب الضغط على المفتاح مرة أخرى.";}
  }
  function stopScalePlayback(){
    pianoState.playbackToken++;
    if(pianoState.sequenceTimer){clearTimeout(pianoState.sequenceTimer);pianoState.sequenceTimer=null;}
    pianoState.voices.forEach(voice=>voice.stop());
    pianoState.voices=[];
    [...heldPianoNotes.keys()].forEach(stopHeldPianoNote);
    $("playScale").disabled=false;$("stopScale").disabled=true;
    $("pianoNowPlaying").textContent="تم إيقاف العزف.";
  }
  async function playFullScale(){
    stopScalePlayback();
    const token=pianoState.playbackToken,data=getMaqamData();
    pianoState.notes=data.steps.map(q=>data.root+q/2);pianoState.sequenceIndex=0;
    const preset=maqamVoices[$("maqamVoice").value]||maqamVoices.piano;
    $("playScale").disabled=true;$("stopScale").disabled=false;
    if(preset.samples){
      $("pianoNowPlaying").textContent="جارٍ تجهيز عينات "+preset.name+"...";
      try{if(!pianoState.context)pianoState.context=new (window.AudioContext||window.webkitAudioContext)();if(pianoState.context.state==="suspended")await pianoState.context.resume();await preloadMaqamSamples(pianoState.context,preset,pianoState.notes);}
      catch(error){if(token===pianoState.playbackToken){$("playScale").disabled=false;$("stopScale").disabled=true;$("pianoNowPlaying").textContent="تعذر تحميل عينات الآلة. تحقق من الاتصال ثم حاول مجدداً.";}return;}
    }
    if(token!==pianoState.playbackToken)return;
    const next=()=>{if(token!==pianoState.playbackToken)return;if(pianoState.sequenceIndex>=pianoState.notes.length){pianoState.sequenceTimer=null;$("playScale").disabled=false;$("stopScale").disabled=true;$("pianoNowPlaying").textContent="انتهى عزف مقام "+data.name+".";return;}
      const index=pianoState.sequenceIndex++,midi=pianoState.notes[index],label=data.labels?.[index]||noteName(midi);playPianoNote(midi,label,.48,token);pianoState.sequenceTimer=setTimeout(next,560);};
    next();
  }
  function updateMaqamVoiceSource(){
    const preset=maqamVoices[$("maqamVoice").value]||maqamVoices.piano;
    $("maqamVoiceSource").textContent=preset.samples?"عينة مسجلة من آلة حقيقية · تُحمّل عند أول استخدام وتُحفظ مؤقتاً لتشغيل أسرع.":"صوت إلكتروني تجريبي، وليس تسجيلاً حقيقياً لهذه الآلة.";
  }
  function initMaqam(){
    const select=$("maqamRoot");
    rootChoices.forEach(item=>{const option=document.createElement("option");option.value=String(item.value);option.textContent=item.label;select.append(option);});
    function updateRootDefault(){const m=maqams[$("maqamSelect").value];select.value=String(m.root);}
    $("maqamSelect").addEventListener("change",()=>{stopScalePlayback();updateRootDefault();buildPiano();});
    select.addEventListener("change",()=>{stopScalePlayback();buildPiano();});
    $("maqamVoice").addEventListener("change",()=>{stopScalePlayback();updateMaqamVoiceSource();buildPiano();$("pianoNowPlaying").textContent="تم تغيير صوت الآلة إلى "+maqamVoices[$("maqamVoice").value].name+".";});
    $("octaveUp").addEventListener("click",()=>{if(maqamOctaveShift>=MAX_MAQAM_OCTAVE)return;stopScalePlayback();maqamOctaveShift++;buildPiano();});
    $("octaveDown").addEventListener("click",()=>{if(maqamOctaveShift<=MIN_MAQAM_OCTAVE)return;stopScalePlayback();maqamOctaveShift--;buildPiano();});
    $("playScale").addEventListener("click",playFullScale);$("stopScale").addEventListener("click",stopScalePlayback);
    updateRootDefault();updateMaqamVoiceSource();buildPiano();
  }



  const drumNames={dum:"دُم",tak:"تَك",daf:"دَف",riq:"رَق",clap:"تصفيق",cymbal:"صَنج",snare:"سنير",bass:"باس",slap:"صفعة",sagat:"صاجات",shaker:"شيكر",tom:"توم",hihat:"هاي هات",openHat:"هاي هات مفتوح",ride:"رايد"};
  const drumKeys={dum:"1",tak:"2",daf:"3",riq:"4",clap:"5",cymbal:"6",snare:"7",bass:"8",slap:"9",sagat:"0",shaker:"Q",tom:"W",hihat:"E",ride:"R",openHat:"T"};
  const rhythmPatterns={
    maqsum:{name:"مقسوم",beats:4,description:"مقسوم شرقي رباعي: دُم أساسي مع تكّات ورقّات تملأ الحركة.",steps:{0:["dum"],3:["tak"],4:["tak"],6:["dum"],8:["dum"],11:["tak"],12:["tak"],14:["tak"]}},
    baladi:{name:"بلدي",beats:4,description:"بلدي ثقيل نسبياً، مع دُم واضح وتكّات متبادلة ولمسات دف.",steps:{0:["dum","daf"],2:["tak"],4:["dum"],6:["tak","riq"],8:["dum","daf"],10:["tak"],12:["dum"],14:["tak","riq"]}},
    malfuf:{name:"ملفوف",beats:2,description:"ملفوف سريع في ميزان 2/4، مناسب للدخولات والرقصات.",steps:{0:["dum"],2:["tak"],4:["tak"],6:["dum","riq"]}},
    saidi:{name:"صعيدي",beats:4,description:"إيقاع صعيدي حيوي بضربات دُم متتابعة وتكّات قوية.",steps:{0:["dum"],2:["tak"],4:["dum"],6:["dum","tak"],8:["tak"],10:["dum"],12:["tak"],14:["tak","riq"]}},
    wahda:{name:"وحدة كبيرة",beats:4,description:"وحدة كبيرة هادئة بأربع نبضات أساسية ومساحة واضحة بين الضربات.",steps:{0:["dum","daf"],4:["tak"],8:["dum"],12:["tak","riq"]}},
    jazzSwing:{name:"جاز سوينغ",beats:4,stepsPerBeat:3,description:"سوينغ ثلاثي مع رايد متأرجح، وباس على الأولى والثالثة وسنير على الثانية والرابعة.",steps:{0:["bass","ride"],2:["ride"],3:["snare","ride"],5:["ride"],6:["bass","ride"],8:["ride"],9:["snare","ride"],11:["ride"]}},
    bluesShuffle:{name:"بلوز شافل",beats:4,stepsPerBeat:3,description:"شافل ثلاثي متأرجح مع باس على الأولى والثالثة وسنير على الثانية والرابعة.",steps:{0:["bass","hihat"],2:["hihat"],3:["snare","hihat"],5:["hihat"],6:["bass","hihat"],8:["hihat"],9:["snare","hihat"],11:["hihat"]}},
    house:{name:"هاوس",beats:4,description:"Four-on-the-floor: ركلة في كل نبضة، تصفيق على الثانية والرابعة وهاي هات على النبضات المقابلة.",steps:{0:["bass","hihat"],2:["hihat"],4:["bass","clap","hihat"],6:["hihat"],8:["bass","hihat"],10:["hihat"],12:["bass","clap","hihat"],14:["hihat"]}},
    deepHouse:{name:"ديب هاوس",beats:4,description:"ديب هاوس بركلة ثابتة وتصفيق خلفي وهاي هات متباعد يمنح الإيقاع مساحة.",steps:{0:["bass","hihat"],3:["hihat"],4:["bass","clap"],7:["hihat"],8:["bass","hihat"],11:["hihat"],12:["bass","clap"],15:["hihat"]}},
    disco:{name:"ديسكو",beats:4,description:"ديسكو بأربع ركلات منتظمة وتصفيق على الثانية والرابعة وهاي هات مفتوح.",steps:{0:["bass","hihat"],2:["hihat"],4:["bass","clap","openHat"],6:["hihat"],8:["bass","hihat"],10:["hihat"],12:["bass","clap","openHat"],14:["hihat"]}},
    rock:{name:"روك",beats:4,description:"روك أساسي: ركلة على الأولى والثالثة، سنير على الثانية والرابعة وهاي هات ثابت.",steps:{0:["bass","hihat"],2:["hihat"],4:["snare","hihat"],6:["hihat"],8:["bass","hihat"],10:["hihat"],12:["snare","hihat"],14:["hihat"]}},
    funk:{name:"فانك",beats:4,description:"فانك متزامن مع ركلات متقطعة وسنير خلفي وهاي هات متحرك.",steps:{0:["bass","hihat"],3:["snare","hihat"],5:["bass","hihat"],7:["snare","hihat"],8:["bass"],10:["hihat"],12:["snare","hihat"],14:["bass","hihat"]}},
    reggae:{name:"ريغي",beats:4,description:"One Drop: تركيز الركلة والسنير معاً على النبضة الثالثة، مع هاي هات خفيف.",steps:{2:["hihat"],4:["hihat"],6:["hihat"],8:["bass","snare","hihat"],10:["hihat"],12:["hihat"],14:["hihat"]}},
    bossaNova:{name:"بوسا نوفا",beats:4,description:"بوسا نوفا هادئة مع نمط باس متداخل وريم/سنير خفيف وشيكر مستمر.",steps:{0:["bass","shaker"],3:["shaker"],4:["snare","shaker"],6:["bass","shaker"],8:["bass","shaker"],10:["shaker"],12:["snare","shaker"],14:["bass","shaker"]}}
  };
  let drumAudioContext=null,drumMaster=null,drumCompressor=null;
  let effectsVolumeValue=.72;
  const rhythmState={timer:null,nextStep:0,nextTime:0,bpm:100,playing:false,pattern:"maqsum"};
  function getDrumContext(){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)throw new Error("Web Audio API غير مدعوم في هذا المتصفح");
    if(!drumAudioContext||drumAudioContext.state==="closed"){drumAudioContext=new AudioCtx();drumMaster=null;drumCompressor=null;}
    if(!drumMaster){
      drumMaster=drumAudioContext.createGain();drumCompressor=drumAudioContext.createDynamicsCompressor();
      drumMaster.gain.value=.78;drumCompressor.threshold.value=-16;drumCompressor.knee.value=18;
      drumCompressor.ratio.value=4;drumCompressor.attack.value=.004;drumCompressor.release.value=.18;
      drumMaster.connect(drumCompressor);drumCompressor.connect(drumAudioContext.destination);
    }
    return drumAudioContext;
  }
  function drumNoise(ctx,output,{duration=.12,filter="highpass",frequency=1200,level=.4,decay=.1,at=ctx.currentTime,q=.7}={}){
    const length=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<length;i++){const progress=i/length;samples[i]=(Math.random()*2-1)*Math.pow(1-progress,2.2);}
    const source=ctx.createBufferSource(),filterNode=ctx.createBiquadFilter(),amp=ctx.createGain();
    source.buffer=buffer;filterNode.type=filter;filterNode.frequency.setValueAtTime(frequency,at);filterNode.Q.value=q;
    amp.gain.setValueAtTime(Math.max(.0001,level),at);amp.gain.exponentialRampToValueAtTime(.0001,at+Math.max(.012,Math.min(decay,duration)));
    source.connect(filterNode);filterNode.connect(amp);amp.connect(output);source.start(at);source.stop(at+duration);
  }
  function drumTone(ctx,output,{start=120,end=60,duration=.2,level=.6,wave="sine",at=ctx.currentTime,detune=0}={}){
    const osc=ctx.createOscillator(),amp=ctx.createGain();osc.type=wave;
    osc.frequency.setValueAtTime(Math.max(1,start),at);osc.frequency.exponentialRampToValueAtTime(Math.max(1,end),at+duration);
    osc.detune.setValueAtTime(detune,at);amp.gain.setValueAtTime(Math.max(.0001,level),at);
    amp.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(amp);amp.connect(output);osc.start(at);osc.stop(at+duration+.015);
  }
  function drumMetal(ctx,output,{frequencies,duration=.3,level=.08,at=ctx.currentTime}={}){
    frequencies.forEach((frequency,index)=>drumTone(ctx,output,{start:frequency*(1+(index%2)*.003),end:frequency*.995,duration,level:level/(1+index*.22),wave:"sine",at,detune:index%2?7:-5}));
  }
  function playDrumSound(ctx,type,at=ctx.currentTime){
    const voice=ctx.createGain();voice.gain.setValueAtTime(.9,at);voice.connect(drumMaster);
    if(type==="dum"){
      drumTone(ctx,voice,{start:145,end:48,duration:.28,level:.9,at});drumTone(ctx,voice,{start:310,end:185,duration:.055,level:.16,at});
      drumNoise(ctx,voice,{duration:.045,filter:"lowpass",frequency:900,level:.12,decay:.035,at});
    }else if(type==="bass"){
      drumTone(ctx,voice,{start:155,end:43,duration:.34,level:.95,at});drumTone(ctx,voice,{start:950,end:180,duration:.025,level:.13,at});
      drumNoise(ctx,voice,{duration:.035,filter:"lowpass",frequency:1000,level:.1,decay:.025,at});
    }else if(type==="tak"){
      drumTone(ctx,voice,{start:245,end:125,duration:.065,level:.24,wave:"triangle",at});
      drumNoise(ctx,voice,{duration:.085,filter:"bandpass",frequency:2450,level:.62,decay:.065,at,q:1.3});
    }else if(type==="snare"){
      drumTone(ctx,voice,{start:185,end:125,duration:.12,level:.32,at});drumTone(ctx,voice,{start:330,end:205,duration:.045,level:.13,wave:"triangle",at});
      drumNoise(ctx,voice,{duration:.19,filter:"highpass",frequency:1750,level:.62,decay:.16,at,q:.8});
    }else if(type==="daf"){
      drumTone(ctx,voice,{start:112,end:72,duration:.22,level:.56,at});drumTone(ctx,voice,{start:178,end:132,duration:.12,level:.2,at});
      drumNoise(ctx,voice,{duration:.2,filter:"bandpass",frequency:1150,level:.38,decay:.18,at,q:1.1});
    }else if(type==="riq"){
      drumTone(ctx,voice,{start:220,end:145,duration:.09,level:.18,at});drumNoise(ctx,voice,{duration:.11,filter:"highpass",frequency:5100,level:.38,decay:.1,at});
      drumMetal(ctx,voice,{frequencies:[2450,3180,4070,5210,6380],duration:.2,level:.105,at});
    }else if(type==="clap"){
      [0,.018,.038,.061].forEach((offset,index)=>drumNoise(ctx,voice,{duration:.075,filter:"bandpass",frequency:1250+index*180,level:index===3?.48:.3,decay:.055,at:at+offset,q:1.2}));
    }else if(type==="cymbal"){
      drumNoise(ctx,voice,{duration:1.05,filter:"highpass",frequency:7200,level:.38,decay:1.02,at,q:.55});
      drumMetal(ctx,voice,{frequencies:[1730,2410,3190,4020,5180,6370],duration:.85,level:.075,at});
    }else if(type==="hihat"){
      drumNoise(ctx,voice,{duration:.055,filter:"highpass",frequency:8200,level:.34,decay:.045,at,q:.5});
      drumMetal(ctx,voice,{frequencies:[6100,7900,9300],duration:.045,level:.025,at});
    }else if(type==="openHat"){
      drumNoise(ctx,voice,{duration:.34,filter:"highpass",frequency:7600,level:.32,decay:.31,at,q:.55});
      drumMetal(ctx,voice,{frequencies:[5800,7400,9100],duration:.3,level:.035,at});
    }else if(type==="ride"){
      drumNoise(ctx,voice,{duration:.42,filter:"highpass",frequency:6500,level:.17,decay:.39,at,q:.65});
      drumMetal(ctx,voice,{frequencies:[2300,3470,4810,6120,7390],duration:.36,level:.075,at});
    }else if(type==="slap"){
      drumTone(ctx,voice,{start:235,end:105,duration:.095,level:.58,wave:"triangle",at});
      drumNoise(ctx,voice,{duration:.065,filter:"bandpass",frequency:1450,level:.55,decay:.055,at,q:1.4});
    }else if(type==="sagat"){
      drumMetal(ctx,voice,{frequencies:[2980,3890,4870,5780,6910],duration:.13,level:.09,at});
      drumNoise(ctx,voice,{duration:.13,filter:"highpass",frequency:6900,level:.2,decay:.12,at,q:.55});
    }else if(type==="shaker"){
      [0,.035,.075].forEach((offset,index)=>drumNoise(ctx,voice,{duration:.055,filter:"highpass",frequency:4300+index*500,level:index===1?.22:.14,decay:.045,at:at+offset,q:.65}));
    }else if(type==="tom"){
      drumTone(ctx,voice,{start:225,end:92,duration:.24,level:.68,at});drumTone(ctx,voice,{start:410,end:260,duration:.08,level:.09,wave:"triangle",at});
    }
    const tail=type==="cymbal"?1.1:type==="ride" ? .48 : type==="openHat" ? .38 : .38;
    voice.gain.setTargetAtTime(.0001,at+tail,.035);
    window.setTimeout(()=>{try{voice.disconnect();}catch{}},Math.max(700,tail*1500));
  }
  const effectLibrary={
    glassTap:{name:"طرق على كأس زجاجي",url:"https://commons.wikimedia.org/wiki/Special:FilePath/Binging_glass.ogg",source:"https://commons.wikimedia.org/wiki/File:Binging_glass.ogg",loopable:false},
    crow:{name:"نداء الغراب",url:"https://commons.wikimedia.org/wiki/Special:FilePath/American_Crow.ogg",source:"https://commons.wikimedia.org/wiki/File:American_Crow.ogg",loopable:false},
    leaves:{name:"المشي على أوراق الشجر",url:"https://commons.wikimedia.org/wiki/Special:FilePath/Forest_track_3.ogg",source:"https://commons.wikimedia.org/wiki/File:Forest_track_3.ogg",loopable:false},
    sea:{name:"أمواج الماء",url:"https://commons.wikimedia.org/wiki/Special:FilePath/On_a_pebble_beach.ogg",source:"https://commons.wikimedia.org/wiki/File:On_a_pebble_beach.ogg",loopable:true},
    thunder:{name:"المطر والرعد",url:"https://commons.wikimedia.org/wiki/Special:FilePath/Rain_and_thunder.ogg",source:"https://commons.wikimedia.org/wiki/File:Rain_and_thunder.ogg",loopable:true},
    gunshot:{name:"طلقات صوتية محاكاة",url:"https://commons.wikimedia.org/wiki/Special:FilePath/Gunshots_8.ogg",source:"https://commons.wikimedia.org/wiki/File:Gunshots_8.ogg",loopable:false},
    wind:{name:"عواء الرياح",url:"https://commons.wikimedia.org/wiki/Special:FilePath/Howling_wind.ogg",source:"https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",loopable:true},
    rain:{name:"صوت المطر",url:"https://commons.wikimedia.org/wiki/Special:FilePath/Rain_(1).ogg",source:"https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",loopable:true}
  };
  let currentEffectAudio=null,currentEffectType=null,effectPlaybackToken=0;
  function clearEffectCard(){
    document.querySelectorAll(".effect-card.is-playing").forEach(card=>card.classList.remove("is-playing"));
  }
  function stopSoundEffect(updateStatus=true){
    effectPlaybackToken++;
    if(currentEffectAudio){
      currentEffectAudio.pause();
      currentEffectAudio.removeAttribute("src");
      currentEffectAudio.load();
      currentEffectAudio=null;
    }
    currentEffectType=null;
    clearEffectCard();
    if(updateStatus&&$("effectsStatus"))$("effectsStatus").textContent="تم إيقاف الصوت.";
  }
  async function playSoundEffect(type){
    const item=effectLibrary[type];
    if(!item)return;
    stopSoundEffect(false);
    const token=effectPlaybackToken;
    const audio=new Audio();
    audio.preload="none";
    audio.src=item.url;
    audio.volume=effectsVolumeValue;
    const loopControl=$("effectsLoop");
    audio.loop=Boolean(item.loopable&&loopControl&&loopControl.checked);
    currentEffectAudio=audio;
    currentEffectType=type;
    const card=document.querySelector('.effect-card[data-effect="'+type+'"]');
    if(card)card.classList.add("is-playing");
    const status=$("effectsStatus");
    if(status)status.textContent="جارٍ تحميل التسجيل: "+item.name+"…";
    audio.addEventListener("ended",()=>{
      if(token!==effectPlaybackToken)return;
      currentEffectAudio=null;currentEffectType=null;clearEffectCard();
      if(status)status.textContent="انتهى التسجيل: "+item.name;
    },{once:true});
    audio.addEventListener("error",()=>{
      if(token!==effectPlaybackToken)return;
      currentEffectAudio=null;currentEffectType=null;clearEffectCard();
      if(status)status.textContent="تعذر تحميل التسجيل من المصدر. تحقق من الاتصال بالإنترنت ثم حاول مجدداً.";
    },{once:true});
    try{
      await audio.play();
      if(token!==effectPlaybackToken){audio.pause();return;}
      if(status)status.textContent="يُشغّل الآن: "+item.name;
    }catch(error){
      if(token!==effectPlaybackToken)return;
      currentEffectAudio=null;currentEffectType=null;clearEffectCard();
      if(status)status.textContent="لم يبدأ التشغيل. اضغط مرة أخرى أو تحقق من اتصال الإنترنت.";
    }
  }
  function initSoundEffects(){
    const grid=$("effectsGrid");if(!grid)return;
    grid.addEventListener("click",event=>{
      const card=event.target.closest(".effect-card[data-effect]");
      if(card)playSoundEffect(card.dataset.effect);
    });
    const volume=$("effectsVolume"),output=$("effectsVolumeValue");
    if(volume)volume.addEventListener("input",event=>{
      effectsVolumeValue=Number(event.target.value)/100;
      if(currentEffectAudio)currentEffectAudio.volume=effectsVolumeValue;
      if(output)output.textContent=event.target.value+"%";
    });
    const stop=$("effectsStop");
    if(stop)stop.addEventListener("click",()=>stopSoundEffect());
    const loop=$("effectsLoop");
    if(loop)loop.addEventListener("change",()=>{
      if(currentEffectAudio&&effectLibrary[currentEffectType]?.loopable)currentEffectAudio.loop=loop.checked;
    });
    window.addEventListener("pagehide",()=>stopSoundEffect(false));
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
    const stepsPerBeat=pattern.stepsPerBeat||4;
    const beat=Math.floor(step/stepsPerBeat)+1;
    const beatEl=$("rhythmBeat");
    if(beatEl)beatEl.textContent="النبضة "+beat+" / "+pattern.beats;
    const stepDuration=60/rhythmState.bpm/stepsPerBeat;
    rhythmState.nextTime+=stepDuration;
    rhythmState.nextStep=(step+1)%(pattern.beats*stepsPerBeat);
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

    document.querySelectorAll("[data-rhythm-category]").forEach(button=>{
      button.addEventListener("click",()=>{
        const category=button.dataset.rhythmCategory;
        document.querySelectorAll("[data-rhythm-category]").forEach(tab=>{
          const active=tab===button;
          tab.classList.toggle("active",active);
          tab.setAttribute("aria-pressed",String(active));
        });
        document.querySelectorAll("[data-rhythm-group]").forEach(group=>{
          group.hidden=group.dataset.rhythmGroup!==category;
        });
        const group=document.querySelector('[data-rhythm-group="'+category+'"]');
        const options=group?[...group.querySelectorAll("option")]:[];
        if(options.length && !options.some(option=>option.value===$("rhythmSelect").value)){
          $("rhythmSelect").value=options[0].value;
          $("rhythmDescription").textContent=rhythmPatterns[options[0].value].description;
          if(rhythmState.playing){stopRhythm();startRhythm();}
        }
      });
    });

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
  initSoundEffects();
  initNavigation();
})();
// Real instrument recordings are bundled locally under assets/audio with source credits.
