export default class Renderer {
	static rendererId = 0;

	#resolutionX = window.innerWidth;
	#resolutionY = window.innerHeight;

	set resolutionX (resolutionX){
		this.#resolutionX = this.canv0.width = this.canv2.width = this.canv3.width = resolutionX;
	}
	set resolutionY (resolutionY){
		this.#resolutionY = this.canv0.height = this.canv2.height = this.canv3.height = resolutionY;
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
		this.layersDiv = document.createElement('div');
		this.layersDiv.setAttribute('id', 'renderLayers_renderer_' + Renderer.rendererId);

		// Init render layer 1
		this.canv0 = document.createElement('canvas');
		this.canv0.id = 'layer0_renderer' + this.rendererId;
		this.canv0.className = 'renderLayer';
		this.canv0.style.zIndex = -4;
		this.canv0.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv0);
		this.ctx1 = this.canv0.getContext('2d',{willReadFrequently: false});

		// Init render layer 2
		this.canv2 = document.createElement('canvas');
		this.canv2.id = 'layer1_renderer' + this.rendererId;
		this.canv2.className = 'renderLayer';
		this.canv2.style.zIndex = -2;
		this.canv2.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv2);
		this.ctx2 = this.canv2.getContext('2d', {willReadFrequently: false});

		// Init render layer 3
		this.canv3 = document.createElement('canvas');
		this.canv3.id = 'layer2_renderer' + this.rendererId;
		this.canv3.className = 'renderLayer';
		this.canv3.style.zIndex = -6;
		this.canv3.style.filter = 'blur(0px)';
		this.canv3.style.opacity = 0.7;
		this.canv3.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv3);
		this.ctx3 = this.canv3.getContext('2d',{willReadFrequently: false});

		// Camera resolution
		this.resolutionX = window.innerWidth;
		this.resolutionY = window.innerHeight;

		document.getElementById('renderLayers').appendChild(this.layersDiv);

		Renderer.rendererId ++;
	}
	crd (coord, axis){ // Get object screen position
		const sCtrX = this.resolutionX/2 - this.camera.ax;
		const sCtrY = this.resolutionY/2 - this.camera.ay;

		switch (axis){
			case 'x': return coord*this.camera.animZoom + sCtrX - this.camera.ax*(this.camera.animZoom-1);
			case 'y': return coord*this.camera.animZoom + sCtrY - this.camera.ay*(this.camera.animZoom-1);
		}		
	}

	crd2 (xpos, ypos){ // Get object screen position
		const sCtrX = this.resolutionX/2 - this.camera.ax;
		const sCtrY = this.resolutionY/2 - this.camera.ay;

		return [xpos * this.camera.animZoom + sCtrX - this.camera.ax*(this.camera.animZoom-1), ypos * this.camera.animZoom + sCtrY - this.camera.ay*(this.camera.animZoom-1)];		
	}
	//Draw objects
	renderObjects(){
		// console.log('Render objects');
		const scn = this.scene;

		const tracesMode = +ui.tracesMode.state;
		const maxPerformance = ui.maxPerformance.state;

		const {
			ctx1: c1,
			ctx2: c2,
			ctx3: c3
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


		for (let objectId = scn.objArr.length; objectId--;){
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
					c1.save();
					c1.beginPath();
					c1.fillStyle = '#FFF';
					c1.globalCompositeOperation = 'destination-out';
					c1.arc(screenX, screenY, drawRadius + 0.4, 0, 7);
					c1.fill();
					c1.restore();
				}
				// Draw trace
				if ((enoughObjMove || maxPerformanceAndTrcMd1)
					&& !(isObjOutOfScreen && isPrevPosObjOutOfScreen)
				){
					let canv = maxPerformance ? c1 : c3;
					canv.strokeStyle = obCol;
					canv.lineWidth = traceDrawRadius * 2;
					canv.lineCap = traceDrawRadius > 1 ? 'round' : 'butt';
					canv.beginPath();
					canv.moveTo(obj.prevScreenX, obj.prevScreenY);
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

					c1.save(); // Save canvas

					c1.fillStyle = obCol;
					c1.strokeStyle = obCol;
					c1.globalCompositeOperation = 'destination-over';
					if (obj.trace[0]){
						c1.lineWidth = drawRadius*2;
						c1.beginPath();
						c1.moveTo(screenX + randX, screenY + randY);
						c1.lineTo(this.crd(obj.trace[0][0], 'x')+prev_randX, this.crd(obj.trace[0][1], 'y')+prev_randY);
						c1.stroke();				
					}
					for (let i = obj.trace.length; i--;){
						let itr = i-1;
						itr = itr < 0 ? 0 : itr;

						// Set prev random point
						prev_randX = randX; prev_randY = randY;

						// Random limit
						const rnd_lim = drawRadius*(i/TLength)*randKff;
						if (traceMode2Trembling === true || traceMode2Particles === true){
							randX = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
							randY = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
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
							c1.beginPath();
							c1.arc(
								Math.floor(point2ScreenX + randX * 2), 
								Math.floor(point2ScreenY + randY * 2),
								lineWidth / 2,
								0,
								7
							);
							c1.fill();
							c1.resetTransform();
						}
						// Line drawing
						if (!(point1OutOfScreen === true && point2OutOfScreen === true)){ // If both points not out of screen
							c1.lineWidth = lineWidth;
							if (traceMode2Trembling === false) randX = randY = 0;
							c1.globalAlpha = (TLength-i/1.5)/TLength;
							c1.beginPath();
							c1.moveTo(point1ScreenX + randX, point1ScreenY + randY);
							c1.lineTo(point2ScreenX + prev_randX, point2ScreenY + prev_randY);
							c1.stroke();
							c1.globalAlpha = 1;
						}
					}
					c1.restore(); // Restore canvas
				}
			}
			// Traces mode 3 =====
			else if (tracesMode === 3){
				if (!obj.lock){
					traceResolution = 61 - Math.round(Math.pow(traceMode3Quality, 1/8)*60);
					traceLength = Math.ceil(scn.expVal(traceMode3Length) / traceResolution);
					c1.strokeStyle = obCol;
					c1.lineWidth = Math.min(drawRadius*1.7, Math.pow(traceMode3Width, 10));
					c1.globalCompositeOperation = 'destination-over';
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
						if (c1.lineWidth > 3) {
							c1.lineCap = 'round';
							c1.lineJoin = 'round';
						}
						c1.beginPath();
						c1.moveTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
						for (let i in obj.trace){
							let itr = i;
							c1.lineTo(this.crd(obj.trace[itr][0], 'x'), this.crd(obj.trace[itr][1], 'y'));
						}
						c1.stroke();
						c1.lineCap = 'butt';
						c1.lineJoin = 'bevel';
					}
					// Separate the traces of objects
					c1.globalCompositeOperation = 'destination-out';
					c1.fillStyle = "#ffffff";
					c1.beginPath();
					c1.arc(screenX, screenY, drawRadius+1.5, 0, 7);
					c1.fill();
					c1.globalCompositeOperation = 'source-over';
				}
			}

			if (!isObjOutOfScreen) {
				if (!maxPerformanceAndTrcMd1){
					c1.fillStyle = obCol;
					c1.beginPath();
					c1.arc(screenX, screenY, drawRadius, 0, 7);
					c1.fill();
				}

				if (obj.m < 0){
					c1.strokeStyle = "#000";
					c1.lineWidth = drawRadius/10;
					c1.beginPath();
					c1.arc(screenX, screenY, drawRadius*0.6, 0, 7);

					c1.moveTo(screenX-drawRadius*0.4, screenY);
					c1.lineTo(screenX+drawRadius*0.4, screenY)
					c1.stroke();
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
		if (['mobile', 'tablet'].includes(getDeviceType()) ){ offsX = -25; offsY = -70; } // If device is mobile or tablet
		Object.assign(launchPowerLabel.style, {left: (mouse.x+offsX)+'px', top: (mouse.y+offsY)+'px', display: 'block', color: ui.newObjColor.state});
		launchPowerLabel.innerHTML = Math.round(Math.hypot(newObjParams.vx, newObjParams.vy)*10000)/1000;
		const D = this.getScreenRad(ui.newObjMass.state)*2;

		// Gradient
		let gradient = this.ctx2.createLinearGradient(
			mouse.leftDownX,//   X1
			mouse.leftDownY,//   Y1
			mcx,//  X2
			mcy);// Y2
		gradient.addColorStop(0, ui.newObjColor.state); // New object color
		gradient.addColorStop(1, "#0000"); // Alpha
		this.ctx2.strokeStyle = gradient;

		this.ctx2.lineWidth = D < 1 ? 1 : D;
		this.ctx2.beginPath();
		this.ctx2.moveTo(mouse.leftDownX, mouse.leftDownY);
		this.ctx2.lineTo(mcx, mcy);
		this.ctx2.stroke();
		this.ctx2.globalAlpha = 1;

		this.ctx2.beginPath();
		this.ctx2.fillStyle = ui.newObjColor.state;
		this.ctx2.arc(mouse.leftDownX, mouse.leftDownY, D/2, 0, 7);
		this.ctx2.fill();

		if (ui.newObjMass.state < 0){
			this.ctx2.strokeStyle = "#000";
			this.ctx2.lineWidth = D/2/10;
			this.ctx2.beginPath();
			this.ctx2.arc(mouse.leftDownX, mouse.leftDownY, D/2*0.6, 0, 7);

			this.ctx2.moveTo(mouse.leftDownX-D/2*0.4, mouse.leftDownY);
			this.ctx2.lineTo(mouse.leftDownX+D/2*0.4, mouse.leftDownY)
			this.ctx2.stroke();
		}
	}

	//Визуальное выделение объекта
	visualObjectSelect(objectId, color, alpha = 0.3) {
		// console.log(objectId)
		const obj = this.scene.objArr[objectId];
		if (obj){ // If there are target object
			this.canv2.visualSelect = true;
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
				this.ctx2.beginPath();
				this.ctx2.globalAlpha = alpha;
				this.ctx2.fillStyle = color;
				this.ctx2.arc(
					...this.crd2(obj.x, obj.y), 
					drawRadius + this.#visualObjectSelectAnimation, 
					0, 7);
				this.ctx2.fill();
			}
			// Stroke circle
			this.ctx2.beginPath();
			this.ctx2.globalAlpha = 1;
			this.ctx2.strokeStyle = color;
			this.ctx2.lineWidth = 2;
			this.ctx2.arc(
				...this.crd2(obj.x, obj.y), 
				drawRadius + this.#visualObjectSelectAnimation, 
				0, 7);
			this.ctx2.stroke();
		}
	}

	isOutOfScreen(x, y, r = 0){
		return x + r < 0 || x - r > this.resolutionX || y + r < 0 || y - r > this.resolutionY;
	}

	// Visualize new object mass
	visObjMass(mass, color, posX = innerWidth/2, posY = innerHeight/2){
		// Fill circle
		let drawRadius = this.getScreenRad(mass);
		this.canv2.visualSelect = true;
		this.clearLayer2();

		// Darken background
		this.ctx2.globalAlpha = 0.5;
		this.ctx2.beginPath();
		this.ctx2.fillStyle = this.dimmColor;
		this.ctx2.fillRect(0, 0, this.resolutionX, this.resolutionY);

		// Draw object size
		this.ctx2.globalAlpha = 0.8;
		this.ctx2.beginPath();
		this.ctx2.fillStyle = color;
		this.ctx2.arc(posX, posY, this.getScreenRad(mass), 0, 7);
		this.ctx2.fill();

		this.ctx2.strokeStyle = "#fff";
		this.ctx2.lineWidth = 1;
		this.ctx2.beginPath();
		this.ctx2.arc(posX, posY, drawRadius, 0, 7);
		this.ctx2.stroke();	

		// Draw object negative mass indication
		if (mass < 0){
			this.ctx2.strokeStyle = "#000";
			this.ctx2.lineWidth = drawRadius/10;
			this.ctx2.beginPath();
			this.ctx2.arc(posX, posY, drawRadius*0.6, 0, 7);

			this.ctx2.moveTo(posX-drawRadius*0.4, posY);
			this.ctx2.lineTo(posX+drawRadius*0.4, posY)
			this.ctx2.stroke();
		}
		this.ctx2.globalAlpha = 1;
	}

	tracesMode1Wiping(){
		//console.log('clear layer 1');
		let canvas = ui.maxPerformance.state ? this.ctx1 : this.ctx3;
		canvas.save();
		canvas.globalAlpha = ui.traceMode1Length.value;
		canvas.globalCompositeOperation = 'destination-out';
		canvas.fillStyle = "#FFF";
		canvas.fillRect(0, 0, this.resolutionX, this.resolutionY);
		canvas.restore();
	}
	clearLayer1(col){
		//console.log('clear layer 1');
		this.ctx1.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	clearLayer2(){
		// console.log('clear layer 2');
		this.ctx2.clearRect(0, 0, this.resolutionX, this.resolutionY);
		delete this.canv2.changed;
	}
	clearLayer3(){
		//console.log('clear layer 3');
		let canvas = ui.maxPerformance.state ? this.ctx1 : this.ctx3;
		canvas.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	//Draw cross function
	drawCross(x, y, width = 1, size = 5, color = '#ff0000', canvObj = this.ctx2){
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