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
      {id:"common",name:"مرجع الأوتار G D A E",note:"مرجع الأوتار الشائع للكمان؛ أداء المقامات قد يستخدم درجات غير متساوية التوزيع. اضبط المرجع حسب المدرسة والعازف.",strings:[["صول","G3",195.998],["ري","D4",293.665],["لا","A4",440],["مي","E5",659.255]]},
      {id:"custom",name:"ضبط مخصص",note:"يمكنك تعديل تردد كل وتر بالنقر المزدوج على بطاقة الوتر.",strings:[["صول","G3",195.998],["ري","D4",293.665],["لا","A4",440],["مي","E5",659.255]]}
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
  $("instrumentGrid").addEventListener("click",e=>{const b=e.target.closest("[data-instrument]");if(!b)return;state.instrument=b.dataset.instrument;document.querySelectorAll(".instrument").forEach(x=>x.classList.toggle("active",x===b));renderTuning();});
  $("tuningSelect").addEventListener("change",e=>{state.tuningIndex=Number(e.target.value);state.stringIndex=0;$("tuningNote").textContent=currentTuning().note;renderStrings();});
  $("startButton").addEventListener("click",start);$("stopButton").addEventListener("click",stop);$("playReference").addEventListener("click",playReference);
  renderTuning();
})();