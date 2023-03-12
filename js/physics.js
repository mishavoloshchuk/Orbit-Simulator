export default class Physics {
	collisionCeilSize = 31.6227766016*2; // Ceil collision algorithm ceil size
	constructor(scene) {
		// Set scene
		this.scene = scene;
	}
	// Init GPU.js
	initGPUjs(){
		this.gpu = new GPU();
		// The distance between two points
		this.gpu.addFunction(dist);
		// Gravitation function
		this.gpu.addFunction(gravity_func);
		// Gipotenuse
		this.gpu.addFunction(function gipot(a,b){return Math.sqrt(a*a + b*b) });
		// Compute function
		this.computeVelocities = this.gpu.createKernel(function(arr, len, timeSpeed, g, gravitMode) {
			const obj1Id = this.thread.x;
			const obj1Pos = [arr[obj1Id * this.constants.objLen], arr[obj1Id * this.constants.objLen + 1]];
			const obj1Vel = [0.0, 0.0];
			const obj1Mass = arr[obj1Id * this.constants.objLen + 2];
			const obj1Lock = arr[obj1Id * this.constants.objLen + 3];

			for(let obj2Id = 0; obj2Id < len; obj2Id++){
				if (obj2Id !== obj1Id) {
					const obj2Pos = [arr[obj2Id * this.constants.objLen], arr[obj2Id * this.constants.objLen + 1]];
					const obj2Mass = arr[obj2Id * this.constants.objLen + 2];

					const D = dist(obj1Pos[0],obj1Pos[1], obj2Pos[0],obj2Pos[1]);
					const sin = (obj2Pos[1] - obj1Pos[1])/D; // Sin
					const cos = (obj2Pos[0] - obj1Pos[0])/D; // Cos
					const velocity = gravity_func(sin, cos, D, gravitMode, obj2Mass, obj1Mass, timeSpeed, g);
					if (obj1Lock === 0){
						obj1Vel[0] += velocity[0];
						obj1Vel[1] += velocity[1];	
					}
				}
			}

			return [obj1Vel[0], obj1Vel[1]];
		}, {dynamicOutput: true, dynamicArguments: true, constants: {objLen: 4}})
			.setLoopMaxIterations(1000000);
	}
	gpuComputeVelocities = function(
		callback = this.afterPhysics,
		interactMode = +ui.interactMode.state, 
		timeSpeed = ui.timeSpeed.state, 
		g = ui.g.state, 
		gravitMode = +ui.gravitationMode.state, 
		collisionType = +ui.collisionMode.state
	){
		// Init GPU if not
		this.gpu || this.initGPUjs();

		const objArr = this.scene.objArr; // Objects array
		if (objArr.length > 1){
			// Merge collision
			ui.collisionMode.state == '0' && this.mergeCollision();
			// Bounce collision preprocessing
			ui.collisionMode.state == '1' && this.pullOutFromEachOther();

			const prepairedArr = objArr.map(obj => [obj.x, obj.y, obj.m, obj.lock]);
			this.computeVelocities.setOutput([objArr.length]);
			const newVelosities = this.computeVelocities(prepairedArr, objArr.length, timeSpeed, g, gravitMode);
			// After physics
			let collidedObjectsIDs = [];
			for (let obj1Id = objArr.length; obj1Id--;){
				const obj1 = objArr[obj1Id];
				obj1.vx += newVelosities[obj1Id][0];
				obj1.vy += newVelosities[obj1Id][1];
			}
		}
		callback && callback(interactMode, collisionType, timeSpeed);
	}
	physicsCalculate = function (
		callback = this.afterPhysics,
		interactMode = +ui.interactMode.state, 
		timeSpeed = ui.timeSpeed.state, 
		g = ui.g.state, 
		gravitMode = +ui.gravitationMode.state, 
		collisionType = +ui.collisionMode.state
	){
		const objArr = this.scene.objArr;
		// console.log('Calculate begin:');

		// Console log global velocity (only if all objects in scene have the same mass)
		// console.log(objArr.reduce((vel2, obj) => [vel2[0] + obj.vx, vel2[1] + obj.vy], [0, 0]));

		// Merge collision
		ui.collisionMode.state == '0' && this.mergeCollision();
		// Bounce collision preprocessing
		ui.collisionMode.state == '1' && this.pullOutFromEachOther();

		// Physics calculating
		for (let object1Id = objArr.length; object1Id--;){
			calculate({
				objectsArray: objArr,
				object1Id: object1Id,
				interactMode: interactMode,
				gravitMode: gravitMode,
				g: g,
				timeSpeed: timeSpeed
			});
		}
		callback && callback(interactMode, collisionType, timeSpeed);
	}

	// Runs after finish computing physics
	afterPhysics = (interactMode, collisionType, timeSpeed) => {
		// After physics
		// Add velocities
		this.addVelocity(timeSpeed);

		// Bounce collision
		ui.collisionMode.state == '1' && this.bounceCollision();
	}

	makeObjPosMatrix(objArr = this.scene.objArr){
		const positionMatrix = {};
		const seilSize = this.collisionCeilSize;
		for (let objId = objArr.length; objId --;){
			let obj = objArr[objId];
			const posX = Math.floor(obj.x / seilSize);
			const posY = Math.floor(obj.y / seilSize);
			const strPos = posX.toString() + '|' + posY.toString();

			if (positionMatrix[strPos] === undefined) positionMatrix[strPos] = [];
			positionMatrix[strPos].push(objId);
		}
		return positionMatrix;
	}

	collisionCeilAlgorithm(){
		const objArr = this.scene.objArr;
		const collidedPairs = [];
		let posMatrix = this.makeObjPosMatrix();
		for (let cellPos in posMatrix){
			let [x, y] = cellPos.split("|");
			x = +x; y = +y; // To number
			const iterObjs = posMatrix[cellPos]; // Objects inside current ceil
			const enumObjs = []; // Objects inside neighborhood ceils

			const cl1 = (x + 1) + "|" + y; // Right ceil
			const cl2 = x + "|" + (y + 1); // Bottom ceil
			const cl3 = (x + 1) + "|" + (y + 1); // Right bottom ceil
			const cl4 = (x - 1) + "|" + (y + 1); // Left bottom ceil

			if (posMatrix[cl1]) enumObjs.push(...posMatrix[cl1]); // ░░░░░░
			if (posMatrix[cl2]) enumObjs.push(...posMatrix[cl2]); // ░░██▓▓
			if (posMatrix[cl3]) enumObjs.push(...posMatrix[cl3]); // ▓▓▓▓▓▓ 
			if (posMatrix[cl4]) enumObjs.push(...posMatrix[cl4]);

			// Iterate ceil for collision
			for (let i = iterObjs.length; i--;){
				const obj1Id = iterObjs[i];
				const obj1 = objArr[obj1Id];
				// Iterate neighborhood ceils
				for (let j = enumObjs.length; j--;){
					const obj2Id = enumObjs[j];
					checkCollision(obj1Id, obj2Id);
				}
				// Iterate current ceil
				for (let j = i; j--;){
					const obj2Id = iterObjs[j];
					checkCollision(obj1Id, obj2Id);
				}
			}
		}
		// Check collision function
		function checkCollision(obj1Id, obj2Id){
			const obj1 = objArr[obj1Id];
			const obj2 = objArr[obj2Id];
			if (!(obj2.lock === true && obj1.lock === true)) {
				// Collision
				const radiusSum = obj1.r + obj2.r;

				if (Math.abs(obj1.x - obj2.x) <= radiusSum && Math.abs(obj1.y - obj2.y) <= radiusSum){
					const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
					if (D - radiusSum <= 0){
						collidedPairs.push([obj1Id, obj2Id]);
					}
				}
			}
		}
		return collidedPairs;
	}

	pullOutFromEachOther(){
		const objArr = this.scene.objArr;
		if (ui.collisionMode.state == 1 && ui.interactMode.state == 0){
			for (let i = 1; i--;){
				const collidedPairs = this.collisionCeilAlgorithm();
				for (let collidedPair of collidedPairs){
					const [object1Id, object2Id] = collidedPair;
					const obj1 = objArr[object1Id];
					const obj2 = objArr[object2Id];

					if (obj2.lock === true && obj1.lock === true) continue;

					// Collision
					const radiusSum = obj1.r + obj2.r;

					if (Math.abs(obj1.x - obj2.x) <= radiusSum && Math.abs(obj1.y - obj2.y) <= radiusSum){
						const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
						if (D - radiusSum <= 0){
							let sin, cos;
							if (D > 0){ // Angle between objects
								cos = (obj2.x - obj1.x)/D;
								sin = (obj2.y - obj1.y)/D;
							} else { // Random angle
								const randAngleRadians = Math.random() * Math.PI * 2;
								cos = Math.cos(randAngleRadians);
								sin = Math.sin(randAngleRadians);
							}
							// Colliding
							const mS = obj1.m + obj2.m; // Both objects mass sum
							const rD = radiusSum - D; // Total move
							const objAMov = obj1.lock ? 0 : obj2.lock ? rD : rD * (obj2.m / mS); // Object A move
							const objBMov = obj2.lock ? 0 : rD - objAMov; // Object B move
							obj1.x -= objAMov * cos; obj1.y -= objAMov * sin;
							obj2.x += objBMov * cos; obj2.y += objBMov * sin;
						}
					}	
				}
			}
		}
	}

	mergeCollision(){
		const objArr = this.scene.objArr;
		let deleteObjectList = [];

		const collidedPairs = this.collisionCeilAlgorithm();
		for (let collidedPair of collidedPairs){
			let [obj1Id, obj2Id] = collidedPair;
			let [objA, objB] = [ objArr[obj1Id], objArr[obj2Id] ];
			if (deleteObjectList.includes(obj1Id) || deleteObjectList.includes(obj2Id))continue;
			if (objB.m + objA.m === 0){ // Anigilate
				deleteObjectList.push(obj1Id, obj2Id);
				if ( [obj1Id, obj2Id].includes(+camera.Target) && objArr === this.objArr ) camera.setTarget();
				continue;
			}

			let mixedColor = this.scene.mixColors(objA.color, objB.color, objA.m, objB.m);

			let obj = objB, delObj = objA;
			let objToDelId = obj1Id;
			let alivedObjId = obj2Id;

			// Swap objects if
			if ((delObj.m > obj.m && objA.lock === objB.lock)
				|| (objA.lock !== objB.lock && objA.lock)
				|| obj1Id < obj2Id
			) {
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
			obj.r = Math.sqrt(Math.abs(obj.m));
			obj.color = mixedColor;

			// Change camera target
			if (objArr === scene.objArr && objToDelId === camera.Target) camera.setTarget(alivedObjId);

			// Add obj to delete arreay
			deleteObjectList.push(objToDelId);
		}
		const deletedObjsArr = this.scene.deleteObject(deleteObjectList);
		return {
			idArr: deleteObjectList,
			objArr: deletedObjsArr
		}		
	}

	bounceCollision(){
		const objArr = this.scene.objArr;
		const collidedPairs = this.collisionCeilAlgorithm();
		for (let collidedPair of collidedPairs) {
			const [obj1Id, obj2Id] = collidedPair;
			let [objA, objB] = [ objArr[obj1Id], objArr[obj2Id] ];

			let D = dist(objA.x, objA.y, objB.x, objB.y); // The distance between objects
			let sin, cos;
			if (D > 0){ // Angle between objects
				cos = (objB.x - objA.x)/D;
				sin = (objB.y - objA.y)/D;
			} else { // Random angle
				const randAngleRadians = Math.random() * Math.PI * 2;
				cos = Math.cos(randAngleRadians);
				sin = Math.sin(randAngleRadians);
			}
			const radiusSum = objA.r + objB.r;

			let v1 = this.gipot(objA.vx, objA.vy); // Scallar velocity
			let v2 = this.gipot(objB.vx, objB.vy); // Scallar velocity
			let vcos1 = v1 == 0?0:objA.vx/v1; // cos vx 1
			let vsin1 = v1 == 0?0:objA.vy/v1; // sin vy 1
			let vcos2 = v2 == 0?0:objB.vx/v2; // cos vx 2
			let vsin2 = v2 == 0?0:objB.vy/v2; // sin vy 2
			let ag1 = Math.atan2(vsin1, vcos1);
			let ag2 = Math.atan2(vsin2, vcos2);

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

			objA.collided = objB.collided = true;
		}
		// Add new velocity
		for (let objId = objArr.length; objId--;){
			let objA = objArr[objId];
			if (objA.collided){
				if (objA.lock){ // If object locked
					objA.vx = 0;
					objA.vy = 0;
				} else {// If object not locked
					objA.x += objA.vx*ui.timeSpeed.state;
					objA.y += objA.vy*ui.timeSpeed.state;
				}
				delete objA.collided;			
			}
		}
	}
	// Add objects vectors to objects
	addVelocity(timeSpeed){
		const objArr = this.scene.objArr;
		// Add the vectors
		for (let objId = objArr.length; objId--;){
			let object = objArr[objId];
			// let can = this.activCam.ctx3;
			// can.beginPath();
			// can.fillStyle = object.color;
			// can.arc(...this.activCam.crd2(object.x, object.y), 2, 0, 7);
			// can.fill();	
			if (mov_obj !== objId){
				// Add vectors
				if (object.lock){ // If object locked
					object.vx = 0;
					object.vy = 0;
				} else {// If object not locked
					object.x += object.vx*timeSpeed;
					object.y += object.vy*timeSpeed;
					// Allow frame render if object moves
					if (object.vx || object.vy) renderer.allowFrameRender = true;
				}
			} else {
				object.vx = object.vy = 0;
			}
		}
	}
	// Pythagorean theorem
	gipot(a,b){return Math.sqrt(a*a + b*b) }
}