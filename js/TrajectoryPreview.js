import Physics from './Physics.js';
export default class TrajectoryPreview {
	constructor ({scene, renderer, camera, physics}){
		this.scene = scene;
		this.renderer = renderer;
		this.camera = camera;
		this.physics = physics;
	}

	process ({trajLen = 256, accuracity = 1}){
		this.sceneClone = this.physics.scene = this.scene.makeCopy();
		this.physics.scene = this.sceneClone; // Set physics scene to clone of given scene
		const calcInfo = this.calculate({trajLen: trajLen, accuracity: accuracity});
		this.render(calcInfo);
		this.physics.scene = this.scene; // Restore physiscs scene
	}

	render({tracesArray, deletedObjectsList, distances, minDistance}){
		const ctx2 = this.renderer.ctx2;
		const newObjId = tracesArray.length - 1; // Created object id
		const otherObjTraceColor = "#999999"; // The trace color for non new object
		// Line dash settings
		const dashLineLen = 2; // Dash pattern line length
		const dashSpaceLen = 3; // Dash pattern space length
		const trajectoryEndSmooth = 300; // Trajectory end smooth length
		// Iterating trajectory traces
		for (let trace = 0; trace < tracesArray.length; trace ++){
			if (tracesArray[trace] !== undefined){ // Don't draw if the object is locked
				let R, color;
				// Set styles to new object trajectory trace
				if (trace === newObjId){
					color  = ui.newObjColor.state;
					R = 2.5;
				} else {
					color = otherObjTraceColor;
					R = 0.75;
				}
				// ==== Making line dash pattern ===========================
				const dashPattern = []; // Dashed line pattern array
				// Trajectory trace length in pixels
				let traceLenInPixs = tracesArray[trace].reduce((trajLength, point, pId, pArr)=>{
					if (pId != 0) {
						return trajLength + dist(point[0], point[1], pArr[pId-1][0], pArr[pId-1][1]);
					}
					return trajLength;
				}, 0) * this.camera.animZoom;
				 // Minimal value between trajectory end smooth length and trajectory trace length in pixels
				const possibleTrajEndSmooth = Math.min(trajectoryEndSmooth, traceLenInPixs);
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
				ctx2.beginPath();
				ctx2.setLineDash(dashPattern); // Dash line
				ctx2.strokeStyle = color;
				ctx2.lineWidth = R;
				ctx2.moveTo(...this.renderer.crd2(tracesArray[trace][0][0], tracesArray[trace][0][1]));
				for (let point of tracesArray[trace]){
					ctx2.lineTo(...this.renderer.crd2(point[0], point[1]));
				}
				ctx2.stroke();
				ctx2.setLineDash([]); // Solid line
			}
		}
		// Proximity display
		for (let distance of distances){
			const dObj = distance.obj;
				// New object arc
				const isNearest = distance.D === minDistance;
				if (isNearest){
					ctx2.globalAlpha = 0.7;
					ctx2.fillStyle = ui.newObjColor.state;
					ctx2.beginPath();
					let drawRadius = this.renderer.getScreenRad(ui.newObjMass.state);
					drawRadius = drawRadius < 2 ? 2 : drawRadius;
					ctx2.arc(this.renderer.crd(dObj.x, 'x'), this.renderer.crd(dObj.y, 'y'), drawRadius, 0, 7);
					ctx2.fill();
					// Second object arc
					ctx2.beginPath();
					ctx2.fillStyle = this.scene.objArr[dObj.obj2Id].color;
					drawRadius = this.renderer.getScreenRad(this.scene.objArr[dObj.obj2Id].m);
					drawRadius = drawRadius < 2 ? 2 : drawRadius;
					ctx2.arc(this.renderer.crd(dObj.x2, 'x'), this.renderer.crd(dObj.y2, 'y'), drawRadius, 0, 7);
					ctx2.fill();
				} else {
					ctx2.globalAlpha = 0.3;
				}

				// The line between approachment points	
				if (isNearest){
					let gradient = ctx2.createLinearGradient(// Line gradient
						this.renderer.crd(dObj.x, 'x'),//   X1
						this.renderer.crd(dObj.y, 'y'),//   Y1
						this.renderer.crd(dObj.x2, 'x'),//  X2
						this.renderer.crd(dObj.y2, 'y'));// Y2
					gradient.addColorStop(0, ui.newObjColor.state); // New object color
					gradient.addColorStop(1, this.scene.objArr[dObj.obj2Id].color); // Second object color
					ctx2.strokeStyle = gradient;
					ctx2.lineWidth = 2; // Line width between approachment points
				} else {
					ctx2.strokeStyle = otherObjTraceColor;
					ctx2.lineWidth = 1; // Line width between approachment points
				}
				ctx2.beginPath();
				ctx2.moveTo(this.renderer.crd(dObj.x, 'x'), this.renderer.crd(dObj.y, 'y'));
				ctx2.lineTo(this.renderer.crd(dObj.x2, 'x'), this.renderer.crd(dObj.y2, 'y'));
				ctx2.stroke();
				ctx2.globalAlpha = 1;
		}
		// Draw the cross if object(s) deleted after collision
		for (let deletedObj of deletedObjectsList){
			const size = this.renderer.getScreenRad(deletedObj.m)*0.7 < 3? 3 : this.renderer.getScreenRad(deletedObj.m)*0.7;
			// Circle
			ctx2.save();
			ctx2.beginPath();
			ctx2.globalAlpha = 0.3;
			ctx2.fillStyle = '#f30';
			let drawRadius = this.renderer.getScreenRad(deletedObj.m);
			drawRadius = drawRadius < 2 ? 2 : drawRadius;
			ctx2.arc(...this.renderer.crd2(deletedObj.x, deletedObj.y), drawRadius, 0, 7);
			ctx2.fill();

			ctx2.restore();
			this.renderer.drawCross(
				this.renderer.crd(deletedObj.x, 'x'),
				this.renderer.crd(deletedObj.y, 'y'), 
				1.5, 
				size, 
				'#ff0000'
			);
		}
	}

