export default class Renderer {
	static rendererId = 0;

	#resolutionX = window.innerWidth;
	#resolutionY = window.innerHeight;

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
	#optimalTraceParams = false;
	renderObjects(){
		// console.log('Render objects');
		const scn = this.scene;

		const tracesMode = +ui.tracesMode.state;

		const {
			ctx0: c0,
			ctx1: c1,
			ctx2: c2
		} = this;

		// Trace mode 2 UI
		const traceMode2Particles = ui.traceMode2Particles.state;
		const traceMode2Trembling = ui.traceMode2Trembling.state;
		const traceMode2Length = ui.traceMode2Length.state;

		// Trace mode 3 UI
		const traceMode3Width = ui.traceMode3Width.state;
		const traceMode3Quality = ui.traceMode3Quality.state;
		const traceMode3Length = ui.traceMode3Length.state;

		// Optimized canvas clearing
		if (tracesMode === 1){
			this.tracesMode1Wiping();
			if (!this.#optimalTraceParams) this.clearLayer0();
		} else {
			this.clearLayer0();
		}

		this.#optimalTraceParams = (ui.traceMode1Blur.state === 0 && ui.traceMode1Opacity.state === 1 && ui.traceMode1Width.state === 1);

		const pixelsToEnoughMove = 0.3;
		const minScreenRadius = 0.5;

		for (let objectId = 0; objectId < scn.objArr.length; objectId++){
			const obj = scn.objArr[objectId]; // Object to draw

			// Object screen position
			const [screenX, screenY] = this.crd2(obj.x, obj.y);

			const screenRadius = this.getScreenRad(obj.m) // Object draw radius
			const drawRadius = screenRadius < minScreenRadius ? minScreenRadius : screenRadius; // Minimal draw radius
			const obCol = obj.color; // Object draw color
			if (obj.prevScreenR === undefined) obj.prevScreenR = drawRadius;
			const traceDrawRadius = Math.min(drawRadius, obj.prevScreenR);

			// Distance between current and previous screen position
			const currPrevDistance = dist(screenX, screenY, obj.prevScreenX, obj.prevScreenY);

			let enoughObjMove = true; // If object screen speed is enough to render or anything else

			if (obj.prevScreenX === undefined || obj.prevScreenY === undefined){
				// Set prev screen position if there is no prev screen position
				[obj.prevScreenX, obj.prevScreenY] = [screenX, screenY];
			} else {
				enoughObjMove = (currPrevDistance > pixelsToEnoughMove);
			}

			// If object out of screen space
			const objOutOfScreen = this.isOutOfScreen(screenX, screenY, drawRadius);
			const prevPosObjOutOfScreen = this.isOutOfScreen(obj.prevScreenX, obj.prevScreenY, traceDrawRadius);

			let traceLength = false;
			let traceResolution = 1;

			// Traces mode 1 =====
			if (tracesMode === 1){
				// Fix object anti-aliasing while optimal trace mode 1 parameters
				if (!enoughObjMove && !objOutOfScreen && this.#optimalTraceParams && drawRadius !== minScreenRadius){	
					Painter.drawOn(c2)
					.circle(screenX, screenY, drawRadius + 0.4)
					.fill('#FFF', {"globalCompositeOperation": 'destination-out'});
				}
				// Draw trace
				if ((enoughObjMove || this.#optimalTraceParams) 
					&& !(objOutOfScreen && prevPosObjOutOfScreen)
				){
					Painter.drawOn(c2);
					const lineOptimizedWidth = 0.75;

					// Fix darken dots when objects very small
					const minScreenDiameter = minScreenRadius * 2;
					if (currPrevDistance < minScreenDiameter && drawRadius < lineOptimizedWidth){
						const CPD = currPrevDistance;
						const koeficient = CPD === 0 ? 1 : (minScreenDiameter / CPD / 2);
						const diffX = CPD === 0 ? minScreenRadius : (obj.prevScreenX - screenX);
						const diffY = CPD === 0 ? minScreenRadius : (obj.prevScreenY - screenY);
						Painter.line([screenX + diffX*koeficient, screenY + diffY*koeficient], 
							[screenX - diffX*koeficient, screenY - diffY*koeficient]);
					} else {
						Painter.line([obj.prevScreenX, obj.prevScreenY], [screenX, screenY]);
					}

					Painter.stroke(obCol,  
						Math.max(traceDrawRadius * 2 * ui.traceMode1Width.state, minScreenRadius * 2),
						{ lineCap: traceDrawRadius > lineOptimizedWidth ? 'round' : 'butt' }); // Line cap optimization
				}
			}
			// Traces mode 2 =====
			else if (tracesMode === 2){
				if (!obj.lock){
					let randKff = 0.8;
					const TLength = obj.trace.length; // Length of trace array
					let prev_randX = 0, prev_randY = 0;
					let randX = 0, randY = 0;
					traceLength = Math.round(Math.pow(8, traceMode2Length));

					if (obj.trace[0]){
						Painter.drawOn(c0)
						.line([screenX + randX, screenY + randY], 
							[this.crd(obj.trace[0][0], 'x') + prev_randX, this.crd(obj.trace[0][1], 'y') + prev_randY])
						.stroke(obCol, drawRadius * 2, { globalCompositeOperation: 'destination-over' });		
					}
					for (let i = obj.trace.length; i--;){
						let itr = i-1;
						itr = itr < 0 ? 0 : itr;

						// Set prev random point
						prev_randX = randX; prev_randY = randY;

						// Random limit
						const rnd_lim = drawRadius*(i/TLength)*randKff;
						if (traceMode2Trembling === true || traceMode2Particles === true){
							randX = UtilityMethods.getRandomArbitrary(-rnd_lim, rnd_lim);
							randY = UtilityMethods.getRandomArbitrary(-rnd_lim, rnd_lim);
						}

						// Line width
						const lineWidth = drawRadius * (1-i/TLength) * 1.8;

						// Point screen position
						const [point1ScreenX, point1ScreenY] = this.crd2(obj.trace[i][0], obj.trace[i][1]);
						const [point2ScreenX, point2ScreenY] = this.crd2(obj.trace[itr][0], obj.trace[itr][1]);

						// Is point out of screen
						const point1OutOfScreen = this.isOutOfScreen(point1ScreenX, point1ScreenY);
						const point2OutOfScreen = this.isOutOfScreen(point2ScreenX, point2ScreenY);

						// Particles drawing
						if (traceMode2Particles 
							&& i % 4 === 0 // Draw particle in every 5-th point in trace array
							&& drawRadius > 1.5
							&& !point2OutOfScreen
						){
							Painter.drawOn(c0)
							.circle(
								Math.floor(point2ScreenX + randX * 2), 
								Math.floor(point2ScreenY + randY * 2),
								lineWidth / 2)
							.fill(obCol);
						}
						// Line drawing
						if (!(point1OutOfScreen === true && point2OutOfScreen === true)){ // If both points not out of screen
							Painter.drawOn(c0)
							.line([point1ScreenX + randX, point1ScreenY + randY], [point2ScreenX + prev_randX, point2ScreenY + prev_randY])
							.stroke(obCol, lineWidth, { globalAlpha: (TLength-i/1.5)/TLength });
							if (traceMode2Trembling === false) randX = randY = 0;
						}
					}
				}
			}
			// Traces mode 3 =====
			else if (tracesMode === 3){
				if (!obj.lock){
					traceResolution = 61 - Math.round(Math.pow(traceMode3Quality, 1/8)*60);
					traceLength = Math.ceil(UtilityMethods.expVal(traceMode3Length) / traceResolution);
					c0.lineWidth = Math.min(drawRadius*1.7, Math.pow(traceMode3Width, 10));
					c0.globalCompositeOperation = 'destination-over';
					Painter.drawOn(c0);
					if (obj.trace.length > 0){
						// Smooth the end cut of the trace
						if (obj.trace.length === traceLength && !pauseState){
							let point = obj.trace[obj.trace.length-1];
							let pPoint = obj.trace[obj.trace.length-2];
							// The difference between the last and pre-last trace array points divided by traceResolution
							point[2] = point[2] === undefined ? (point[0] - pPoint[0]) / traceResolution : point[2];
							point[3] = point[3] === undefined ? (point[1] - pPoint[1]) / traceResolution : point[3];
							point[0] = point[0] - point[2];
							point[1] = point[1] - point[3];
						}
						// Draw line
						// Round end of trace if the line width is enough
						if (c0.lineWidth > 3) Object.assign(c0, {lineCap: 'round', lineJoin: 'round'});
						
						Painter.line([obj.x, obj.y], ...obj.trace, (x, y) => this.crd2(x, y)).stroke(obCol);
						Object.assign(c0, {lineCap: 'butt', lineJoin: 'bevel'});
					}
					// Separate the traces of objects
					Painter.circle(screenX, screenY, drawRadius + 1.5)
					.fill("#ffffff", {globalCompositeOperation: 'destination-out'});
				}
			}

			if (!objOutOfScreen) {
				const optimize = (this.#optimalTraceParams && tracesMode == '1');
				if (!optimize){
					Painter.drawOn(c0)
					.circle(screenX, screenY, drawRadius)
					.fill(obCol);
				}

				// If negative mass, show minus sign on the object
				if (obj.m < 0 && drawRadius > 2){
					Painter.drawOn(optimize ? c2 : c0);
					Painter.drawMinusSign(screenX, screenY, drawRadius * 0.6, "#000")
				}
			}

			if (!obj.lock && !pauseState && this.renderedSceneFrames % traceResolution === 0){
				obj.trace.unshift([obj.x, obj.y]);
				while (obj.trace.length > traceLength){
					obj.trace.pop();
				}
			}
			// Set prev screen position if object moved enough
			if (enoughObjMove) [obj.prevScreenX, obj.prevScreenY] = [screenX, screenY];
			// Set prev screen radius
			obj.prevScreenR = drawRadius;
		}
		if (!pauseState){
			this.renderedSceneFrames ++;
		}
	}

	visualizeLaunchPower(){
		this.clearLayer1();
		let [mcx, mcy] = mouse.ctrlModificatedMousePosition(); // CTRL mouse precision modificator

		let offsX = 0;
		let offsY = -30;
		if (['mobile', 'tablet'].includes(UtilityMethods.getDeviceType()) ){ offsX = -25; offsY = -70; } // If device is mobile or tablet
		Object.assign(launchPowerLabel.style, {left: (mouse.x+offsX)+'px', top: (mouse.y+offsY)+'px', display: 'block', color: ui.newObjColor.state});
		launchPowerLabel.innerHTML = Math.round(Math.hypot(newObjParams.vx, newObjParams.vy)*10000)/1000;
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

		const radius = dist(obj_cord[0], obj_cord[1], ...this.crd2(tObj.x, tObj.y));
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
		//console.log('clear layer 1');
		Painter.drawOn(this.ctx2)
		.rect(0, 0, this.resolutionX, this.resolutionY)
		.fill("#FFF", { 
			globalCompositeOperation: 'destination-out',
			globalAlpha: ui.traceMode1Length.value });
	}
	clearLayer0(){
		//console.log('clear layer 1');
		this.ctx0.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	clearLayer1(){
		// console.log('clear layer 2');
		this.ctx1.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	clearLayer2(){
		//console.log('clear layer 3');
		this.ctx2.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}

	// Get object screen radius
	getScreenRad(mass){
		let screenRad = this.scene.getRadiusFromMass(mass) * this.camera.animZoom;
		return screenRad < 0.25 ? 0.25 : screenRad;
	}
}

export class Painter {
	static #tctx;
	static drawOn(tctx) {
		this.#tctx = tctx;
		tctx.beginPath();
		return this;
	}

	static circle(x, y, radius) {
		const c = this.#tctx;
		c.beginPath();

		c.arc(x, y, radius, 0, 6.2832);

		return this;
	}

	static line(...args) {
		const c = this.#tctx;

		const modificator = typeof args[args.length - 1] === "function" 
			? args.pop()
			: (x, y) => [x, y];

		const points = args;
		c.moveTo(...modificator(points[0][0], points[0][1])); // Start
		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			c.lineTo(...modificator(point[0], point[1]));
		}

		return this;
	}

	static rect(posX, posY, width, height) {
		const c = this.#tctx;
		c.rect(posX, posY, width, height);

		return this;
	}

	static fill(color = undefined, options = {}) {
		const c = this.#tctx;
		c.save();

		color && (c.fillStyle = color);
		Object.assign(c, options);

		c.fill();
		c.restore();
	}

	static stroke(color = undefined, lineWidth = undefined, options = {}) {
		const c = this.#tctx;
		c.save();

		color && (c.strokeStyle = color);
		lineWidth && (c.lineWidth = lineWidth);
		Object.assign(c, options);

		c.stroke();
		c.restore();
	}

	static drawCross(x, y, width = 1, size = 5, color = '#ff0000'){
		const c = this.#tctx;
		c.strokeStyle = ui.backgroundColor.state;
		for (let i = 0; i < 2; i++){
			Painter.drawOn(c)
			.line([x - size, y - size], [x + size, y + size])
			.line([x + size, y - size], [x - size, y + size])
			.stroke(undefined, width, {lineCap: 'round'});
			c.strokeStyle = color;
		}
	}

	static drawMinusSign(x, y, radius, color, options = {}) {
		const c = this.#tctx;
		c.strokeStyle = color;
		c.lineWidth = radius / 5;
		Object.assign(c, options);
		Painter.drawOn(c);
		Painter.circle(x, y, radius).stroke();

		Painter.line([x - (radius * 0.66), y], [x + (radius * 0.66), y]).stroke();
	}
}