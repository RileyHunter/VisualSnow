const bg = document.getElementById('bg');
const message = document.getElementById('messages');
const clickable = document.getElementById('clickable');
const snowCnv = document.getElementById('snow');
const palinopsiaCnv = document.getElementById('palinopsia');
const photopsiaCnv = document.getElementById('photopsia');
const BFEPCnv = document.getElementById('BFEP');
const pulsativeCnv = document.getElementById('pulsative');

const delay = 25;

function setMessage(text) {
    message.innerHTML = text;
}

function clearMessage(text) {
    message.innerHTML = '';
}

function toHex(r, g, b, a) {
	return ((a<<24>>>0)+(b<<16>>>0)+(g<<8>>>0)+(r<<0>>>0));
}

function fromHex(hex) {
    let a = (hex & 0xFF000000) >>> 24;
    let b = (hex & 0x00FF0000)>>>16;
    let g = (hex & 0x0000FF00)>>>8;
    let r = (hex & 0x000000FF)>>>0;
    return [r, g, b, a];
}

class Renderable {
	constructor(renderFn, canvas, delay) {
  	this.tick = 0;
    this.delay = delay;
    this.currentIntervalId = null;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    canvas.width = bg.clientWidth;
    canvas.height = bg.clientHeight;
    this.renderFnInner = renderFn;
    this.renderFn = () => this.renderFnInner(this.context, this.tick++);
  }
  
  start() {
  	this.stop();
    this.tick = 0;
    this.currentIntervalId = setInterval(this.renderFn, this.delay);
  }
  
  stop() {
  	if (this.currentIntervalId != null) clearInterval(this.currentIntervalId);
   	this.currentIntervalId = null;
  }
}

function snowRenderFunc(context, tick) {
	if (tick == 0) {
        const idata = context.createImageData(context.canvas.width, context.canvas.height);
        const buffer32 = new Uint32Array(idata.data.buffer);  // get 32-bit view
    function noise() {
      var len = buffer32.length - 1;
      while(len--) buffer32[len] = Math.random() < 0.8 ? 0 : toHex(255, 255, 255, 50);
      context.putImageData(idata, 0, 0);
    }
    this.noise = noise;
  } else {
  	this.noise(context);
  }
}

function palinopsiaRenderFunc(context, tick) {
    if (tick == 0) {
        setMessage('Rendering palinopsia, please wait...')
        var bgCnv = document.createElement('canvas');
        var bgCtx = bgCnv.getContext('2d');
        var img = document.getElementById('bg');
        bgCnv.width = img.width;
        bgCnv.height = img.height;
        bgCtx.drawImage(img, 0, 0 );
        bgCnv.style.marginTop = '500px';
        var bgData = bgCtx.getImageData(0, 0, img.width, img.height);
        var bgBuffer = new Uint32Array(bgData.data.buffer);
        let baseYShift = 25;
        let msPerYCycle = 2000;
        let ticksPerYCycle = msPerYCycle / delay;
        const idata = context.createImageData(context.canvas.width, context.canvas.height);
        const getCoords = n => [n % context.canvas.width, Math.floor(n / context.canvas.width)];
        const [centX, centY] = [Math.floor(context.canvas.width/2), Math.floor(context.canvas.height/2)];
        const buffer32 = new Uint32Array(idata.data.buffer);

        function getYShift(tick) {
            let yShiftPct = (tick % (2 * ticksPerYCycle)) / ticksPerYCycle;
            if (yShiftPct > 1) yShiftPct = 1 - (yShiftPct - 1);
            const yShift = Math.floor(baseYShift * yShiftPct);
            return yShift;
        }

        function getRender(tick) {
            let len = buffer32.length - 1;
            const yShift = getYShift(tick);
            while(len--) {
                const [x, y] = getCoords(len);
                const yDist = Math.abs(y - centY) / (context.canvas.height/2);
                const xDist = Math.abs(x - centX) / (context.canvas.width/2);
                const dist = 255-Math.floor(((xDist**2+yDist**2)**.5)/(2**.5)*255);
                const newLen = y < (context.canvas.height - yShift) ? (len + yShift * context.canvas.width) : y;
                const [r, g, b, a] = fromHex(bgBuffer[newLen]);
                if (r + g + b < (200 * 3) || 1) {
                    const newColour = toHex(255 - r, 255 - g, 255 - b, Math.floor(dist / 4));
                    buffer32[len] = newColour;
                }
            }
            return new ImageData(new Uint8ClampedArray(idata.data), idata.width, idata.height);
        }
        console.log('Rendering palinopsia frames...');
        console.log(ticksPerYCycle);
        this.hasRendered = false;
        this.frames = new Array(ticksPerYCycle * 2);
        function render(tick) {
            const frameOffset = tick % (ticksPerYCycle * 2);
            if (!this.frames[frameOffset]) this.frames[frameOffset] = getRender(tick);
            else if (!this.hasRendered) {
                setMessage('Rendering complete.')
                setTimeout(() => clearMessage(), 3000);
                this.hasRendered = true;
            }
            context.putImageData(this.frames[frameOffset], 0, 0);

        }
        this.render = render;
        this.getRender = getRender;
        console.log('Finished');

        
    } else {
        this.render(tick);
    }
}

