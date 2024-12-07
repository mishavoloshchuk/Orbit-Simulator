import TraceMode from "./Enums/TraceMode.js";
import Painter from "./Painter.js";

export default class Renderer {
	static rendererId = 0;

	#resolutionX = window.innerWidth;
	#resolutionY = window.innerHeight;

	#tracesMode = TraceMode.Drawing;

	set resolutionX (resolutionX){
		this.#resolutionX = this.canv0.width = this.canv1.width = this.canv2.width = resolutionX;
	}
	set resolutionY (resolutionY){
		this.#resolutionY = this.canv0.height = this.canv1.height = this.canv2.height = resolutionY;
	}
	get resolutionX (){
		return this.#resolutionX;
	}
	get resolutionY (){
		return this.#resolutionY;
	}

	allowFrameRender = true; // Forces render frame if true and frame not render
	renderedSceneFrames = 0; // Total rendered frames

	constructor({scene, camera}) {
		// Set scene
		this.scene = scene;
		// Sec camera
		this.camera = camera;

		this.rendererId = Renderer.rendererId;
		this.#initLayers();

		// Camera resolution
		this.resolutionX = window.innerWidth;
		this.resolutionY = window.innerHeight;

		document.getElementById('renderLayers').appendChild(this.layersDiv);

		this.traceModes = [
			new Trace(this), 
			new TraceMode1(this), 
			new TraceMode2(this), 
			new TraceMode3(this)];

		Renderer.rendererId ++;
	}

	#initLayers() {
		this.layersDiv = document.createElement('div');
		this.layersDiv.setAttribute('id', 'renderLayers_renderer_' + Renderer.rendererId);

