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
		let scn = this.scene;
		if (ui.tracesMode.state === '1'){
			this.tracesMode1Wiping();
		} else {
			this.clearLayer3();
		}
		if (!ui.maxPerformance.state) this.clearLayer1();
		// Camera target velocity
		const targetVx = scn.objArr[this.camera.Target] ? scn.objArr[this.camera.Target].vx : 0;
		const targetVy = scn.objArr[this.camera.Target] ? scn.objArr[this.camera.Target].vy : 0;
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

			// If object out of screen space
			let isObjOutOfScreen = false;
			let isPrevPosObjOutOfScreen = false;
			const screenPrevPos = this.crd2(obj.x - obj.vx, obj.y - obj.vy);
			if (screenX < 0 - drawRadius || screenX > innerWidth + drawRadius || screenY < 0 - drawRadius || screenY > innerHeight + drawRadius){
				isObjOutOfScreen = true; // If out of screen
			}
			if (screenPrevPos[0] < 0 - drawRadius || screenPrevPos[0] > innerWidth + drawRadius || screenPrevPos[1] < 0 - drawRadius || screenPrevPos[1] > innerHeight + drawRadius){
				isPrevPosObjOutOfScreen = true; // If previous position is out of screen
			}

			const obCol = obj.color; // Object draw color

			// Fix object anti-aliasing when maxPerformance is enabled
			if (ui.tracesMode.state == 1 
				&& ui.maxPerformance.state 
				&& !enoughObjMove 
				&& !isObjOutOfScreen
			){	
				this.ctx1.save();
				this.ctx1.beginPath();
				this.ctx1.fillStyle = '#FFF';
				this.ctx1.globalCompositeOperation = 'destination-out';
				this.ctx1.arc(screenX, screenY, drawRadius + 0.4, 0, 7);
				this.ctx1.fill();
				this.ctx1.restore();
			}

			let traceLength = false;
			let traceResolution = 1;

			const traceDrawRadius = Math.min(drawRadius, obj.prevScreenR);

			// Traces mode 1 =====
			if (ui.tracesMode.state == 1 
				&& (enoughObjMove || (ui.maxPerformance.state === true && ui.tracesMode.state == 1 && enoughObjMove))
				&& !(isObjOutOfScreen && isPrevPosObjOutOfScreen)
			){
				let canv = ui.maxPerformance.state ? this.ctx1 : this.ctx3;
				canv.strokeStyle = obCol;
				canv.lineWidth = traceDrawRadius * 2;
				canv.lineCap = traceDrawRadius > 1 ? 'round' : 'butt';
				canv.beginPath();
				canv.moveTo(obj.prevScreenX, obj.prevScreenY);
				canv.lineTo(screenX, screenY);
				canv.stroke();
				canv.lineCap = 'butt';
			} else
			// Traces mode 2 =====
			if (ui.tracesMode.state == 2 && !obj.lock){
				let randKff = 0.8;
				let TLength = obj.trace.length; //Length of trace array
				let prev_randX = 0, prev_randY = 0;
				let randX = 0, randY = 0;
				traceLength = Math.round(Math.pow(8, ui.traceMode2Length.state));

				this.ctx1.fillStyle = obCol;
				this.ctx1.strokeStyle = obCol;
				this.ctx1.globalCompositeOperation = 'destination-over';
				if (obj.trace[0]){
					this.ctx1.lineWidth = drawRadius*2;
					this.ctx1.beginPath();
					this.ctx1.moveTo(screenX + randX, screenY + randY);
					this.ctx1.lineTo(this.crd(obj.trace[0][0], 'x')+prev_randX, this.crd(obj.trace[0][1], 'y')+prev_randY);
					this.ctx1.stroke();				
				}
				for (let i in obj.trace){
					let itr = i-1;
					itr = itr < 0?0:itr;
					prev_randX = randX; prev_randY = randY;
					let rnd_lim = drawRadius*(i/TLength)*randKff;
					if (ui.traceMode2Trembling.state === true || ui.traceMode2Particles.state === true){
						randX = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
						randY = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
					}
					this.ctx1.lineWidth = drawRadius * (1-i/TLength) * 1.8;
					// Particles
					if (ui.traceMode2Particles.state){
						this.ctx1.beginPath();
						this.ctx1.translate(
							Math.floor(this.crd(obj.trace[itr][0],'x')+randX*2), 
							Math.floor(this.crd(obj.trace[itr][1],'y')+randY*2));
						this.ctx1.rotate(Math.random()*3.14);
						this.ctx1.fillRect(0-this.ctx1.lineWidth/2, 0-this.ctx1.lineWidth/2, this.ctx1.lineWidth, this.ctx1.lineWidth);
						this.ctx1.fill();
						this.ctx1.resetTransform();
					}
					// Line
					if (ui.traceMode2Trembling.state === false) randX = randY = 0;
					this.ctx1.globalAlpha = (TLength-i/1.5)/TLength;
					this.ctx1.beginPath();
					this.ctx1.moveTo(this.crd(obj.trace[i][0], 'x')+randX, this.crd(obj.trace[i][1], 'y')+randY);
					this.ctx1.lineTo(this.crd(obj.trace[itr][0], 'x')+prev_randX, this.crd(obj.trace[itr][1], 'y')+prev_randY);
					this.ctx1.stroke();
					this.ctx1.globalAlpha = 1;
				}
				this.ctx1.globalCompositeOperation = 'source-over';
			} else
			// Traces mode 3 =====
			if (ui.tracesMode.state == 3 && !obj.lock){
				traceResolution = 61 - Math.round(Math.pow(ui.traceMode3Quality.state, 1/8)*60);
				traceLength = Math.ceil(scn.expVal(ui.traceMode3Length.state) / traceResolution);
				this.ctx1.strokeStyle = obCol;
				this.ctx1.lineWidth = Math.min(drawRadius*1.7, Math.pow(ui.traceMode3Width.state, 10));
				this.ctx1.globalCompositeOperation = 'destination-over';
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
					if (this.ctx1.lineWidth > 3) {
						this.ctx1.lineCap = 'round';
						this.ctx1.lineJoin = 'round';
					}
					this.ctx1.beginPath();
					this.ctx1.moveTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
					for (let i in obj.trace){
						let itr = i;
						this.ctx1.lineTo(this.crd(obj.trace[itr][0], 'x'), this.crd(obj.trace[itr][1], 'y'));
					}
					this.ctx1.stroke();
					this.ctx1.lineCap = 'butt';
					this.ctx1.lineJoin = 'bevel';
				}
				// Separate the traces of objects
				this.ctx1.globalCompositeOperation = 'destination-out';
				this.ctx1.fillStyle = "#ffffff";
				this.ctx1.beginPath();
				this.ctx1.arc(screenX, screenY, drawRadius+1.5, 0, 7);
				this.ctx1.fill();
				this.ctx1.globalCompositeOperation = 'source-over';
			}
			if (!isObjOutOfScreen) {
				if (!(ui.maxPerformance.state === true && ui.tracesMode.state == 1 && enoughObjMove)){
					this.ctx1.fillStyle = obCol;
					this.ctx1.beginPath();
					this.ctx1.arc(screenX, screenY, drawRadius, 0, 7);
					this.ctx1.fill();
				}

				if (obj.m < 0){
					this.ctx1.strokeStyle = "#000";
					this.ctx1.lineWidth = drawRadius/10;
					this.ctx1.beginPath();
					this.ctx1.arc(screenX, screenY, drawRadius*0.6, 0, 7);

					this.ctx1.moveTo(screenX-drawRadius*0.4, screenY);
					this.ctx1.lineTo(screenX+drawRadius*0.4, screenY)
					this.ctx1.stroke();
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
		launchPowerLabel.innerHTML = Math.round(dist(mouse.leftDownX, mouse.leftDownY, mouse.x, mouse.y) * this.scene.expVal(ui.launchForce.state) * 100)/100;
		let D = this.getScreenRad(ui.newObjMass.state)*2;

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