function photopsiaRenderFunc(context, tick) {
	if (tick == 0) {
  	this.entities = [];
    this.meanMsPerSpawn = 100;
    this.msLifeCycle = 500;
    this.meanTicksPerSpawn = this.meanMsPerSpawn / this.delay;
    this.tickLifeCycle = this.msLifeCycle / this.delay;
    const radius = 5;
    this.radius = radius;
    this.nextSpawn = this.meanTicksPerSpawn;
    function spawn(tick, ents) {
    	let x = Math.random() * context.canvas.width;
      let y = Math.random() * context.canvas.height;
      let newEnt = {
      	x: x,
        y: y,
        startTick: tick,
        endTick: tick + this.tickLifeCycle,
        radius: this.radius,
      }
      let setGradient = () => {
      	let gradient = context.createRadialGradient(
        	newEnt.x, newEnt.y, 1, 
          newEnt.x, newEnt.y, radius
        );
        gradient.addColorStop(0, 'rgba(255,230,250,.9)');
        gradient.addColorStop(.5, 'rgba(121,9,103,.1)');
        gradient.addColorStop(1, 'rgba(94,30,255,.01)');
        newEnt.fill = gradient;
      }
      newEnt.setGradient = setGradient;
      newEnt.setGradient();
    	ents.push(newEnt);
      this.nextSpawn = tick + Math.floor((Math.random() * 2) * this.meanTicksPerSpawn) + 1;
    }
    spawn(tick, this.entities);
    this.spawn = spawn;
  } else {
  	if (tick == this.nextSpawn) this.spawn(tick, this.entities);
  	context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    let newEnts = [];
    for (let ent of this.entities) {
    	if (tick < ent.endTick) {
      	context.fillStyle = ent.fill;
        context.beginPath();
        context.arc(ent.x, ent.y, ent.radius, 0, 2*Math.PI);
        context.fill();
        newEnts.push(ent);
      }
    }
    this.entities = newEnts;
  }
}