	calculate({trajLen, accuracity}) {
		const objArrCopy = this.sceneClone.objArr;
		// Create new object
		let newObjId = this.sceneClone.addNewObject({...newObjParams, callback: false});

		// Array with all trajectory traces
		const trajectoryTraces = [];
		for (let objectId in objArrCopy){
			objArrCopy[objectId].initId = objectId;
			if (objArrCopy[objectId].lock !== true){
				trajectoryTraces[objectId] = [[objArrCopy[objectId].x, objArrCopy[objectId].y]];
			}
		}

		// Trajectory calculation accuracity. Change iterations count to keep the same length.
		trajLen = trajLen * accuracity;

		const deletedObjectsList = []; // Array of deleted objects
		// Make distances array
		const distances = [];
		for (let i = objArrCopy.length - 1; i--;){
			distances[i] = {D: Infinity, obj: {}};
		}
		// Minimal distance during trajectory calculating
		let minDistance = Infinity;

		// Calculate all trajectories
		for (let i = trajLen; i--;){
			// Calculate minimal distance
			for (let objectId = objArrCopy.length; objectId--;){
				const obj = objArrCopy[objectId];
				// Check distances
				if (objArrCopy[newObjId]){
					const D = dist(objArrCopy[newObjId].x, objArrCopy[newObjId].y, obj.x, obj.y);
					if (objectId !== newObjId){
						if (D < distances[objectId].D){
							distances[objectId].D = D;
							distances[objectId].obj = {x: objArrCopy[newObjId].x, y: objArrCopy[newObjId].y, x2: obj.x, y2: obj.y, obj2Id: objectId};
						}
						if (D < minDistance){
							minDistance = D;
						}
					}
				}
			}
			// Merge collision
			if (ui.collisionMode.state == '0'){
				const deletedObjsData = this.physics.mergeCollision();
				deletedObjectsList.push(...deletedObjsData.objArr);

				// Change newObjId after delete some objects after collision
				newObjId = UtilityMethods.getIdAfterArrChange(deletedObjsData.idArr, newObjId);
			}
			// Bounce collision preprocessing
			ui.collisionMode.state == '1' && this.physics.pullOutFromEachOther();

			// Physics compute
			if (gpuComputeAvailable && ui.gpuCompute.state && objArrCopy.length > 400) { // If objects more than 480, calculate on GPU
				this.physics.gpuComputeVelocities(
					undefined,
					+ui.interactMode.state,
					ui.timeSpeed.state / accuracity,
					ui.g.state
				);
			} else {
				this.physics.physicsCalculate(
					undefined,
					+ui.interactMode.state,
					ui.timeSpeed.state / accuracity,
					ui.g.state
				);
			}

			// Add points to trajectory trace array
			for (let objectId = objArrCopy.length; objectId--;){
				const obj = objArrCopy[objectId];

				// Add point to traces array
				if (obj.lock === false) trajectoryTraces[obj.initId].push([obj.x, obj.y]);
			}
		}
		// Params to return
		const params = {
			tracesArray: trajectoryTraces,
			deletedObjectsList: deletedObjectsList,
			distances: distances,
			minDistance: minDistance
		};
		return params;
	}
}