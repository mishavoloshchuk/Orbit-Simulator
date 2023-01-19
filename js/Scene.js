export default class Scene {
	mpos = []; // Move object position
	objArr = Array(); // Scene objects array
	collidedObjectsIdList = []; // Collisions list
	#workerThreads = []; // Threads workers
	objIdToOrbit = 0; // The ID of the object around which the new object will orbit

	constructor() {
		this.gpu = new GPU();
		// The distance between two points
		this.gpu.addFunction(dist);
		// Gravitation function
		this.gpu.addFunction(gravity_func);
		// Gipotenuse
		this.gpu.addFunction(function gipot(a,b){return Math.sqrt(a*a + b*b) });
		// Collision function
		this.gpu.addFunction(gpuCollision);

		// Compute function
		this.computeVelocities = this.gpu.createKernel(function(arr, len, interactMode, timeSpeed, g, gravitMode, collisionType) {
			const obj1Id = this.thread.x;
			const obj1Pos = [arr[obj1Id * this.constants.objLen], arr[obj1Id * this.constants.objLen + 1]];
			const obj1Vel = [0, 0];
			const obj1Mass = arr[obj1Id * this.constants.objLen + 2];
			const obj1Lock = arr[obj1Id * this.constants.objLen + 3];
			let collided = false;

			for(let obj2Id = 0; obj2Id < len; obj2Id++){
				if (obj2Id !== obj1Id) {
					const obj2Pos = [arr[obj2Id * this.constants.objLen], arr[obj2Id * this.constants.objLen + 1]];
					const obj2Mass = arr[obj2Id * this.constants.objLen + 2];

					const D = dist(obj1Pos[0],obj1Pos[1], obj2Pos[0],obj2Pos[1]);

					const radiusSum = Math.sqrt(Math.abs(obj1Mass)) + Math.sqrt(Math.abs(obj2Mass));
					if (D - radiusSum <= 0) {
						if (collided === false){
							collided = true;
						}
					} else {
						if (obj1Lock === 0){
							const sin = (obj2Pos[1] - obj1Pos[1])/D; // Sin
							const cos = (obj2Pos[0] - obj1Pos[0])/D; // Cos
							const velocity = gravity_func(sin, cos, D, gravitMode, obj2Mass, obj1Mass, timeSpeed, g);
							obj1Vel[0] += velocity[0];
							obj1Vel[1] += velocity[1];	
						}
					}

				}
			}

			return [obj1Vel[0], obj1Vel[1], collided];
		}, {dynamicOutput: true, dynamicArguments: true, constants: {objLen: 4}, tactic: 'precision'})
			.setLoopMaxIterations(10000000);

	}
	gpuComputeVelocities = function(
		objectsArray = this.objArr, 
		callback = this.gpuAfterPhysics,
		interactMode = +ui.interactMode.state, 
		timeSpeed = ui.timeSpeed.state, 
		g = ui.g.state, 
		gravitMode = +ui.gravitationMode.state, 
		collisionType = +ui.collisionMode.state
	){
		if (objectsArray.length > 1){
			const prepairedArr = objectsArray.map(obj => [obj.x, obj.y, obj.m, obj.lock]);
			this.computeVelocities.setOutput([objectsArray.length]);
			const newVelosities = this.computeVelocities(prepairedArr, objectsArray.length, interactMode, timeSpeed, g, gravitMode, collisionType);
			// After physics
			let collidedObjectsIDs = [];
			for (let obj1Id = objectsArray.length; obj1Id--;){
				if (newVelosities[obj1Id][2] === 1){ // if object collided
					collidedObjectsIDs.push(obj1Id);
				}
				objectsArray[obj1Id].vx += newVelosities[obj1Id][0];
				objectsArray[obj1Id].vy += newVelosities[obj1Id][1];
			}
			
			let collidedPairs = [];
			let deleteObjectList = []; // Array of objects will be deleted after collision "merge"
			for (let i = collidedObjectsIDs.length; i--;){
				const obj1Id = collidedObjectsIDs[i];
				const obj1 = objectsArray[obj1Id];
				for (let j = i; j--;){
					const obj2Id = collidedObjectsIDs[j];
					const obj2 = objectsArray[obj2Id];

					const D = dist(obj1.x,obj1.y, obj2.x,obj2.y);

					const radiusSum = Math.sqrt(Math.abs(obj1.m)) + Math.sqrt(Math.abs(obj2.m));
					if (D - radiusSum <= 0) {
						collidedPairs.push([obj1Id, obj2Id]);
					}
				}
			}
			for (let i = collidedPairs.length; i--;){
				const collidedPair = collidedPairs[i]
				deleteObjectList.push(...this.collision(objectsArray, collisionType, collidedPair[1], collidedPair[0]));
			}

			this.deleteObject(deleteObjectList, objectsArray); // Delete objects by deleteObjectsList

			this.addSelfVectors(objectsArray, timeSpeed);
		}
		callback && callback(objectsArray, this.collidedObjectsIdList, interactMode, collisionType, timeSpeed, 'singleThread');
		this.collidedObjectsIdList = [];

	}
	physicsCalculate = function (
		objectsArray = this.objArr, 
		callback = this.afterPhysics,
		interactMode = +ui.interactMode.state, 
		timeSpeed = ui.timeSpeed.state, 
		g = ui.g.state, 
		gravitMode = ui.gravitationMode.state, 
		collisionType = +ui.collisionMode.state
	){
		// console.log('Calculate begin:');
		for (let object1Id = objectsArray.length; object1Id--;){
			calculate({
				objectsArray: objectsArray,
				object1Id: +object1Id,
				interactMode: interactMode,
				gravitMode: +gravitMode,
				g: g,
				timeSpeed: timeSpeed,
				collisionType: collisionType,
				collidedObjectsIdList: this.collidedObjectsIdList
			});
		}
		callback && callback(objectsArray, this.collidedObjectsIdList, interactMode, collisionType, timeSpeed, 'singleThread');
		this.collidedObjectsIdList = [];
	}

	// Runs after finish computing physics
	afterPhysics = (objArr, collidedObjectsIdList, interactMode, collisionType, timeSpeed) => {
		// After physics
		// Set values after collisions
		let deleteObjectList = [];
		for (let collidedObjectsId of collidedObjectsIdList){ // collidedObjectsId max length is 2
			deleteObjectList.push(...this.collision(objArr, collisionType, ...collidedObjectsId));
		}

		this.deleteObject(deleteObjectList, objArr);

		this.addSelfVectors(objArr, timeSpeed);
	}
	// Collision handler
	collision(objArr, collisionType, obj1Id, obj2Id){
		let [objA, objB] = [ objArr[obj1Id], objArr[obj2Id] ];
		let deleteObjectList = [];

		if (collisionType === 0){ // Merge
			if (objB.m + objA.m === 0){ // Anigilate
				deleteObjectList.push(obj1Id, obj2Id);
				if ( [obj1Id, obj2Id].includes(+this.camera.Target) && objArr === this.objArr ) this.camera.setTarget();
				return deleteObjectList;
			}

			let mixedColor = this.mixColors(objA.color, objB.color, objA.m, objB.m);

			let obj = objB, delObj = objA;
			let objToDelId = obj1Id;
			let alivedObjId = obj2Id;

			// Swap objects if
			if ((delObj.m > obj.m && objA.lock === objB.lock) || (objA.lock !== objB.lock && objA.lock)) {
				obj = objA; delObj = objB;
				objToDelId = obj2Id;
				alivedObjId = obj1Id;
			}
			// Center of mass point
			const movKff = obj.lock !== delObj.lock ? 0 : delObj.m / (objA.m + objB.m);
			obj.x += (delObj.x - obj.x) * movKff;
			obj.y += (delObj.y - obj.y) * movKff;
			// New velocity
			obj.vx = (objA.m*objA.vx+objB.m*objB.vx)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения
			obj.vy = (objA.m*objA.vy+objB.m*objB.vy)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения

			obj.m = objA.m + objB.m; // Set new mass to obj
			obj.color = mixedColor;
			// Change camera target
			if (objToDelId === this.camera.Target && objArr === this.objArr) this.camera.setTarget(alivedObjId);
			// Add collided object to deleteObjectList
			deleteObjectList.push(objToDelId);
		} else if (collisionType === 1){ // Repulsion
			let D = dist(objA.x, objA.y, objB.x, objB.y); // The distance between objects
			let v1 = this.gipot(objA.vx, objA.vy); // Scallar velocity
			let v2 = this.gipot(objB.vx, objB.vy); // Scallar velocity
			let vcos1 = v1 == 0?0:objA.vx/v1; // cos vx 1
			let vsin1 = v1 == 0?0:objA.vy/v1; // sin vy 1
			let vcos2 = v2 == 0?0:objB.vx/v2; // cos vx 2
			let vsin2 = v2 == 0?0:objB.vy/v2; // sin vy 2
			let ag1 = Math.atan2(vsin1, vcos1);
			let ag2 = Math.atan2(vsin2, vcos2);

			let cos = (objB.x - objA.x)/D;
			let sin = (objB.y - objA.y)/D;
			let fi = Math.atan2(sin, cos);
			// Object A new velocity
			if (!objA.lock){
				const m1 = objB.lock ? 0 : objA.m;
				const m2 = objB.m;
				objA.vx = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.cos(fi) + v1*Math.sin(ag1 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				objA.vy = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.sin(fi) + v1*Math.sin(ag1 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
			}
			// Object B new velocity
			if (!objB.lock){
				const m1 = objA.m;
				const m2 = objA.lock ? 0 : objB.m;
				objB.vx = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				objB.vy = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
			}

			// Colliding
			const objARadius = Math.sqrt(Math.abs(objA.m)); // Object A radius
			const objBRadius = objA.m === objB.m ? objARadius : Math.sqrt(Math.abs(objB.m)); // Object B radius
			const rS = objARadius + objBRadius; // Both objects radiuses sum
			const mS = objA.m + objB.m; // Both objects mass sum
			let newD = dist(objA.x + objA.vx*ui.timeSpeed.state, objA.y + objA.vy*ui.timeSpeed.state, objB.x + objB.vx*ui.timeSpeed.state, objB.y + objB.vy*ui.timeSpeed.state); // The distance between objects with new position
			if (newD - rS <= 0){
				const rD = rS - D; // Total move
				const objAMov = objA.lock ? 0 : rD * (objA.m / mS); // Object A move
				const objBMov = objB.lock ? 0 : rD - objAMov; // Object B move
				objA.x -= objAMov * cos; objA.y -= objAMov * sin;
				objB.x += objBMov * cos; objB.y += objBMov * sin;
			}
		} else if (collisionType === 2){ // None

		}
		return deleteObjectList;
	}
	// Add objects vectors to objects
	addSelfVectors(objArr, timeSpeed){
		// Add the vectors
		for (let object of objArr){
			if (mov_obj !== objArr.indexOf(object)){
				// Add vectors
				if (object.lock){ // If object locked
					object.vx = 0;
					object.vy = 0;
				} else {// If object not locked
					object.x += object.vx*timeSpeed;
					object.y += object.vy*timeSpeed;
					if (objArr === this.objArr && (object.vx || object.vy)) this.activCam.allowFrameRender = true;
				}
			} else {
				object.vx = object.vy = 0;
			}
		}
	}
	//Создание нового объекта
	addNewObject({
		x,
		y,
		screenX,
		screenY,
		vx,
		vy,
		radius,
		mass,
		objLck = false,
		ob_col,
		main_obj,
		objArr = this.objArr,
		circularOrbit = false
	}){
		let svx = 0, svy = 0;
		let px = x, py = y;
		if (screenX){
			[px, py] = this.activCam.screenPix2(screenX, screenY);
		}
		let newObjId = objArr.length;

		if ( (dist(mouse.leftDownX, mouse.leftDownY, mouse.leftUpX, mouse.leftUpY) <= dis_zone || circularOrbit) && objArr[this.objIdToOrbit] && ui.newObjCircularOrbit.state && !objLck) {
			[svx, svy] = this.forceToCircularOrbit(px, py, this.objIdToOrbit);
			if (!objArr[this.objIdToOrbit].lock){
				svx += objArr[this.objIdToOrbit].vx;
				svy += objArr[this.objIdToOrbit].vy;
			}
			// Circular orbit correction
			px += vx === undefined ? svx/2*ui.timeSpeed.state : 0;
			py += vy === undefined ? svy/2*ui.timeSpeed.state : 0;
		} else {
			let [mcx, mcy] = mouse.ctrlModificatedMousePosition();
			if (!objLck){
				svx = ((mouse.leftDownX-mcx)/30) * this.powerFunc(ui.launchForce.state);
				svy = ((mouse.leftDownY-mcy)/30) * this.powerFunc(ui.launchForce.state);	
			}
		}
		// New object velocity
		svx = vx !== undefined? vx : svx;
		svy = vy !== undefined? vy : svy;
		// Add new objArr with parameters
		objArr[newObjId] = {
			x: px, // Position X
			y: py, // Position Y
			vx: svx, // Velocity X 
			vy: svy, // Velocity Y 
			m: mass, // Object mass
			color: ob_col, // Object color
			lock: objLck, // Object locked (boolean)
			trace: [], // Array of trace points (traces mode 2-3)
			main_obj: main_obj // Affects in interaction mode 1 (interact with only main objecgt)
		};
		this.show_obj_count();
		this.activCam.allowFrameRender = true;
		// If object created return its ID, else return false
		return objArr[newObjId] ? newObjId : false;
	}
	//Удаление объекта
	deleteObject(objects, objArr = this.objArr, eachObjectCallback = this.delObjectCallback.bind(this)){
		let objectsToDelete;
		if (Array.isArray(objects)){
			objectsToDelete = objects; // Given objects ID's to delete
		} else {
			objectsToDelete = [objects]; // If given not an array
		}
		let deletedObjectsList = [];
		for (let objectId of objectsToDelete){
			// Change main object in child objects before delete
			for (let obj of objArr){
				if (obj.main_obj == objectId){
					obj.main_obj = objArr[objectId].main_obj;
				}
			}
			deletedObjectsList = deletedObjectsList.concat(objArr.splice(objectId, 1));
			eachObjectCallback && eachObjectCallback(objectId);
		}
		return deletedObjectsList;
	}
	delObjectCallback(objectId){
		this.camera.Target = getIdAfterArrChange([objectId], this.camera.Target);
		if (this.camera.Target === null) this.camera.setTarget();
		this.objIdToOrbit = getIdAfterArrChange([objectId], this.objIdToOrbit, this.objectSelect('biggest'));
		mov_obj = getIdAfterArrChange([objectId], mov_obj);

		this.activCam.allowFrameRender = true;
		this.show_obj_count(); // Set objects counter indicator
	}
	// Show number of objects
	show_obj_count(){
		document.querySelector('#object_count_value').innerHTML = this.objArr.length;
	}
	//Необходимая скорость для круговой орбиты
	forceToCircularOrbit(px, py, obj1Id){
		if (this.objArr[obj1Id]){
			const objToOrbMass = Math.abs(this.objArr[obj1Id].m);
			let R = this.dist(this.camera.screenPix(px, 'x'), this.camera.screenPix(py, 'y'), this.camera.screenPix(this.objArr[obj1Id].x, 'x'), this.camera.screenPix(this.objArr[obj1Id].y, 'y'))*this.camera.animZoom;
			let V = Math.sqrt((objToOrbMass*5)*(R)/ui.g.state);
			let a = this.objArr[obj1Id].x - px;
			let b = this.objArr[obj1Id].y - py;
			let sin = b/R, cos = a/R;
			let svx = -(sin/V)*objToOrbMass*5;
			let svy = (cos/V)*objToOrbMass*5;
			//if (this.objArr[obj1Id].main_obj){
			//	let object = this.objArr[obj1Id].main_obj;
			//	while (this.objArr[object].main_obj){
			//		svx -= this.objArr[object].vx;
			//		svx -= this.objArr[object].vy;
			//		object = this.objArr[object].main_obj;
			//	}
			//}
			if (ui.newObjCreateReverseOrbit.state){
				svx = -svx;
				svy = -svy;
			}
			return [svx, svy];		
		} else {
			return [0, 0];
		}
	}
	//Выбор объекта по функции
	objectSelect(mode = 'nearest', not){
		let sel = [Infinity, null, 0];
		// Last object in array
		if (mode == 'last_created'){
			sel[1] = this.objArr.length - 1;
		}
		// The nearest or the furthest object
		if (mode == 'nearest' || mode == 'furthest'){
			for (let i in this.objArr){
				if (i == not) continue;
				let r = dist(mouse.x, mouse.y, this.camera.crd(this.objArr[i].x, 'x'), this.camera.crd(this.objArr[i].y, 'y'));
				if (r < sel[0] && mode == 'nearest'){
					sel[0] = r;
					sel[1] = +i;
				} else 
				if (r > sel[2] && mode == 'furthest'){
					sel[2] = r;
					sel[1] = +i;
				}
			}
		}
		// The most bigger object
		if (mode == 'biggest'){
			for(let i in this.objArr){
				if (this.objArr[i].m > sel[2]){
					sel[2] = this.objArr[i].m;
					sel[1] = +i;
				}
			}
		}
		return sel[1];
	}
	// Get distance between two 2d points
	dist(x1, y1, x2, y2){ return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)) }
	// Get logariphmic value if value bigger than 1
	powerFunc(F){
		if (F > 1){ return Math.round(Math.pow(F, Math.pow(F, 3))*100)/100 } else { return F }
	}
	// Pythagorean theorem
	gipot(a,b){return Math.sqrt(a*a + b*b) }
	// Get random range
	getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	//Cмешивение Цветов===================================
	toHexInt(i){
		return parseInt(i, 16);
	}
	_mixColors(color1, color2, m1, m2){

		let color = "";
		/*
		 * Сначала считаем среднее по красному цвету - xx---- + yy----
		 * Затем по зеленому --xx-- + --yy--
		 * И по синему ----xx + ----yy
		 */
		for(let i = 0; i < color1.length; i += 2){
		    let partColor = Math.round((this.toHexInt(color1.slice(i, i+2))*m1 + this.toHexInt(color2.slice(i, i+2))*m2)/(m1+m2)).toString(16);

		    color += (partColor.length === 1 ? "0" + partColor : partColor);
		}
		return color;
	}

	mixColors(color1, color2, m1 = 50, m2 = 50){
		let c1 = color1[0] === "#" ? color1.slice(1) : color1;
		let c2 = color2[0] === "#" ? color2.slice(1) : color2;

		return "#" + this._mixColors(c1, c2, m1, m2);
	}

	randomColor() {
		let r = Math.floor(this.getRandomArbitrary(40, 255)),
			g = Math.floor(this.getRandomArbitrary(40, 255)),
			b = Math.floor(this.getRandomArbitrary(40, 255));

		r = r.toString(16); g = g.toString(16); b = b.toString(16);

		r = r.length < 2 ? '0'+r.toString(16) : r.toString(16);
		g = g.length < 2 ? '0'+g.toString(16) : g.toString(16);
		b = b.length < 2 ? '0'+b.toString(16) : b.toString(16);
		let color = '#' + r + g + b;
		return color;
	}
}