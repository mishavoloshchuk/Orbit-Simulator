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

	#visualObjectSelectAnimation = 10;
	#visualObjectSelectAnimDir = 0;

	dimmColor = '#000000';
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
		const className = 'renderLayer';
		const canvas = document.createElement('canvas');
		canvas.id = 'renderer' + this.rendererId + '-layer' + this.#layersCount;
		canvas.className = className;
		canvas.innerHTML = 'Your browser does not support canvas!';
		Object.assign(canvas.style, styles);
		targetNode.appendChild(canvas);

		this['canv' + this.#layersCount] = canvas;
		this['ctx' + this.#layersCount] = canvas.getContext('2d',{willReadFrequently: false});
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
		const scn = this.scene;

		const tracesMode = +ui.tracesMode.state;
		const maxPerformance = ui.maxPerformance.state;

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

		if (tracesMode === 1){
			this.tracesMode1Wiping();
		} else {
			this.clearLayer3();
		}

		if (!maxPerformance) this.clearLayer1();

		// If max performance is enabled and traces mode is 1
		const maxPerformanceAndTrcMd1 = maxPerformance === true && tracesMode === 1;


		for (let objectId = 0; objectId < scn.objArr.length; objectId++){
			let obj = scn.objArr[objectId]; // Object to draw

			let drawRadius = this.getScreenRad(obj.m) // Object draw radius
			drawRadius = drawRadius < 0.5 ? 0.5 : drawRadius; // Minimal draw radius

			if (!obj.prevScreenR) {
				obj.prevScreenR = drawRadius;
			}

			// Object screen position
			const [screenX, screenY] = this.crd2(obj.x, obj.y);

			let enoughObjMove = true; // If object screen speed is enough to render or anything else
			// Set prev screen position if there is no prev screen position
			if (obj.prevScreenX === undefined || obj.prevScreenY === undefined){
				[obj.prevScreenX, obj.prevScreenY] = [screenX, screenY];
			} else {
				enoughObjMove = dist(screenX, screenY, obj.prevScreenX, obj.prevScreenY) > 0.3 ? true : false;
			}

			const traceDrawRadius = Math.min(drawRadius, obj.prevScreenR);

			// If object out of screen space
			const isObjOutOfScreen = this.isOutOfScreen(screenX, screenY, drawRadius);
			const isPrevPosObjOutOfScreen = this.isOutOfScreen(obj.prevScreenX, obj.prevScreenY, traceDrawRadius);

			const obCol = obj.color; // Object draw color


			let traceLength = false;
			let traceResolution = 1;

			// Traces mode 1 =====
			if (tracesMode === 1){
				// Fix object anti-aliasing when maxPerformance is enabled
				if (maxPerformance
					&& !enoughObjMove 
					&& !isObjOutOfScreen
				){	
					c0.save();
					c0.beginPath();
					c0.fillStyle = '#FFF';
					c0.globalCompositeOperation = 'destination-out';
					c0.arc(screenX, screenY, drawRadius + 0.4, 0, 7);
					c0.fill();
					c0.restore();
				}
				// Draw trace
				if ((enoughObjMove || maxPerformanceAndTrcMd1)
					&& !(isObjOutOfScreen && isPrevPosObjOutOfScreen)
				){
					let canv = maxPerformance ? c0 : c2;
					canv.strokeStyle = obCol;
					canv.lineWidth = traceDrawRadius * 2;
					canv.lineCap = traceDrawRadius > 1 ? 'round' : 'butt';
					canv.beginPath();
					const pixelShiftX = obj.prevScreenX === screenX ? 0.001 : 0;
					canv.moveTo(obj.prevScreenX + pixelShiftX, obj.prevScreenY);
					canv.lineTo(screenX, screenY);
					canv.stroke();
					canv.lineCap = 'butt';
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
							c0.beginPath();
							c0.arc(
								Math.floor(point2ScreenX + randX * 2), 
								Math.floor(point2ScreenY + randY * 2),
								lineWidth / 2,
								0,
								7
							);
							c0.fill();
							c0.resetTransform();
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
					c0.globalCompositeOperation = 'destination-out';
					c0.fillStyle = "#ffffff";
					c0.beginPath();
					c0.arc(screenX, screenY, drawRadius+1.5, 0, 7);
					c0.fill();
					c0.globalCompositeOperation = 'source-over';
				}
			}

			if (!isObjOutOfScreen) {
				if (!maxPerformanceAndTrcMd1){
					c0.fillStyle = obCol;
					c0.beginPath();
					c0.arc(screenX, screenY, drawRadius, 0, 7);
					c0.fill();
				}

				if (obj.m < 0){
					c0.strokeStyle = "#000";
					c0.lineWidth = drawRadius/10;
					c0.beginPath();
					c0.arc(screenX, screenY, drawRadius*0.6, 0, 7);

					c0.moveTo(screenX-drawRadius*0.4, screenY);
					c0.lineTo(screenX+drawRadius*0.4, screenY)
					c0.stroke();
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
		this.clearLayer2();
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
		gradient.addColorStop(1, "#0000"); // Alpha
		this.ctx1.strokeStyle = gradient;

		this.ctx1.lineWidth = D < 1 ? 1 : D;
		this.ctx1.beginPath();
		this.ctx1.moveTo(mouse.leftDownX, mouse.leftDownY);
		this.ctx1.lineTo(mcx, mcy);
		this.ctx1.stroke();
		this.ctx1.globalAlpha = 1;

		this.ctx1.beginPath();
		this.ctx1.fillStyle = ui.newObjColor.state;
		this.ctx1.arc(mouse.leftDownX, mouse.leftDownY, D/2, 0, 7);
		this.ctx1.fill();

		if (ui.newObjMass.state < 0){
			this.ctx1.strokeStyle = "#000";
			this.ctx1.lineWidth = D/2/10;
			this.ctx1.beginPath();
			this.ctx1.arc(mouse.leftDownX, mouse.leftDownY, D/2*0.6, 0, 7);

			this.ctx1.moveTo(mouse.leftDownX-D/2*0.4, mouse.leftDownY);
			this.ctx1.lineTo(mouse.leftDownX+D/2*0.4, mouse.leftDownY)
			this.ctx1.stroke();
		}
	}

	//Визуальное выделение объекта
	visualObjectSelect(objectId, color, alpha = 0.3) {
		// console.log(objectId)
		const obj = this.scene.objArr[objectId];
		if (obj){ // If there are target object
			this.canv1.visualSelect = true;
			this.clearLayer2();
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
				this.ctx1.beginPath();
				this.ctx1.globalAlpha = alpha;
				this.ctx1.fillStyle = color;
				this.ctx1.arc(
					...this.crd2(obj.x, obj.y), 
					drawRadius + this.#visualObjectSelectAnimation, 
					0, 7);
				this.ctx1.fill();
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
		this.clearLayer2();

		// Darken background
		this.ctx1.globalAlpha = 0.5;
		this.ctx1.beginPath();
		this.ctx1.fillStyle = this.dimmColor;
		this.ctx1.fillRect(0, 0, this.resolutionX, this.resolutionY);

		// Draw object size
		this.ctx1.globalAlpha = 0.8;
		this.ctx1.beginPath();
		this.ctx1.fillStyle = color;
		this.ctx1.arc(posX, posY, this.getScreenRad(mass), 0, 7);
		this.ctx1.fill();

		this.ctx1.strokeStyle = "#fff";
		this.ctx1.lineWidth = 1;
		this.ctx1.beginPath();
		this.ctx1.arc(posX, posY, drawRadius, 0, 7);
		this.ctx1.stroke();	

		// Draw object negative mass indication
		if (mass < 0){
			this.ctx1.strokeStyle = "#000";
			this.ctx1.lineWidth = drawRadius/10;
			this.ctx1.beginPath();
			this.ctx1.arc(posX, posY, drawRadius*0.6, 0, 7);

			this.ctx1.moveTo(posX-drawRadius*0.4, posY);
			this.ctx1.lineTo(posX+drawRadius*0.4, posY)
			this.ctx1.stroke();
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
				ctx.beginPath();
				ctx.fillStyle = color;
				ctx.arc(...this.crd2(tObj.x, tObj.y), 3, 0, 7);
				ctx.arc(obj_cord[0], obj_cord[1], 3, 0, 7);
				ctx.fill();
				ctx.beginPath();

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
		let canvas = ui.maxPerformance.state ? this.ctx0 : this.ctx2;
		canvas.save();
		canvas.globalAlpha = ui.traceMode1Length.value;
		canvas.globalCompositeOperation = 'destination-out';
		canvas.fillStyle = "#FFF";
		canvas.fillRect(0, 0, this.resolutionX, this.resolutionY);
		canvas.restore();
	}
	clearLayer1(col){
		//console.log('clear layer 1');
		this.ctx0.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	clearLayer2(){
		// console.log('clear layer 2');
		this.ctx1.clearRect(0, 0, this.resolutionX, this.resolutionY);
		delete this.canv1.changed;
	}
	clearLayer3(){
		//console.log('clear layer 3');
		let canvas = ui.maxPerformance.state ? this.ctx0 : this.ctx2;
		canvas.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	//Draw cross function
	drawCross(x, y, width = 1, size = 5, color = '#ff0000', canvObj = this.ctx1){
		canvObj.strokeStyle = this.dimmColor;
		canvObj.lineWidth = width;
		canvObj.lineCap = 'round';
		for (let i = 0; i < 2; i++){
			canvObj.beginPath();
			canvObj.moveTo(x - size, y - size);
			canvObj.lineTo(x + size, y + size);
			canvObj.moveTo(x + size, y - size);
			canvObj.lineTo(x - size, y + size);
			canvObj.stroke();
			canvObj.strokeStyle = color;
			canvObj.lineWidth = width;
		}
		canvObj.lineCap = 'butt';
	}

	// Get object screen radius
	getScreenRad(mass){
		let screenRad = this.scene.getRadiusFromMass(mass) * this.camera.animZoom;
		return screenRad < 0.25 ? 0.25 : screenRad;
	}
}