		// Init render layer 1
		this.#makeLayer(this.layersDiv, {
			zIndex: -4
		});

		// Init render layer 2
		this.#makeLayer(this.layersDiv, {
			zIndex: -2
		});

		// Init render layer 3
		this.#makeLayer(this.layersDiv, {
			zIndex: -6,
			filter: 'blur(0px)',
			opacity: 0.7
		});
	}

	#layersCount = 0;
	#makeLayer(targetNode, styles){
		const canvas = document.createElement('canvas');
		canvas.id = 'renderer' + this.rendererId + '-layer' + this.#layersCount;
		canvas.className = 'renderLayer';
		canvas.innerHTML = 'Your browser does not support canvas!';
		Object.assign(canvas.style, styles);
		targetNode.appendChild(canvas);

		const canvasName = 'canv' + this.#layersCount;
		const contextName = 'ctx' + this.#layersCount;

		this[canvasName] = canvas;
		this[contextName] = canvas.getContext('2d',{willReadFrequently: false});

		this.#layersCount ++;
	}

	// World to screen position. One axis
	crd (coord, axis){
		switch (axis){
			case 'x': 
				const sCtrX = this.resolutionX/2 - this.camera.ax;
				return coord*this.camera.animZoom + sCtrX - this.camera.ax*(this.camera.animZoom-1);
			case 'y': 
				const sCtrY = this.resolutionY/2 - this.camera.ay;
				return coord*this.camera.animZoom + sCtrY - this.camera.ay*(this.camera.animZoom-1);
		}		
	}

	// World to screen position
	crd2 (xpos, ypos){
		const sCtrX = this.resolutionX/2 - this.camera.ax;
		const sCtrY = this.resolutionY/2 - this.camera.ay;

		return [
			xpos * this.camera.animZoom + sCtrX - this.camera.ax*(this.camera.animZoom-1), 
			ypos * this.camera.animZoom + sCtrY - this.camera.ay*(this.camera.animZoom-1)
		];		
	}

	//Draw objects
	renderObjects(){
		// console.log('Render objects');
		const tracesMode = this.#tracesMode;
		const MIN_SCREEN_RADIUS = 1;

		this.traceModes[tracesMode].frame();

		for (let obj of this.scene.objArr){
			// Object screen position
			const screenPos = this.crd2(obj.x, obj.y);

			const screenRadius = this.getScreenRad(obj.m) // Object draw radius
			const drawRadius = Math.max(screenRadius, MIN_SCREEN_RADIUS); // Minimal draw radius
			const obCol = obj.color; // Object draw color

			this.traceModes[tracesMode].draw(obj);

			const optimalTraceParams = (ui.traceMode1Blur.state === 0
			&& ui.traceMode1Opacity.state === 1 
			&& ui.traceMode1Width.state === 1);

			if (this.isOutOfScreen(...screenPos, drawRadius)) continue;
			
			const optimize = (optimalTraceParams && tracesMode === TraceMode.Drawing);
			if (!optimize){
				Painter.drawOn(this.ctx0)
				.circle(...screenPos, drawRadius)
				.fill(obCol);
			}

			// If negative mass, show minus sign on the object
			if (obj.m < 0 && drawRadius > 2){
				Painter.drawOn(optimize ? this.ctx2 : this.ctx0);
				Painter.drawMinusSign(...screenPos, drawRadius * 0.6, "#000")
			}
		}
		!pauseState && this.renderedSceneFrames ++;
	}

	visualizeLaunchPower(){
		this.clearLayer(1);
		let [mcx, mcy] = mouse.ctrlModificatedMousePosition(); // CTRL mouse precision modificator

		let offsX = 0, offsY = -30;

		// If device is mobile or tablet
		if (['mobile', 'tablet'].includes(UtilityMethods.getDeviceType())) offsX = -25; offsY = -70;

		Object.assign(launchPowerLabel.style, {
			left: (mouse.x + offsX)+'px', 
			top: (mouse.y + offsY)+'px', 
			display: 'block', 
			color: ui.newObjColor.state });
		launchPowerLabel.innerHTML = Math.round(Math.hypot(...newObjParams.vel)*10000)/1000;
		const D = this.getScreenRad(ui.newObjMass.state)*2;

		// Gradient
		let gradient = this.ctx1.createLinearGradient(
			mouse.leftDownX,//   X1
			mouse.leftDownY,//   Y1
			mcx,//  X2
			mcy);// Y2
		gradient.addColorStop(0, ui.newObjColor.state); // New object color
		gradient.addColorStop(1, ui.backgroundColor.state + "00"); // Alpha

		Painter.drawOn(this.ctx1);
		Painter.line([mouse.leftDownX, mouse.leftDownY], [mcx, mcy])
		.stroke(gradient, D < 1 ? 1 : D);

		Painter.circle(mouse.leftDownX, mouse.leftDownY, D/2).fill(ui.newObjColor.state);

		if (ui.newObjMass.state < 0){
			Painter.drawMinusSign(mouse.leftDownX, mouse.leftDownY, D/2*0.6, "#000");
		}
	}

	//Визуальное выделение объекта
	visualObjectSelect(objectId, color, alpha = 0.3) {
		// console.log(objectId)
		const obj = this.scene.objArr[objectId];
		if (!obj) return // If there is no target object

		this.canv1.visualSelect = true;

		const animSpeed = 2
		const animPos = Math.sin(Date.now() * Math.PI / 1000 * animSpeed) * 10 + 20
		const drawRadius = this.getScreenRad(obj.m); // Object screen draw radius

		// Fill circle
		if (alpha > 0){
			Painter.drawOn(this.ctx1)
			.circle(...this.crd2(obj.x, obj.y), drawRadius + animPos)
			.fill(color, { globalAlpha: alpha });
		}
		// Stroke circle
		Painter.drawOn(this.ctx1)
		.circle(...this.crd2(obj.x, obj.y), drawRadius + animPos)
		.stroke(color, 2, {globalAlpha: 1});
	}

	isOutOfScreen(x, y, r = 0){
		return x + r < 0 || x - r > this.resolutionX || y + r < 0 || y - r > this.resolutionY;
	}

	// Visualize new object mass
	visObjMass(mass, color, posX = innerWidth/2, posY = innerHeight/2){
		// Fill circle
		let drawRadius = this.getScreenRad(mass);
		this.canv1.visualSelect = true;
		Painter.drawOn(this.ctx1);

		// Darken background
		Painter.rect(0, 0, this.resolutionX, this.resolutionY)
		.fill("#000000", { globalAlpha: 0.5 });

		// Set alpha
		this.ctx1.globalAlpha = 0.8;

		// Draw object size
		Painter.circle(posX, posY, this.getScreenRad(mass)).fill(color);
		// Draw border
		Painter.circle(posX, posY, drawRadius).stroke("#fff", 1);

		// Draw object negative mass indication
		if (mass < 0) Painter.drawMinusSign(posX, posY, drawRadius * 0.6, "#000");
		
		// Reset alpha
		this.ctx1.globalAlpha = 1;
	}

	// Show distance to main object
	visDistance(obj_cord, color = '#888888', objId = scene.objIdToOrbit){
		const tObj = scene.objArr[objId];
		if (!tObj) return // If there is no target object

		const radius = UtilityMethods.distance(obj_cord[0], obj_cord[1], ...this.crd2(tObj.x, tObj.y));
		if (radius > this.getScreenRad(tObj.m)){
			Painter.drawOn(this.ctx1);
			// Line
			Painter.line([obj_cord[0], obj_cord[1]], this.crd2(tObj.x, tObj.y)).stroke(color, 2);
			// Circle
			Painter.circle(...this.crd2(tObj.x, tObj.y), radius).stroke(color, 0.5);
			// Points
			Painter.circle(...this.crd2(tObj.x, tObj.y), 3).fill(color);
			Painter.circle(obj_cord[0], obj_cord[1], 3).fill(color);

			Object.assign(launchPowerLabel.style, {
				left: `calc(${mouse.x}px + 1em)`,
				top: `calc(${mouse.y}px - 1em)`,
				display: 'block', color: color
			});
			launchPowerLabel.innerHTML = Math.round(radius / camera.animZoom*1000)/1000;
		} else {
			if (!mouse.leftDown){
				launchPowerLabel.style.display = 'none';	
			}
		}
	}

	tracesMode1Wiping(){
		// console.log('Wipe layer 1');
		Painter.drawOn(this.ctx2)
		.rect(0, 0, this.resolutionX, this.resolutionY)
		.fill("#FFF", { 
			globalCompositeOperation: 'destination-out',
			globalAlpha: ui.traceMode1Length.value });
	}

	// Clear layer
	clearLayer(layerId) {
		// layerId === 2 &&
		// console.log('Clear layer: ', layerId);
		const layer = this['ctx' + layerId];
		if (layer === undefined) throw new Error('There is no layer with given ID: ' + layerId);
		layer.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}

	// Get object screen radius
	getScreenRad(mass){
		let screenRad = this.scene.getRadiusFromMass(mass) * this.camera.animZoom;
		return screenRad < 0.25 ? 0.25 : screenRad;
	}

	// Reset preview screen positions
	resetPrevScreenPositions(objArr = this.scene.objArr){
		for (let obj of objArr){
			obj.prevScreenX = obj.prevScreenY = undefined;
		}
	}
	resetTracesAndPrevScrnPos(objArr = this.scene.objArr) {
		for (let obj of objArr) {
			obj.trace = [];
			obj.prevScreenX = obj.prevScreenY = obj.prevScreenR = undefined;
		}
	}

	setTraceMode(traceMode = TraceMode.None) {
		const newTraceMode = Number(traceMode);
		if (newTraceMode === this.#tracesMode) return;

		this.traceModes[this.#tracesMode].disconnect();
		this.#tracesMode = newTraceMode;
		this.traceModes[this.#tracesMode].connect();
	}

	allowRender = () => {
		this.allowFrameRender = true;
	}
}

class Trace {
	MIN_SCREEN_RADIUS = 1;
	constructor(renderer) {
		this.renderer = renderer;
	}

	frame() {
		this.renderer.clearLayer(0);
	}

	draw() {
		//
	}

	connect() {
		//
	}

	disconnect() {
		//
		this.renderer.clearLayer(0);
		this.renderer.clearLayer(2);
		this.renderer.resetTracesAndPrevScrnPos(scene.objArr);
		this.renderer.allowRender();
	}
}

class TraceMode1 extends Trace {
	#optimalTraceParams = false;
	#PIXELS_TO_ENOUGH_MOVE = 0.3;

	frame() {
		// Optimized canvas clearing
		this.renderer.tracesMode1Wiping();
		if (!this.#optimalTraceParams) this.renderer.clearLayer(0);

		this.#optimalTraceParams = (ui.traceMode1Blur.state === 0
			&& ui.traceMode1Opacity.state === 1 
			&& ui.traceMode1Width.state === 1);
	}

	draw(obj) {	
		const renderer = this.renderer;
		const obCol = obj.color; // Object draw color
		const screenRadius = renderer.getScreenRad(obj.m) // Object draw radius
		const drawRadius = Math.max(screenRadius, this.MIN_SCREEN_RADIUS); // Minimal draw radius

		// Object screen position
		const [screenX, screenY] = renderer.crd2(obj.x, obj.y);
		
		// Distance between current and previous screen position
		const currPrevDistance = UtilityMethods.distance(screenX, screenY, obj.prevScreenX, obj.prevScreenY);

		let enoughObjMove = true; // If object screen speed is enough to render or anything else
		// Set prev screen position if there is no prev screen position
		if (obj.prevScreenX === undefined || obj.prevScreenY === undefined){
			[obj.prevScreenX, obj.prevScreenY] = [screenX, screenY];
		} else {
			enoughObjMove = (currPrevDistance > this.#PIXELS_TO_ENOUGH_MOVE);
		}

		// If object out of screen space
		const objOutOfScreen = renderer.isOutOfScreen(screenX, screenY, drawRadius);
		
		// Fix object anti-aliasing while optimal parameters active
		if (this.#optimalTraceParams 
			&& !enoughObjMove 
			&& !objOutOfScreen 
			&& drawRadius !== this.MIN_SCREEN_RADIUS
		){	
			Painter.drawOn(renderer.ctx2)
			.circle(screenX, screenY, drawRadius + 0.4)
			.fill('#FFF', { globalCompositeOperation: 'destination-out' });
		}
				
		if (obj.prevScreenR === undefined) obj.prevScreenR = drawRadius;
		const traceDrawRadius = Math.min(drawRadius, obj.prevScreenR);
		const prevPosOutOfScreen = renderer.isOutOfScreen(obj.prevScreenX, obj.prevScreenY, traceDrawRadius);
		
		// Draw trace
		if ((enoughObjMove || this.#optimalTraceParams) 
			&& !(objOutOfScreen && prevPosOutOfScreen)
		){
			const LINE_OPTIMIZATION_WIDTH = 0.75;
			Painter.drawOn(renderer.ctx2);

			// Fix darken dots when objects very small
			if (currPrevDistance < (this.MIN_SCREEN_RADIUS * 2) 
				&& drawRadius < LINE_OPTIMIZATION_WIDTH
			){
				let kff = 1; 
				let diff = [(obj.prevScreenX - screenX), (obj.prevScreenY - screenY)];
				if (currPrevDistance === 0) {
					kff = (this.MIN_SCREEN_RADIUS / currPrevDistance);
					diff = [this.MIN_SCREEN_RADIUS, this.MIN_SCREEN_RADIUS];
				}
				Painter.line([screenX + diff[0]*kff, screenY + diff[1]*kff], 
					[screenX - diff[0]*kff, screenY - diff[1]*kff]);
			} else {
				Painter.line([obj.prevScreenX, obj.prevScreenY], [screenX, screenY]);
			}

			Painter.stroke(obCol,  
				Math.max(traceDrawRadius * ui.traceMode1Width.state, this.MIN_SCREEN_RADIUS) * 2,
				{ lineCap: traceDrawRadius > LINE_OPTIMIZATION_WIDTH ? 'round' : 'butt' });
			
		}
		// Set prev screen position if object moved enough
		if (enoughObjMove) [obj.prevScreenX, obj.prevScreenY] = [screenX, screenY];
		
		// Set prev screen radius
		obj.prevScreenR = drawRadius;
	}
}


class TraceMode2 extends Trace {
	#traceLength;
	frame() {
		this.renderer.clearLayer(0);
		this.#traceLength = Math.round(Math.pow(8, ui.traceMode2Length.state));
	}

	draw(obj) {
		if (obj.lock) return;
		
		const traceResolution = 1;
		const renderer = this.renderer;
		
		// Update trace
		if (!pauseState && (renderer.renderedSceneFrames % traceResolution === 0)){
			obj.trace.unshift([obj.x, obj.y]);
			while (obj.trace.length > this.#traceLength){
				obj.trace.pop();
			}
		}

		const screenRadius = renderer.getScreenRad(obj.m) // Object draw radius
		const drawRadius = Math.max(screenRadius, this.MIN_SCREEN_RADIUS); // Minimal draw radius
		const obCol = obj.color; // Object draw color
		
		let prev_randX = 0, prev_randY = 0;
		let randX = 0, randY = 0;
		const RAND_KFF = 0.8;
		const TLength = obj.trace.length; // Length of trace array

		// Iterate trace
		for (let i = obj.trace.length; i--;){
			const itr = i > 0 ? i - 1 : i;

			// Set prev random point
			[prev_randX, prev_randY] = [randX, randY];

			// Random limit
			const rndLim = drawRadius*(i/TLength)*RAND_KFF;
			if (ui.traceMode2Trembling.state || ui.traceMode2Particles.state){
				randX = UtilityMethods.getRandomArbitrary(-rndLim, rndLim);
				randY = UtilityMethods.getRandomArbitrary(-rndLim, rndLim);
			}

			// Line width
			const lineWidth = drawRadius * (1-i/TLength) * 1.8;

			// Point screen position
			const [point1ScreenX, point1ScreenY] = renderer.crd2(...obj.trace[i]);
			const [point2ScreenX, point2ScreenY] = renderer.crd2(...obj.trace[itr]);

			// Is point out of screen
			const point1OutOfScreen = renderer.isOutOfScreen(point1ScreenX, point1ScreenY);
			const point2OutOfScreen = renderer.isOutOfScreen(point2ScreenX, point2ScreenY);
			
			// Particles drawing
			if (ui.traceMode2Particles.state 
				&& i % 4 === 0 // Draw particle in every 4-th point in trace array
				&& drawRadius > 1.5
				&& !point2OutOfScreen
			){
				Painter.drawOn(renderer.ctx0)
				.circle(
					Math.floor(point2ScreenX + randX * 2), 
					Math.floor(point2ScreenY + randY * 2),
					lineWidth / 2)
				.fill(obCol);
			}
			
			// Line drawing
			if (!(point1OutOfScreen && point2OutOfScreen)){ // If both points not out of screen
				// Remove trembling if disabled
				if (!ui.traceMode2Trembling.state) randX = randY = 0;
				
				Painter.drawOn(renderer.ctx0)
				.line([point1ScreenX + randX, point1ScreenY + randY], 
					[point2ScreenX + prev_randX, point2ScreenY + prev_randY])
				.stroke(obCol, lineWidth, { globalAlpha: (TLength-i/1.5)/TLength });
			}
		}
	}
}

class TraceMode3 extends Trace {
	#traceResolution;
	#traceLength;

	frame() {
		this.renderer.clearLayer(0);
		this.#traceResolution = 61 - Math.round(Math.pow(ui.traceMode3Quality.state, 1/8) * 60);
		this.#traceLength = Math.ceil(UtilityMethods.expVal(ui.traceMode3Length.state) / this.#traceResolution);
	}

	draw(obj) {
		if (obj.lock) return;
		
		const renderer = this.renderer;
		
		// Update trace
		if (!pauseState && (renderer.renderedSceneFrames % this.#traceResolution === 0)){
			obj.trace.unshift([obj.x, obj.y]);
			while (obj.trace.length > this.#traceLength){
				obj.trace.pop();
			}
		}
		
		// Smooth the tail of the trace
		if (obj.trace.length === this.#traceLength && !pauseState) this.#smoothTail(obj);

		const screenRadius = renderer.getScreenRad(obj.m) // Object draw radius
		const drawRadius = Math.max(screenRadius, this.MIN_SCREEN_RADIUS); // Minimal draw radius
		const obCol = obj.color; // Object draw color

		// Draw line
		const traceWidth = Math.min(drawRadius*1.7, Math.pow(ui.traceMode3Width.state, 10));
		const c0 = this.renderer.ctx0;

		// Round end of trace if the line width is enough
		if (traceWidth > 3) Object.assign(c0, {lineCap: 'round', lineJoin: 'round'});

		Painter.drawOn(c0);
		Painter.line([obj.x, obj.y], ...obj.trace, (x, y) => renderer.crd2(x, y))
		.stroke(obCol, traceWidth, { globalCompositeOperation: 'destination-over' });
		Object.assign(c0, {lineCap: 'butt', lineJoin: 'bevel'});
				
		// Separate the traces of objects
		Painter.circle(...renderer.crd2(obj.x, obj.y), drawRadius + 1.5)
		.fill("#ffffff", { globalCompositeOperation: 'destination-out' });
	}
	
	#smoothTail(obj) {
		let point = obj.trace[obj.trace.length-1];
		let pPoint = obj.trace[obj.trace.length-2];
		// The difference between the last and pre-last trace array points divided by traceResolution
		point[2] = point[2] === undefined ? (point[0] - pPoint[0]) / this.#traceResolution : point[2];
		point[3] = point[3] === undefined ? (point[1] - pPoint[1]) / this.#traceResolution : point[3];
		point[0] = point[0] - point[2];
		point[1] = point[1] - point[3];
	}
}