function BFEPRenderFunc(context, tick) {
	if (tick == 0) {
        this.entities = [];
        this.meanMsPerSpawn = 100;
        this.msLifeCycle = 500;
        this.meanTicksPerSpawn = this.meanMsPerSpawn / this.delay;
        this.tickLifeCycle = this.msLifeCycle / this.delay;
        const radius = 8;
        this.speed = 8;
        this.radius = radius;
        this.nextSpawn = this.meanTicksPerSpawn;
        function spawn(tick, ents) {
            let x = Math.floor(Math.random() * context.canvas.width);
            let y = Math.floor(Math.random() * context.canvas.height);
            let xBias = Math.random() * (2 * this.speed) - this.speed;
            let yBias = Math.random() * (2 * this.speed) - this.speed;
            let newEnt = {
                x: x,
                y: y,
                xBias: xBias,
                yBias: yBias,
                startTick: tick,
                endTick: tick + this.tickLifeCycle,
                radius: this.radius,
            };
            let setGradient = () => {
                let gradient = context.createRadialGradient(
                    newEnt.x, newEnt.y, 1, 
                    newEnt.x, newEnt.y, radius
                );
                gradient.addColorStop(0, 'rgba(255,255,230,.05)');
                gradient.addColorStop(.4, 'rgba(125,125,125,.1)');
                gradient.addColorStop(.5, 'rgba(125,125,125,.3)');
                gradient.addColorStop(.6, 'rgba(125,125,125,.1)');
                gradient.addColorStop(1, 'rgba(94,30,255,.05)');
                newEnt.fill = gradient;
            }
            newEnt.setGradient = setGradient;
            newEnt.setGradient();
            ents.push(newEnt);
            this.nextSpawn = tick + Math.floor((Math.random() * 2) * this.meanTicksPerSpawn) + 1;
        }
        spawn(tick, this.entities);
        this.spawn = spawn;
  } else {
  	if (tick == this.nextSpawn) this.spawn(tick, this.entities);
  	context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    let newEnts = [];
    for (let ent of this.entities) {
    	if (tick < ent.endTick) {
            ent.x += Math.random() * (2 * this.speed) - this.speed + ent.xBias;
            ent.y += Math.random() * (2 * this.speed) - this.speed + ent.yBias;
      	    ent.setGradient();
            context.fillStyle = ent.fill;
            context.beginPath();
            context.arc(ent.x, ent.y, ent.radius, 0, 2*Math.PI);
            context.fill();
            newEnts.push(ent);
        }
    }
    this.entities = newEnts;
  }
}

function pulsativeRenderFunc(context, tick) {
    if (tick == 0) {
        this.pulseIntervalMs = 5000;
        this.pulseIntervalTicks = this.pulseIntervalMs / delay;
        this.pulseDurationMs = 250;
        this.pulseDurationTicks = this.pulseDurationMs / delay;
        this.pulseDepth = 0.5;
        this.lightChance = 0.3;
        this.lightOrDark = null;
    } else {
        const currentOffset = tick % this.pulseIntervalTicks;
        let depth;
        if (currentOffset > this.pulseDurationTicks) {
            this.lightOrDark = null;
            return;
        } else {
            const depthOffset = Math.abs((this.pulseDurationTicks / 2) - currentOffset) / (this.pulseDurationTicks / 2);
            depth = this.pulseDepth - (this.pulseDepth * depthOffset);
        }
        if (this.lightOrDark == null) {
            if (Math.random() <= this.lightChance) this.lightOrDark = 255;
            else this.lightOrDark = 0;
        }
        const rgbaStr = `rgba(${this.lightOrDark},${this.lightOrDark},${this.lightOrDark},${depth})`;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = rgbaStr;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
}

let audioContext;
function startTinnitus() {
    audioContext = new AudioContext();
    var wave = audioContext.createOscillator();
    var gain = audioContext.createGain();
    wave.type = "sine"
    wave.frequency.value = 7000;
    wave.connect(gain);
    gain.gain.value = 0.01;
    wave.start();
    var bufferSize = 4096;
    var noiseAmp = .4;
    var whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);
    whiteNoise.onaudioprocess = function(e) {
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 * noiseAmp - noiseAmp;
        }
    }
    whiteNoise.connect(gain);
    gain.connect(audioContext.destination);
    clickable.onclick = stopTinnitus;
}

function stopTinnitus() {
    audioContext.close();
    clickable.onclick = startTinnitus;
}


let snow = new Renderable(snowRenderFunc, snowCnv, delay);
snow.start();
let palinopsia = new Renderable(palinopsiaRenderFunc, palinopsiaCnv, delay);
palinopsia.start();
let photopsia = new Renderable(photopsiaRenderFunc, photopsiaCnv, delay);
photopsia.start();
let BFEP = new Renderable(BFEPRenderFunc, BFEPCnv, delay);
BFEP.start();
let pulsative = new Renderable(pulsativeRenderFunc, pulsativeCnv, delay);
pulsative.start();