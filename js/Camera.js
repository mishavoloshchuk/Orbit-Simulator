import UserInput from '/js/UserInput.js';
export default class Camera{
	static cameraId = 0;
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

	#visualObjectSelectAnimation = 10;
	#visualObjectSelectAnimDir = 0;

	#x = 0; #y = 0; // Target camera position
	get x() { return this.#x } get y() { return this.#y } // Get x, y handler
	set x(pos) { this.#x = pos; this.cameraChangedState(); } // Set x handler
	set y(pos) { this.#y = pos; this.cameraChangedState(); } // Set y handler
	ax = 0; ay = 0; // Actualy camera postiton with animation
	lastX = 0; lastY = 0; // Last camera position
	zoom = 1; // Target zoom
	animZoom = 1; // Actualy zoom with animation
	zoomCff = 1.25; // Zoom coefficient
	Target = false; // Follow target object
	switchTarget = false;
	animTimeCorrect = 5;
	animTime = 5;
	animationDuration = 5; // Animation duration
	animation = true; // Enable camera animation
	renderedSceneFrames = 0;
	allowFrameRender = true; // Forces render frame if true and frame not render
	#clrDelay = false;
	#clrDTim = 75/(1 + 1/this.animationDuration - 1); // Time to clear, after camera move animation
	#clrTmt = setTimeout(()=>{ this.#clrDelay = false }, this.#clrDTim);
	cameraChangedState(){
		this.#clrDelay = true;
		clearTimeout(this.#clrTmt);;
		this.#clrTmt = setTimeout(()=>{ this.#clrDelay = false }, this.#clrDTim);
	}

	constructor(scene){
		this.scene = scene;
		this.layersDiv = document.createElement('div');
		this.layersDiv.setAttribute('id', 'renderLayers_camera_'+Camera.cameraId);

		this.cameraId = Camera.cameraId;
		this.canv0 = document.createElement('canvas');
		this.canv0.id = 'layer0_cam'+this.cameraId;
		this.canv0.className = 'renderLayer';
		this.canv0.style.zIndex = -4;
		this.canv0.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv0);
		this.ctx = this.canv0.getContext('2d',{willReadFrequently: false});

		this.canv2 = document.createElement('canvas');
		this.canv2.id = 'layer1_cam'+this.cameraId;
		this.canv2.className = 'renderLayer';
		this.canv2.style.zIndex = -2;
		this.canv2.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv2);
		this.ctx2 = this.canv2.getContext('2d', {willReadFrequently: false});

		this.canv3 = document.createElement('canvas');
		this.canv3.id = 'layer2_cam'+this.cameraId;
		this.canv3.className = 'renderLayer';
		this.canv3.style.zIndex = -6;
		this.canv3.style.mixBlendMode = 'screen';
		this.canv3.style.filter = 'blur(0px)';
		this.canv3.style.opacity = 0.7;
		this.canv3.innerHTML = 'Your browser does not support canvas!';
		this.layersDiv.appendChild(this.canv3);
		this.ctx3 = this.canv3.getContext('2d',{willReadFrequently: false});

		document.body.appendChild(this.layersDiv);

		// Camera resolution
		this.resolutionX = window.innerWidth;
		this.resolutionY = window.innerHeight;

		Camera.cameraId ++;
	}

	frame(){
		// If camera changed position or zoom
		if (this.#clrDelay){ 
			scene.camera.clearLayer3(); 
			this.allowFrameRender = true;
		}
	}

	//Draw
	renderObjects(){
		// console.log('Render objects');
		let scn = this.scene;
		if (scn.tracesMode.state === '1'){
			this.tracesMode1Wiping();
		} else {
			this.clearLayer3();
		}
		if (scn.backgroundDarkness.state !== 0) this.clearLayer1();
		this.animFunc();
		for (let objectId in scn.objArr){
			let obj = scn.objArr[objectId];
			let prevScreenX = (obj.x - (obj.x - obj.vx)) != this.x - this.lastX;
			let prevScreenY = (obj.y - (obj.y - obj.vy)) != this.y - this.lastY;
			let obCol = obj.color;
			let obj_rad = Math.sqrt(Math.abs(obj.m))*this.animZoom;
			obj_rad = obj_rad < 0.5 ? 0.5 : obj_rad;

			if (obj.m < 0){ obj.color = obCol = this.scene.randomColor(true) }

			let render = (prevScreenX || prevScreenY);
			let dcanv = scn.backgroundDarkness.state != 0 ? this.ctx3 : this.ctx;
			if (scn.tracesMode.state == 1 && !obj.lock){
				let targetVx = scn.objArr[this.Target] ? scn.objArr[this.Target].vx : 0;
				let targetVy = scn.objArr[this.Target] ? scn.objArr[this.Target].vy : 0;
				if (scn.backgroundDarkness.state != 0){
					if (this.Target != objectId){
						this.ctx3.fillStyle = obCol;
						this.ctx3.beginPath();
						this.ctx3.arc(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'), obj_rad, 0, 7);
						this.ctx3.fill();
					}
				} else {
					if (!render && objectId !== mov_obj){
						this.ctx.beginPath();
						this.ctx.fillStyle = '#000000';
						this.ctx.arc(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'), (obj_rad+0.125), 0, 7);
						this.ctx.fill();
					}
				}
			}

			let traceLength = false;
			let traceResolution = 1;
			//Trajectory mode 1 =====
			if (scn.tracesMode.state == 1){
				if (!obj.lock){//prev_t_obj != objectId
					//Target Velocity
					let targetVx = scn.objArr[this.Target] ? scn.objArr[this.Target].vx : 0;
					let targetVy = scn.objArr[this.Target] ? scn.objArr[this.Target].vy : 0;
					dcanv.strokeStyle = obCol;
					dcanv.lineWidth = obj_rad*2;
					dcanv.lineCap = obj_rad > 1 ? 'round' : 'butt';
					dcanv.beginPath();
					dcanv.moveTo(this.crd(obj.x-obj.vx*scn.timeSpeed.state+targetVx, 'x'), this.crd(obj.y-obj.vy*scn.timeSpeed.state+targetVy, 'y'));
					dcanv.lineTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
					dcanv.stroke();
					dcanv.lineCap = 'butt';
				}
			} else
			//Trajectory mode 2 =====
			if (scn.tracesMode.state == 2 && !obj.lock){
				let randKff = 0.8;
				let TLength = obj.trace.length; //Length of trace array
				let prev_randX = 0, prev_randY = 0;
				let randX = 0, randY = 0;
				traceLength = Math.round(Math.pow(8, scn.traceMode2Length.state));

				this.ctx.fillStyle = obCol;
				this.ctx.strokeStyle = obCol;
				this.ctx.globalCompositeOperation = 'destination-over';
				if (obj.trace[0]){
					this.ctx.lineWidth = obj_rad*2;
					this.ctx.beginPath();
					this.ctx.moveTo(this.crd(obj.x, 'x')+randX, this.crd(obj.y, 'y')+randY);
					this.ctx.lineTo(this.crd(obj.trace[0][0], 'x')+prev_randX, this.crd(obj.trace[0][1], 'y')+prev_randY);
					this.ctx.stroke();				
				}
				for (let i in obj.trace){
					let itr = i-1;
					itr = itr < 0?0:itr;
					prev_randX = randX; prev_randY = randY;
					let rnd_lim = obj_rad*(i/TLength)*randKff;
					if (scn.traceMode2Trembling.state === true || scn.traceMode2Particles.state === true){
						randX = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
						randY = scn.getRandomArbitrary(-rnd_lim, rnd_lim);
					}
					this.ctx.lineWidth = obj_rad * (1-i/TLength) * 1.8;
					// Particles
					if (scn.traceMode2Particles.state){
						this.ctx.beginPath();
						this.ctx.translate(
							Math.floor(this.crd(obj.trace[itr][0],'x')+randX*2), 
							Math.floor(this.crd(obj.trace[itr][1],'y')+randY*2));
						this.ctx.rotate(Math.random()*3.14);
						this.ctx.fillRect(0-this.ctx.lineWidth/2, 0-this.ctx.lineWidth/2, this.ctx.lineWidth, this.ctx.lineWidth);
						this.ctx.fill();
						this.ctx.resetTransform();
					}
					// Line
					if (scn.traceMode2Trembling.state === false) randX = randY = 0;
					this.ctx.globalAlpha = (TLength-i/1.5)/TLength;
					this.ctx.beginPath();
					this.ctx.moveTo(this.crd(obj.trace[i][0], 'x')+randX, this.crd(obj.trace[i][1], 'y')+randY);
					this.ctx.lineTo(this.crd(obj.trace[itr][0], 'x')+prev_randX, this.crd(obj.trace[itr][1], 'y')+prev_randY);
					this.ctx.stroke();
					this.ctx.globalAlpha = 1;
				}
				this.ctx.globalCompositeOperation = 'source-over';
			} else
			//Trajectory mode 3 =====
			if (scn.tracesMode.state == 3 && !obj.lock){
				traceResolution = +scn.traceMode3Quality.element.getAttribute('max') + 1 - Math.round(scn.traceMode3Quality.state);
				traceLength = Math.ceil(scn.powerFunc(scn.traceMode3Length.state) / traceResolution);
				this.ctx.strokeStyle = obCol;
				this.ctx.lineWidth = Math.min(obj_rad*1.7, Math.pow(scn.traceMode3Width.state, 10));
				this.ctx.globalCompositeOperation = 'destination-over';
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
					if (this.ctx.lineWidth > 3) {
						this.ctx.lineCap = 'round';
						this.ctx.lineJoin = 'round';
					}
					this.ctx.beginPath();
					this.ctx.moveTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
					for (let i in obj.trace){
						let itr = i;
						this.ctx.lineTo(this.crd(obj.trace[itr][0], 'x'), this.crd(obj.trace[itr][1], 'y'));
					}
					this.ctx.stroke();
					this.ctx.lineCap = 'butt';
					this.ctx.lineJoin = 'bevel';
				}
				// Separate the traces of objects
				this.ctx.globalCompositeOperation = 'destination-out';
				this.ctx.fillStyle = "#ffffff";
				this.ctx.beginPath();
				this.ctx.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), obj_rad+1.5, 0, 7);
				this.ctx.fill();
				this.ctx.globalCompositeOperation = 'source-over';
			}
			this.ctx.fillStyle = obCol;
			this.ctx.beginPath();
			this.ctx.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), obj_rad, 0, 7);
			this.ctx.fill();

			if (!obj.lock && !pauseState && this.renderedSceneFrames % traceResolution === 0){
				obj.trace.unshift([obj.x, obj.y]);
				while (obj.trace.length > traceLength){
					obj.trace.pop();
				}
			}
		}
		if (!pauseState){
			this.renderedSceneFrames ++;
		}
	} // End draw

	trajectoryCalculate({trajLen = 256, accuracity = 1, color = ['#006BDE', '#ffffff']}){
		// Ctrl pressed change mouse accuracity
		let mcx = scene.mouse_coords[0] ? scene.mouse_coords[0] - (scene.mouse_coords[0] - mouse.x)/10 : mouse.x;
		let mcy = scene.mouse_coords[1] ? scene.mouse_coords[1] - (scene.mouse_coords[1] - mouse.y)/10 : mouse.y;
		// New obj vector
		let svx = ((mouse.leftDownX - mcx)/30) * this.scene.powerFunc(this.scene.launchForce.state);
		let svy = ((mouse.leftDownY - mcy)/30) * this.scene.powerFunc(this.scene.launchForce.state);	
		trajLen = trajLen * accuracity; // Trajectory calculation accuracity
		let objArrCopy;
		if (this.scene.interactMode.state === '0'){ // Add all objects to trajectory calculate array
			objArrCopy = JSON.parse(JSON.stringify(this.scene.objArr));
		} else if (this.scene.interactMode.state === '1') { // Add all only main (and main of main) objects to trajectory calculate array
			let objects = []; // Array of objects to calculate
			// let orbObj = scene.objIdToOrbit;
			// while (orbObj !== undefined) {
				// objects.push(this.scene.objArr[orbObj]);
				// orbObj = this.scene.objArr[orbObj].main_obj;
			// }
			objects[0] = this.scene.objArr[scene.objIdToOrbit];
			objArrCopy = JSON.parse(JSON.stringify(objects));
		} else if (this.scene.interactMode.state === '2') { // Don't do any calculations, just draw the line
			// Line
			this.ctx2.beginPath();
			this.ctx2.strokeStyle = this.scene.newObjColor.state;
			this.ctx2.lineWidth = 1;
			this.ctx2.moveTo(mouse.leftDownX, mouse.leftDownY);
			this.ctx2.lineTo(mouse.leftDownX+svx*trajLen*this.animZoom, mouse.leftDownY+svy*trajLen*this.animZoom);
			this.ctx2.stroke();				
			return;
		}

		let newObjId = objArrCopy.length;
		let savedNewObjId = newObjId;
		objArrCopy[objArrCopy.length] = {
			x: this.screenPix(mouse.leftDownX + svx/2, 'x'), // Position X
			y: this.screenPix(mouse.leftDownY + svy/2, 'y'), // Position Y
			vx: svx, // Velocity X equals vx if given and svx if not
			vy: svy, // Velocity Y equals vy if given and svy if not
			m: this.scene.newObjMass.state, // Object mass via given radius || Radius
			color: this.scene.newObjColor.state,
			lock: this.scene.newObjLock.state,
			trace: [],
			main_obj: 0
		};

		// Create a trajectoryTrace array in each object
		let trajectoryTraces = [];
		for (let objectId in objArrCopy){
			objArrCopy[objectId].initId = objectId;
			if (objArrCopy[objectId].lock !== true){
				trajectoryTraces[objectId] = [[objArrCopy[objectId].x, objArrCopy[objectId].y]];
			}
		}
		let deletedObjectsList = [];
		let distance = [Infinity, ];
		let afterPhysicsCallback = (...args) => {
			const toDeleteObjectsList = this.scene.collision(...args);
			this.scene.addSelfVectors(objArrCopy, this.scene.timeSpeed.state/accuracity);

			// Delete virtual objects
			toDeleteObjectsList.forEach((objId)=>{
				// Change new object ID
				if (newObjId > objId) newObjId --;
				else if (newObjId == objId) newObjId = NaN;
			});

			// Delete objects after collide and return the deleted objects to the deletedObjectsList array
			deletedObjectsList = deletedObjectsList.concat(this.scene.deleteObject(toDeleteObjectsList, objArrCopy));

			// Add points to trajectory trace array
			for (let objectId = objArrCopy.length; objectId--;){
				let obj = objArrCopy[objectId];
				// Minimal distance calculate
				if (objArrCopy[newObjId]){
					let S = rad(objArrCopy[newObjId].x, objArrCopy[newObjId].y, obj.x, obj.y);
					if (objectId !== newObjId && S < distance[0]){
						distance[0] = S;
						distance[1] = {x: objArrCopy[newObjId].x, y: objArrCopy[newObjId].y, x2: obj.x, y2: obj.y, obj2Id: objectId};
					}
				}
				if (obj.lock !== true) trajectoryTraces[obj.initId].push([obj.x, obj.y]);
			}
				
			// if (!mouse.move && mouse.leftDown){
			// 	this.scene.physicsMultiThreadCalculate(objArrCopy, afterPhysicsCallback);
			// }
		}
		// this.ctx2.globalAlpha = 1;
		// this.scene.physicsMultiThreadCalculate(objArrCopy, (...args)=>{
		// 	//console.log(this);
		// 	afterPhysicsCallback(...args);
		// });
		for (let i = trajLen; i > 0; i--){ // Objects trajectory calculate
			this.scene.physicsCalculate(objArrCopy, afterPhysicsCallback, this.scene.interactMode.state, this.scene.timeSpeed.state, this.scene.g.state/accuracity);
		}

		// Отображение точек сближения
		if (distance[1]){
			// New object arc
			this.ctx2.globalAlpha = 0.5;
			this.ctx2.fillStyle = this.scene.newObjColor.state;
			this.ctx2.beginPath();
			let mass = Math.sqrt(Math.abs(this.scene.newObjMass.state))*this.animZoom;
			mass = mass < 2 ? 2 : mass;
			this.ctx2.arc(this.crd(distance[1].x, 'x'), this.crd(distance[1].y, 'y'), mass, 0, 7);
			this.ctx2.fill();
			// Second object arc
			this.ctx2.beginPath();
			this.ctx2.fillStyle = this.scene.objArr[distance[1].obj2Id].color;
			mass = Math.sqrt(Math.abs(this.scene.objArr[distance[1].obj2Id].m))*this.animZoom;
			mass = mass < 2 ? 2 : mass;
			this.ctx2.arc(this.crd(distance[1].x2, 'x'), this.crd(distance[1].y2, 'y'), mass, 0, 7);
			this.ctx2.fill();

			// The line between approachment points	
			let gradient = this.ctx2.createLinearGradient(// Line gradient
				this.crd(distance[1].x, 'x'),//   X1
				this.crd(distance[1].y, 'y'),//   Y1
				this.crd(distance[1].x2, 'x'),//  X2
				this.crd(distance[1].y2, 'y'));// Y2
			gradient.addColorStop(0, this.scene.newObjColor.state); // New object color
			gradient.addColorStop(1, this.scene.objArr[distance[1].obj2Id].color); // Second object color
			this.ctx2.strokeStyle = gradient;
			this.ctx2.lineWidth = 2; // Line width between approachment points
			this.ctx2.beginPath();
			this.ctx2.moveTo(this.crd(distance[1].x, 'x'), this.crd(distance[1].y, 'y'));
			this.ctx2.lineTo(this.crd(distance[1].x2, 'x'), this.crd(distance[1].y2, 'y'));
			this.ctx2.stroke();
			this.ctx2.globalAlpha = 1;		
		}

		// Draw trajectory lines
		// Line dash settings
		let dashLineLen = 2; // Dash pattern line length
		let dashSpaceLen = 3; // Dash pattern space length
		let trajectoryEndSmooth = 300; // Trajectory end smooth length
		for (let trace = 0; trace < trajectoryTraces.length; trace ++){
			if (trajectoryTraces[trace] !== undefined){ // Don't draw if the object is locked
				let R, color;
				// Set styles to new object trajectory trace
				if (trace === savedNewObjId){
					color  = this.scene.newObjColor.state;
					R = 2;
				} else { // Set styles to objects trajectory trace
					color = "#999999";
					R = 1;
				}
				// Dashed line
				let dashPattern = []; // Dashed line pattern array
				// ==== Making line dash pattern ===========================
				// Trajectory trace length in pixels
				let traceLenInPixs = trajectoryTraces[trace].reduce((trajLength, point, pId, pArr)=>{
					if (pId != 0) {
						return trajLength + rad(point[0], point[1], pArr[pId-1][0], pArr[pId-1][1]);
					}
					return trajLength;
				}, 0) * this.animZoom;
				const possibleTrajEndSmooth = Math.min(trajectoryEndSmooth, traceLenInPixs); // Minimal value between trajectory end smooth length and trajectory trace length in pixels
				// Form dash pattern to smooth the end of trajectory
				while (traceLenInPixs > 0){
					if (traceLenInPixs > possibleTrajEndSmooth){ // Trajecroty pattern
						if (dashPattern.length % 2 === 0){ // Line
							traceLenInPixs -= dashLineLen;
							dashPattern.push(dashLineLen); // Add pattern
						} else { // Space
							traceLenInPixs -= dashSpaceLen;
							dashPattern.push(dashSpaceLen); // Add pattern
						}
					} else { // Trajectory end smoothing pattern
						if (dashPattern.length % 2 === 0){ // Line
							const line = traceLenInPixs / possibleTrajEndSmooth * dashLineLen;
							traceLenInPixs -= line;
							dashPattern.push(line); // Add pattern
						} else { // Space
							traceLenInPixs -= dashSpaceLen;
							dashPattern.push(dashSpaceLen); // Add pattern
						}
					}
				}
				this.ctx2.beginPath();
				this.ctx2.setLineDash(dashPattern); // Dash line
				this.ctx2.strokeStyle = color;
				this.ctx2.lineWidth = R;
				this.ctx2.moveTo(this.crd(trajectoryTraces[trace][0][0], 'x'), this.crd(trajectoryTraces[trace][0][1], 'y'));
				for (let point of trajectoryTraces[trace]){
					this.ctx2.lineTo(this.crd(point[0], 'x'), this.crd(point[1], 'y'));
				}
				this.ctx2.stroke();
				this.ctx2.setLineDash([]); // Solid line
			}
		}
		// Draw the cross if object deleted after collision
		for (let deletedObj of deletedObjectsList){
			const size = Math.sqrt(Math.abs(deletedObj.m))*0.7 < 5? 5 : Math.sqrt(Math.abs(deletedObj.m))*0.7;
			this.drawCross(
				this.crd(deletedObj.x - deletedObj.vx, 'x'), 
				this.crd(deletedObj.y - deletedObj.vy, 'y'), 
				2, 
				size, 
				'#ff0000'
			);
		}
	}

	visual_trajectory(){
		this.clearLayer2();
		let mcx = this.scene.mouse_coords[0] ? this.scene.mouse_coords[0] - (this.scene.mouse_coords[0] - mouse.x)/10 : mouse.x;
		let mcy = this.scene.mouse_coords[1] ? this.scene.mouse_coords[1] - (this.scene.mouse_coords[1] - mouse.y)/10 : mouse.y;

		let offsX = -10;
		let offsY = -30;
		if (['mobile', 'tablet'].includes( getDeviceType() ) ){ offsX = -25; offsY = -140; } // If device is mobile or tablet
		Object.assign(launchPowerLabel.style, {left: (mouse.x+offsX)+'px', top: (mouse.y+offsY)+'px', display: 'block', color: this.scene.newObjColor.state});
		launchPowerLabel.innerHTML = Math.round(this.scene.rad(mouse.leftDownX, mouse.leftDownY, mouse.x, mouse.y) * this.scene.powerFunc(this.scene.launchForce.state) * 100)/100;
		let D = Math.sqrt(Math.abs(this.scene.newObjMass.state))*this.animZoom*2;
		this.ctx2.globalAlpha = 0.5;
		this.ctx2.strokeStyle = this.scene.newObjColor.state;
		this.ctx2.lineWidth = D < 0.5 ? 0.5 : Math.sqrt(Math.abs(this.scene.newObjMass.state))*this.animZoom*2;
		this.ctx2.beginPath();
		this.ctx2.moveTo(mouse.leftDownX, mouse.leftDownY);
		this.ctx2.lineTo(mcx, mcy);
		this.ctx2.stroke();
		this.ctx2.globalAlpha = 1;

		this.ctx2.beginPath();
		this.ctx2.fillStyle = this.scene.newObjColor.state;
		this.ctx2.arc(scene.mpos[0], scene.mpos[1], D/2, 0, 7);
		this.ctx2.fill();
	}

	//Визуальное выделение объекта
	visualObjectSelect(mode, color, objectId, alpha = 0.3) {
		this.canv2.visualSelect = true;
		this.clearLayer2();
		if (this.scene.objArr.length){ // If there are objects
			let selectObjId;
			if (!this.scene.objArr[objectId]){
				selectObjId = this.scene.objectSelect(mode);			
			} else {
				selectObjId = objectId;
			}

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
			if (alpha > 0){
				// Fill circle
				this.ctx2.beginPath();
				this.ctx2.globalAlpha = alpha;
				this.ctx2.fillStyle = color;
				this.ctx2.arc(
					(this.crd(this.scene.objArr[selectObjId].x, 'x')), 
					(this.crd(this.scene.objArr[selectObjId].y, 'y')), 
					Math.sqrt(Math.abs(this.scene.objArr[selectObjId].m)) * this.animZoom + this.#visualObjectSelectAnimation, 
					0, 7);
				this.ctx2.fill();
			}
			// Stroke circle
			this.ctx2.beginPath();
			this.ctx2.globalAlpha = 1;
			this.ctx2.strokeStyle = color;
			this.ctx2.lineWidth = 2;
			this.ctx2.arc(
				(this.crd(this.scene.objArr[selectObjId].x, 'x')), 
				(this.crd(this.scene.objArr[selectObjId].y, 'y')), 
				Math.sqrt(Math.abs(this.scene.objArr[selectObjId].m)) * this.animZoom + this.#visualObjectSelectAnimation, 
				0, 7);
			this.ctx2.stroke();	
		}
	}

	crd (coord, axis){		// Cursor position
		let sCtrX = this.#resolutionX/2 - this.ax;
		let sCtrY = this.#resolutionY/2 - this.ay;

		switch (axis){
			case 'x': return coord*this.animZoom + sCtrX - this.ax*(this.animZoom-1);
			case 'y': return coord*this.animZoom + sCtrY - this.ay*(this.animZoom-1);
		}		
	}

	screenPix(coord, axis){		// Cursor position
		let sCtrX = window.innerWidth/2 - this.ax;
		let sCtrY = window.innerHeight/2 - this.ay;

		switch (axis){
			case 'x': return coord/this.animZoom - (sCtrX - this.ax*(this.animZoom-1))/(this.animZoom);
			case 'y': return coord/this.animZoom - (sCtrY - this.ay*(this.animZoom-1))/(this.animZoom);
		}
	}

	animFunc(){
		let animSpeedCorrected = this.animTimeCorrect*(16/fpsIndicator.frameTime);
		if (this.switchTarget){
			this.animTimeCorrect -= (this.animTime-1)/(400/fpsIndicator.frameTime);
		} else {
			this.animTimeCorrect = this.animationDuration;
		}
		animSpeedCorrected = animSpeedCorrected < 1 ? 1 : animSpeedCorrected;
		this.animZoom += ((this.zoom-this.animZoom)/animSpeedCorrected);
		this.lastX = this.ax; this.lastY = this.ay;
		if (this.animation){
			this.ax += (this.x-this.ax)/(animSpeedCorrected/(this.zoom/this.animZoom));
			this.ay += (this.y-this.ay)/(animSpeedCorrected/(this.zoom/this.animZoom));
		} else {
			this.ax = this.x; this.ay = this.y;
		}
	}

	zoomIn(vl = this.zoomCff){ // Zoom IN. vl is a zoom coeficient
		this.cameraChangedState();
		if (this.zoom < 10000){
			this.zoom *= vl; // Set zoom value
			if (this.scene.zoomToCursor.state){
				this.x += (this.screenPix(mouse.x, 'x')-this.x)/(vl/(vl-1));
				this.y += (this.screenPix(mouse.y, 'y')-this.y)/(vl/(vl-1));
			}
		}
	}

	zoomOut(vl = this.zoomCff){ // Zoom OUT. vl is a zoom coeficient
		this.cameraChangedState();
		if (this.zoom > 1.0e-12){
			this.zoom /= vl; // Set zoom value
			if (this.scene.zoomToCursor.state){
				this.x -= (this.screenPix(mouse.x, 'x')-this.x)/(1/(vl-1));
				this.y -= (this.screenPix(mouse.y, 'y')-this.y)/(1/(vl-1));
			}
		}
	}

	tracesMode1Wiping(){
		//console.log('clear layer 1');
		let canvas = this.scene.backgroundDarkness.state != 0 ? this.ctx3 : this.ctx;
		canvas.globalAlpha = 0.01;
		canvas.fillStyle = '#000000';
		canvas.fillRect(0, 0, this.resolutionX, this.resolutionY);
		canvas.globalAlpha = 1;	
	}
	clearLayer1(col){
		//console.log('clear layer 1');
		this.ctx.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	clearLayer2(){
		// console.log('clear layer 2');
		this.ctx2.clearRect(0, 0, this.resolutionX, this.resolutionY);
		delete this.canv2.changed;
	}
	clearLayer3(){
		//console.log('clear layer 3');
		let canvas = this.scene.backgroundDarkness.state != 0 ? this.ctx3 : this.ctx;
		canvas.clearRect(0, 0, this.resolutionX, this.resolutionY);
	}
	//Draw cross function
	drawCross(x, y, width = 1, size = 5, color = '#ff0000', canvObj = this.ctx2){
		canvObj.strokeStyle = '#000000';
		canvObj.lineWidth = 2;
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

}