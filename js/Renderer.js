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
			let obj = scn.objArr[objectId]; // Object to draw

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
					Painter.fillCircle(c2, screenX, screenY, drawRadius + 0.4, '#FFF', {
						"globalCompositeOperation": 'destination-out'
					});
				}
				// Draw trace
				if ((enoughObjMove || this.#optimalTraceParams) 
					&& !(objOutOfScreen && prevPosObjOutOfScreen)
				){
					const lineOptimizedWidth = 0.75;
					c2.strokeStyle = obCol;
					c2.lineWidth = Math.max(traceDrawRadius * 2 * ui.traceMode1Width.state, minScreenRadius * 2);
					c2.lineCap = traceDrawRadius > lineOptimizedWidth ? 'round' : 'butt'; // Line cap optimization
					c2.beginPath();

					// Fix darken dots when objects very small
					const minScreenDiameter = minScreenRadius * 2;
					if (currPrevDistance < minScreenDiameter && drawRadius < lineOptimizedWidth){
						const CPD = currPrevDistance;
						const koeficient = CPD === 0 ? 1 : (minScreenDiameter / CPD / 2);
						const diffX = CPD === 0 ? minScreenRadius : (obj.prevScreenX - screenX);
						const diffY = CPD === 0 ? minScreenRadius : (obj.prevScreenY - screenY);
						c2.moveTo(screenX + diffX*koeficient, screenY + diffY*koeficient);
						c2.lineTo(screenX - diffX*koeficient, screenY - diffY*koeficient);
					} else {
						c2.moveTo(obj.prevScreenX, obj.prevScreenY);
						c2.lineTo(screenX, screenY);
					}
					c2.stroke();
					c2.lineCap = 'butt';
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

					c0.save(); // Save canvas

					c0.fillStyle = obCol;
					c0.strokeStyle = obCol;
					c0.globalCompositeOperation = 'destination-over';
					if (obj.trace[0]){
						c0.lineWidth = drawRadius*2;
						c0.beginPath();
						c0.moveTo(screenX + randX, screenY + randY);
						c0.lineTo(this.crd(obj.trace[0][0], 'x')+prev_randX, this.crd(obj.trace[0][1], 'y')+prev_randY);
						c0.stroke();				
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
							Painter.fillCircle(
								c0, 
								Math.floor(point2ScreenX + randX * 2), 
								Math.floor(point2ScreenY + randY * 2),
								lineWidth / 2,
								obCol
							);
						}
						// Line drawing
						if (!(point1OutOfScreen === true && point2OutOfScreen === true)){ // If both points not out of screen
							c0.lineWidth = lineWidth;
							if (traceMode2Trembling === false) randX = randY = 0;
							c0.globalAlpha = (TLength-i/1.5)/TLength;
							c0.beginPath();
							c0.moveTo(point1ScreenX + randX, point1ScreenY + randY);
							c0.lineTo(point2ScreenX + prev_randX, point2ScreenY + prev_randY);
							c0.stroke();
							c0.globalAlpha = 1;
						}
					}
					c0.restore(); // Restore canvas
				}
			}
			// Traces mode 3 =====
			else if (tracesMode === 3){
				if (!obj.lock){
					traceResolution = 61 - Math.round(Math.pow(traceMode3Quality, 1/8)*60);
					traceLength = Math.ceil(UtilityMethods.expVal(traceMode3Length) / traceResolution);
					c0.strokeStyle = obCol;
					c0.lineWidth = Math.min(drawRadius*1.7, Math.pow(traceMode3Width, 10));
					c0.globalCompositeOperation = 'destination-over';
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
						if (c0.lineWidth > 3) {
							c0.lineCap = 'round';
							c0.lineJoin = 'round';
						}
						c0.beginPath();
						c0.moveTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
						for (let i in obj.trace){
							let itr = i;
							c0.lineTo(this.crd(obj.trace[itr][0], 'x'), this.crd(obj.trace[itr][1], 'y'));
						}
						c0.stroke();
						c0.lineCap = 'butt';
						c0.lineJoin = 'bevel';
					}
					// Separate the traces of objects
					Painter.fillCircle(c0, screenX, screenY, drawRadius + 1.5, "#ffffff", {
						globalCompositeOperation: 'destination-out'
					});
				}
			}

			if (!objOutOfScreen) {
				const optimize = (this.#optimalTraceParams && tracesMode == '1');
				if (!optimize){
					Painter.fillCircle(c0, screenX, screenY, drawRadius, obCol);
				}

				// If negative mass, show minus sign on the object
				if (obj.m < 0 && drawRadius > 2){
					const ctx = optimize ? c2 : c0;
					Painter.drawMinusSign(ctx, screenX, screenY, drawRadius * 0.6, "#000")
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
		this.ctx1.strokeStyle = gradient;

		this.ctx1.lineWidth = D < 1 ? 1 : D;
		this.ctx1.beginPath();
		this.ctx1.moveTo(mouse.leftDownX, mouse.leftDownY);
		this.ctx1.lineTo(mcx, mcy);
		this.ctx1.stroke();
		this.ctx1.globalAlpha = 1;

		Painter.fillCircle(this.ctx1, mouse.leftDownX, mouse.leftDownY, D/2, ui.newObjColor.state);

		if (ui.newObjMass.state < 0){
			Painter.drawMinusSign(this.ctx1, mouse.leftDownX, mouse.leftDownY, D/2*0.6, "#000");
		}
	}

	//Визуальное выделение объекта
	#visualObjectSelectAnimation = 10;
	#visualObjectSelectAnimDir = 0;
	visualObjectSelect(objectId, color, alpha = 0.3) {
		// console.log(objectId)
		const obj = this.scene.objArr[objectId];
		if (obj){ // If there are target object
			this.canv1.visualSelect = true;
			this.clearLayer1();
			let selectObjId = objectId;

			// Animation
			if (this.#visualObjectSelectAnimation <= 5){
				this.#visualObjectSelectAnimDir = 1;
			} else 
			if (this.#visualObjectSelectAnimation >= 30){
				this.#visualObjectSelectAnimDir = 0;
			}

			if (this.#visualObjectSelectAnimDir){
				this.#visualObjectSelectAnimation += 1;
			} else {
				this.#visualObjectSelectAnimation -= 0.5;
			}

			const drawRadius = this.getScreenRad(obj.m); // Object screen draw radius

			// Fill circle
			if (alpha > 0){
				Painter.fillCircle(
					this.ctx1, 
					...this.crd2(obj.x, obj.y), 
					drawRadius + this.#visualObjectSelectAnimation, 
					color,
					{ globalAlpha: alpha }
				)
			}
			// Stroke circle
			this.ctx1.beginPath();
			this.ctx1.globalAlpha = 1;
			this.ctx1.strokeStyle = color;
			this.ctx1.lineWidth = 2;
			this.ctx1.arc(
				...this.crd2(obj.x, obj.y), 
				drawRadius + this.#visualObjectSelectAnimation, 
				0, 7);
			this.ctx1.stroke();
		}
	}

	isOutOfScreen(x, y, r = 0){
		return x + r < 0 || x - r > this.resolutionX || y + r < 0 || y - r > this.resolutionY;
	}

	// Visualize new object mass
	visObjMass(mass, color, posX = innerWidth/2, posY = innerHeight/2){
		// Fill circle
		let drawRadius = this.getScreenRad(mass);
		this.canv1.visualSelect = true;
		this.clearLayer1();

		// Darken background
		this.ctx1.globalAlpha = 0.5;
		
		this.ctx1.beginPath();
		this.ctx1.fillStyle = "#000000";
		this.ctx1.fillRect(0, 0, this.resolutionX, this.resolutionY);

		// Set alpha
		this.ctx1.globalAlpha = 0.8;

		// Draw object size
		Painter.fillCircle(
			this.ctx1, 
			posX, posY, 
			this.getScreenRad(mass), 
			color
		);

		this.ctx1.strokeStyle = "#fff";
		this.ctx1.lineWidth = 1;
		this.ctx1.beginPath();
		this.ctx1.arc(posX, posY, drawRadius, 0, 7);
		this.ctx1.stroke();	

		// Draw object negative mass indication
		if (mass < 0){
			Painter.drawMinusSign(
				this.ctx1,
				posX, posY,
				drawRadius * 0.6,
				"#000"
			);
		}
		this.ctx1.globalAlpha = 1;
	}

	// Show distance to main object
	visDistance(obj_cord, color = '#888888', objId = scene.objIdToOrbit){
		const tObj = scene.objArr[objId];
		if (tObj){
			const radius = dist(obj_cord[0], obj_cord[1], ...this.crd2(tObj.x, tObj.y));
			const ctx = this.ctx1;
			if (radius > this.getScreenRad(tObj.m)){
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				// Line
				ctx.beginPath();
				ctx.moveTo(obj_cord[0], obj_cord[1]);
				ctx.lineTo(...this.crd2(tObj.x, tObj.y));
				ctx.stroke();
				// Circle
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.arc(...this.crd2(tObj.x, tObj.y), radius, 0, 7);
				ctx.stroke();
				// Points
				Painter.fillCircle(ctx, ...this.crd2(tObj.x, tObj.y), 3, color);
				Painter.fillCircle(ctx, obj_cord[0], obj_cord[1], 3, color);

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
	}

	tracesMode1Wiping(){
		//console.log('clear layer 1');
		this.ctx2.save();
		this.ctx2.globalAlpha = ui.traceMode1Length.value;
		this.ctx2.globalCompositeOperation = 'destination-out';
		this.ctx2.fillStyle = "#FFF";
		this.ctx2.fillRect(0, 0, this.resolutionX, this.resolutionY);
		this.ctx2.restore();
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
	static fillCircle(tctx, x, y, radius, color, options = {}) {
		tctx.save();
	
		tctx.fillStyle = color;
		Object.assign(tctx, options);
		tctx.beginPath();
		tctx.arc(x, y, radius, 0, 6.3);
		tctx.fill();
		tctx.restore();		
	}

	static drawCross(tctx, x, y, width = 1, size = 5, color = '#ff0000'){
		tctx.save();
		tctx.strokeStyle = ui.backgroundColor.state;
		tctx.lineWidth = width;
		tctx.lineCap = 'round';
		for (let i = 0; i < 2; i++){
			tctx.beginPath();
			tctx.moveTo(x - size, y - size);
			tctx.lineTo(x + size, y + size);
			tctx.moveTo(x + size, y - size);
			tctx.lineTo(x - size, y + size);
			tctx.stroke();
			tctx.strokeStyle = color;
			tctx.lineWidth = width;
		}
		tctx.restore();	
	}

	static drawMinusSign(tctx, x, y, radius, color, options = {}) {
		tctx.save();
		tctx.strokeStyle = color;
		tctx.lineWidth = radius / 5;
		Object.assign(tctx, options);
		tctx.beginPath();
		tctx.arc(x, y, radius, 0, 6.3);

		tctx.moveTo(x - (radius * 0.66), y);
		tctx.lineTo(x + (radius * 0.66), y)
		tctx.stroke();
		tctx.restore();
	}
}