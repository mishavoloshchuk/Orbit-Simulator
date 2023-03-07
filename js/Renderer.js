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

	wipeColor = '#000000';
	constructor({scene, camera}) {
		// Set scene
		this.scene = scene;
		// Sec camera
		this.camera = camera;

		this.rendererWorker = new Worker("../js/rendererWorker.js");

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
		this.canv3.style.mixBlendMode = 'screen';
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
	//Draw objecs
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

			let drawRadius = Math.sqrt(Math.abs(obj.m))*this.camera.animZoom; // Object draw radius
			drawRadius = drawRadius < 0.5 ? 0.5 : drawRadius; // Minimal draw radius

			// If object out of screen space
			let isObjOutOfScreen = false;
			let isPrevPosObjOutOfScreen = false;

			const screenPos = this.crd2(obj.x, obj.y);
			const screenPrevPos = this.crd2(obj.x - obj.vx, obj.y - obj.vy);
			if (screenPos[0] < 0 - drawRadius || screenPos[0] > innerWidth + drawRadius || screenPos[1] < 0 - drawRadius || screenPos[1] > innerHeight + drawRadius){
				isObjOutOfScreen = true; // If out of screen
			}
			if (screenPrevPos[0] < 0 - drawRadius || screenPrevPos[0] > innerWidth + drawRadius || screenPrevPos[1] < 0 - drawRadius || screenPrevPos[1] > innerHeight + drawRadius){
				isPrevPosObjOutOfScreen = true; // If previous position is out of screen
			}

			const obCol = obj.color; // Object draw color
			// If object screen speed is enough to render or anyhting else 
			const enoughObjMove = Math.sqrt(Math.pow(obj.vx - targetVx, 2) + Math.pow(obj.vy - targetVy, 2))*ui.timeSpeed.state*this.camera.animZoom > 0.1 ? true : false;
			// Fix object anti-aliasing when maxPerformance is enabled
			if (ui.tracesMode.state == 1 && ui.maxPerformance.state){	
				if (// Smooth object edges if true
					(!scn.objArr[this.camera.Target] && !enoughObjMove) // If there is no camera target and object locked or
					|| ( scn.objArr[this.camera.Target] // If there is camera target
						&& ( // And
							(scn.objArr[this.camera.Target].lock && !enoughObjMove) // Camera target and object lock
							|| (!scn.objArr[this.camera.Target].lock && objectId == this.camera.Target) // Or target not locked and object is camera target
						)
					)
				){
					this.ctx1.save();
					this.ctx1.beginPath();
					this.ctx1.fillStyle = '#ffffff';
					this.ctx1.globalCompositeOperation = 'destination-out';
					this.ctx1.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), (drawRadius+0.125), 0, 7);
					this.ctx1.fill();
					this.ctx1.restore();
				}
			}

			let traceLength = false;
			let traceResolution = 1;
			// Traces mode 1 =====
			if (// Draw line if
				ui.tracesMode.state == 1 // If traces mode = 1
				&& (!obj.lock || (scn.objArr[this.camera.Target] && !scn.objArr[this.camera.Target].lock)) // If object not locked or camera target not locked
				&& this.camera.Target !== objectId // If camera target != current object
				&& !(isPrevPosObjOutOfScreen && isObjOutOfScreen) // If object (and it's prev position) not out of screen
			){
				let canv = ui.maxPerformance.state ? this.ctx1 : this.ctx3;
				canv.strokeStyle = obCol;
				canv.lineWidth = drawRadius * 2 - (enoughObjMove ? 0 : (drawRadius * 2 > 1.5) ? 1.5 : 0);
				canv.lineCap = drawRadius > 1 ? 'round' : 'butt';
				canv.beginPath();
				canv.moveTo(this.crd(obj.x - obj.vx*ui.timeSpeed.state + targetVx * ui.timeSpeed.state, 'x'), this.crd(obj.y - obj.vy*ui.timeSpeed.state + targetVy * ui.timeSpeed.state, 'y'));
				canv.lineTo(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'));
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
					this.ctx1.moveTo(this.crd(obj.x, 'x')+randX, this.crd(obj.y, 'y')+randY);
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
				traceLength = Math.ceil(scn.powerFunc(ui.traceMode3Length.state) / traceResolution);
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
				this.ctx1.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), drawRadius+1.5, 0, 7);
				this.ctx1.fill();
				this.ctx1.globalCompositeOperation = 'source-over';
			}
			if ((!(ui.maxPerformance.state === true && ui.tracesMode.state == 1) || obj.lock) && !isObjOutOfScreen){
				this.ctx1.fillStyle = obCol;
				this.ctx1.beginPath();
				this.ctx1.arc(...this.crd2(obj.x, obj.y), drawRadius, 0, 7);
				this.ctx1.fill();
			}
			if (obj.m < 0 && !isObjOutOfScreen){
				this.ctx1.strokeStyle = "#000";
				this.ctx1.lineWidth = drawRadius/10;
				this.ctx1.beginPath();
				this.ctx1.arc(this.crd(obj.x, 'x'), this.crd(obj.y, 'y'), drawRadius*0.6, 0, 7);

				this.ctx1.moveTo(this.crd(obj.x, 'x')-drawRadius*0.4, this.crd(obj.y, 'y'));
				this.ctx1.lineTo(this.crd(obj.x, 'x')+drawRadius*0.4, this.crd(obj.y, 'y'))
				this.ctx1.stroke();
			}

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
	}

	trajectoryCalculate({trajLen = 256, accuracity = 1, color = ['#006BDE', '#ffffff']}){
		// Ctrl pressed change mouse accuracity
		let [mcx, mcy] = mouse.ctrlModificatedMousePosition();
		// New obj velocity
		let svx = ((mouse.leftDownX - mcx)/30) * this.scene.powerFunc(ui.launchForce.state);
		let svy = ((mouse.leftDownY - mcy)/30) * this.scene.powerFunc(ui.launchForce.state);	
		trajLen = trajLen * accuracity; // Trajectory calculation accuracity
		let objArrCopy;
		if (ui.interactMode.state === '0'){ // Add all objects to trajectory calculate array
			objArrCopy = JSON.parse(JSON.stringify(this.scene.objArr));
		} else if (ui.interactMode.state === '1') { // Add all only main (and main of main) objects to trajectory calculate array
			let objects = []; // Array of objects to calculate
			// let orbObj = scene.objIdToOrbit;
			// while (orbObj !== undefined) {
				// objects.push(this.scene.objArr[orbObj]);
				// orbObj = this.scene.objArr[orbObj].main_obj;
			// }
			objects[0] = this.scene.objArr[scene.objIdToOrbit];
			objArrCopy = JSON.parse(JSON.stringify(objects));
		} else if (ui.interactMode.state === '2') { // Don't do any calculations, just draw the line
			// Line
			this.ctx2.save();
			this.ctx2.beginPath();
			this.ctx2.strokeStyle = ui.newObjColor.state;
			this.ctx2.lineWidth = 1;
			this.ctx2.setLineDash([2, 3]); // Dash line
			this.ctx2.moveTo(mouse.leftDownX, mouse.leftDownY);
			this.ctx2.lineTo(mouse.leftDownX+svx*trajLen*this.animZoom, mouse.leftDownY+svy*trajLen*this.animZoom);
			this.ctx2.stroke();				
			this.ctx2.restore();
			return;
		}

		let newObjId = this.scene.addNewObject({
			objArr: objArrCopy,
			screenX: mouse.leftDownX, // Position X
			screenY: mouse.leftDownY, // Position Y
			vx: svx, // Velocity X equals vx if given and svx if not
			vy: svy, // Velocity Y equals vy if given and svy if not
			mass: ui.newObjMass.state, // Object mass via given radius || Radius
			color: ui.newObjColor.state,
			objLck: ui.newObjLock.state,
			main_obj: this.scene.objIdToOrbit
		});

		const savedNewObjId = newObjId;

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
		let afterPhysicsCallback = (objectsArray, collidedObjectsIdList, interactMode, collisionType, timeSpeed) => {
			// Add velocities
			this.scene.addSelfVectors(objArrCopy, ui.timeSpeed.state/accuracity);
			
			let toDeleteObjectsList = [];
			toDeleteObjectsList = this.scene.collisionHandler(objectsArray, collisionType, timeSpeed);
			// for (let collidedObjectsId of collidedObjectsIdList){
			// 	toDeleteObjectsList.push(...this.scene.collision(objectsArray, collisionType, ...collidedObjectsId));
			// }

			// Change newObjId after delete some objects after collision
			newObjId = getIdAfterArrChange(toDeleteObjectsList, newObjId);

			// Delete objects after collide and return the deleted objects to the deletedObjectsList array
			if (toDeleteObjectsList.length > 0) deletedObjectsList = deletedObjectsList.concat(this.scene.deleteObject(toDeleteObjectsList, objArrCopy, null));

			// Add points to trajectory trace array
			for (let objectId = objArrCopy.length; objectId--;){
				let obj = objArrCopy[objectId];
				// Minimal distance calculate
				if (objArrCopy[newObjId]){
					let S = dist(objArrCopy[newObjId].x, objArrCopy[newObjId].y, obj.x, obj.y);
					if (objectId !== newObjId && S < distance[0]){
						distance[0] = S;
						distance[1] = {x: objArrCopy[newObjId].x, y: objArrCopy[newObjId].y, x2: obj.x, y2: obj.y, obj2Id: objectId};
					}
				}
				if (obj.lock !== true) trajectoryTraces[obj.initId].push([obj.x, obj.y]);

				// Debug show velocities
				// {
				// 	this.ctx2.save();
				// 	if (obj.lock === false){
				// 		this.ctx2.strokeStyle = this.ctx2.fillStyle = obj.color;

				// 		this.ctx2.globalAlpha = 0.2;
				// 		this.ctx2.beginPath();
				// 		this.ctx2.arc(...this.crd2(obj.x, obj.y), obj.r * this.animZoom, 0, 7);
				// 		this.ctx2.fill();

				// 		this.ctx2.globalAlpha = 1;
				// 		this.ctx2.beginPath();
				// 		this.ctx2.arc(...this.crd2(obj.x, obj.y), 2, 0, 7);
				// 		this.ctx2.fill();	

				// 		this.ctx2.lineWidth = 2;
				// 		this.ctx2.beginPath();
				// 		this.ctx2.moveTo(...this.crd2(obj.x, obj.y));
				// 		this.ctx2.lineTo(...this.crd2(obj.x - obj.vx * ui.timeSpeed.state, obj.y - obj.vy * ui.timeSpeed.state));
				// 		this.ctx2.stroke();

				// 	} else {
				// 		this.ctx2.strokeStyle = this.ctx2.fillStyle = '#000';
				// 		this.ctx2.beginPath();
				// 		this.ctx2.arc(...this.crd2(obj.x, obj.y), 2, 0, 7);
				// 		this.ctx2.fill();
				// 	}
				// 	this.ctx2.restore();
				// }
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
			this.scene.physicsCalculate(
				objArrCopy,
				afterPhysicsCallback,
				+ui.interactMode.state,
				ui.timeSpeed.state,
				ui.g.state/accuracity
			);
		}

		// Отображение точек сближения
		if (distance[1]){
			// New object arc
			this.ctx2.globalAlpha = 0.5;
			this.ctx2.fillStyle = ui.newObjColor.state;
			this.ctx2.beginPath();
			let mass = this.camera.getScreenRad(ui.newObjMass.state);
			mass = mass < 2 ? 2 : mass;
			this.ctx2.arc(this.crd(distance[1].x, 'x'), this.crd(distance[1].y, 'y'), mass, 0, 7);
			this.ctx2.fill();
			// Second object arc
			this.ctx2.beginPath();
			this.ctx2.fillStyle = this.scene.objArr[distance[1].obj2Id].color;
			mass = this.camera.getScreenRad(this.scene.objArr[distance[1].obj2Id].m);
			mass = mass < 2 ? 2 : mass;
			this.ctx2.arc(this.crd(distance[1].x2, 'x'), this.crd(distance[1].y2, 'y'), mass, 0, 7);
			this.ctx2.fill();

			// The line between approachment points	
			let gradient = this.ctx2.createLinearGradient(// Line gradient
				this.crd(distance[1].x, 'x'),//   X1
				this.crd(distance[1].y, 'y'),//   Y1
				this.crd(distance[1].x2, 'x'),//  X2
				this.crd(distance[1].y2, 'y'));// Y2
			gradient.addColorStop(0, ui.newObjColor.state); // New object color
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
					color  = ui.newObjColor.state;
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
						return trajLength + dist(point[0], point[1], pArr[pId-1][0], pArr[pId-1][1]);
					}
					return trajLength;
				}, 0) * this.camera.animZoom;

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
			const size = this.camera.getScreenRad(deletedObj.m)*0.7 < 3? 3 : this.camera.getScreenRad(deletedObj.m)*0.7;
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
		let [mcx, mcy] = mouse.ctrlModificatedMousePosition(); // CTRL mouse precision modificator

		let offsX = 0;
		let offsY = -30;
		if (['mobile', 'tablet'].includes(getDeviceType()) ){ offsX = -25; offsY = -70; } // If device is mobile or tablet
		Object.assign(launchPowerLabel.style, {left: (mouse.x+offsX)+'px', top: (mouse.y+offsY)+'px', display: 'block', color: ui.newObjColor.state});
		launchPowerLabel.innerHTML = Math.round(dist(mouse.leftDownX, mouse.leftDownY, mouse.x, mouse.y) * this.scene.powerFunc(ui.launchForce.state) * 100)/100;
		let D = this.camera.getScreenRad(ui.newObjMass.state)*2;

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

			const drawRadius = this.camera.getScreenRad(obj.m); // Object screen draw radius

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
		let drawRadius = this.camera.getScreenRad(mass);
		this.canv2.visualSelect = true;
		this.clearLayer2();

		// Darken background
		this.ctx2.globalAlpha = 0.5;
		this.ctx2.beginPath();
		this.ctx2.fillStyle = this.wipeColor;
		this.ctx2.fillRect(0, 0, this.resolutionX, this.resolutionY);

		// Draw object size
		this.ctx2.globalAlpha = 0.8;
		this.ctx2.beginPath();
		this.ctx2.fillStyle = color;
		this.ctx2.arc(posX, posY, this.camera.getScreenRad(mass), 0, 7);
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
		canvas.globalAlpha = 0.01;
		canvas.fillStyle = this.wipeColor;
		canvas.fillRect(0, 0, this.resolutionX, this.resolutionY);
		canvas.globalAlpha = 1;	
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
		canvObj.strokeStyle = this.wipeColor;
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