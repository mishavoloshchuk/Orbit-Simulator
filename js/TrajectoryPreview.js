import Physics from './Physics.js';
export default class TrajectoryPreview {
	constructor ({scene, renderer, camera}){
		this.scene = scene;
		this.renderer = renderer;
		this.camera = camera;
		this.physics = new Physics();
	}

	trajectoryPreview ({trajLen = 256, accuracity = 1}){
		this.sceneClone = this.physics.scene = this.scene.makeCopy();
		const calcInfo = this.calculateTrajectories({trajLen: trajLen, accuracity: accuracity});
		this.renderTrajPreview(calcInfo);
	}

	renderTrajPreview({tracesArray, deletedObjectsList, distances, minDistance}){
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
					R = 2;
				} else {
					color = otherObjTraceColor;
					R = 1;
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
					let drawRadius = this.camera.getScreenRad(ui.newObjMass.state);
					drawRadius = drawRadius < 2 ? 2 : drawRadius;
					ctx2.arc(this.renderer.crd(dObj.x, 'x'), this.renderer.crd(dObj.y, 'y'), drawRadius, 0, 7);
					ctx2.fill();
					// Second object arc
					ctx2.beginPath();
					ctx2.fillStyle = this.scene.objArr[dObj.obj2Id].color;
					drawRadius = this.camera.getScreenRad(this.scene.objArr[dObj.obj2Id].m);
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
			const size = this.camera.getScreenRad(deletedObj.m)*0.7 < 3? 3 : this.camera.getScreenRad(deletedObj.m)*0.7;
			this.renderer.drawCross(
				this.renderer.crd(deletedObj.x - deletedObj.vx, 'x'),
				this.renderer.crd(deletedObj.y - deletedObj.vy, 'y'), 
				2, 
				size, 
				'#ff0000'
			);
		}
	}

	calculateTrajectories({trajLen, accuracity}) {
		// Create new object
		let newObjId = this.sceneClone.addNewObject({...newObjParams, callback: false});
		const objArrCopy = this.sceneClone.objArr;

		// Array with all trajectory traces
		const trajectoryTraces = [];

		for (let objectId in objArrCopy){
			objArrCopy[objectId].initId = objectId;
			if (objArrCopy[objectId].lock !== true){
				trajectoryTraces[objectId] = [[objArrCopy[objectId].x, objArrCopy[objectId].y]];
			}
		}
		trajLen = trajLen * accuracity; // Trajectory calculation accuracity

		const savedNewObjId = newObjId;
		const deletedObjectsList = []; // Array of deleted objects
		// Make distances array
		const distances = [];
		for (let i = objArrCopy.length - 1; i--;){
			distances[i] = {D: Infinity, obj: {}};
		}
		let minDistance = Infinity; // Minimal distance during trajectory calculating

		// Calculate all trajectories
		for (let i = trajLen; i--;){
			// Calculate minimal distance
			for (let objectId = objArrCopy.length; objectId--;){
				const obj = objArrCopy[objectId];

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
			// Physics compute
			this.physics.physicsCalculate(
				false,
				+ui.interactMode.state,
				ui.timeSpeed.state,
				ui.g.state/accuracity
			);

			// Add velocity
			this.physics.addVelocity(ui.timeSpeed.state/accuracity);

			// CollisionHandler returns a list of objects that could be deleted (If not merge collision - returns empty array)
			const toDeleteObjectsList = this.physics.collisionHandler(+ui.collisionMode.state);

			// Change newObjId after delete some objects after collision
			newObjId = getIdAfterArrChange(toDeleteObjectsList, newObjId);

			// Delete objects after collide and return the deleted objects to the toDeleteObjectsList array (returns array only in collision mode '0')
			if (toDeleteObjectsList.length > 0) deletedObjectsList.push(...this.sceneClone.deleteObject(toDeleteObjectsList, false));

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