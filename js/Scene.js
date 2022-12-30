export default class Scene {
	mouse_coords = [false, false]; // Used for accuracity mode when object creating (Press CTRL while creating object)
	mpos = []; // Move object position
	objArr = Array(); // Scene objects array
	collidedObjectsIdList = []; // Collisions list
	#workerThreads = []; // Threads workers
	objIdToOrbit = 0; // The ID of the object around which the new object will orbit

	constructor() {
		this.dis_zone = 5;
		this.simulationsPerFrame = 1;

		//Worker 
		if (window.Worker){
			this.logicalProcessors = window.navigator.hardwareConcurrency > 1 ?window.navigator.hardwareConcurrency - 1 : 1;
			// this.logicalProcessors = 1;
			//alert('CPU Threads count: ' + (this.logicalProcessors+1));
			this.workersJobDone = 0; // Thread job done
			// Create worker for almost (workerThreads - 1) each local CPU thread
			for (let i = this.logicalProcessors; i--;) {
				this.#workerThreads[i] = new Worker('js/worker.js');
			}

			this.workersTime = 0;
			// Multithread physics calculations
			this.physicsMultiThreadCalculate = (
				objectsArray = this.objArr, 
				callback = this.afterPhysics,
				interactMode = this.interactMode.state, 
				timeSpeed = this.timeSpeed.state, 
				g = this.g.state, 
				gravitMode = this.gravitationMode.state, 
				collisionType = this.collisionMode.state
			)=>{
				if (!this.workersJobDone){
					let tasks = []; //new Array(this.logicalProcessors).fill(new Array()); // Distribute tasks by workers
					for (let i = 0; i < this.logicalProcessors && i < objectsArray.length; i++){ tasks[i] = [] }
					let compressedObjArr = [];
					for (let i in objectsArray){
						tasks[i%this.logicalProcessors].push(+i); // Make tasks for all worker threads
						compressedObjArr[i] = {};
						compressedObjArr[i].x = objectsArray[i].x;
						compressedObjArr[i].y = objectsArray[i].y;
						//compressedObjArr[i].vx = objectsArray[i].vx;
						//compressedObjArr[i].vy = objectsArray[i].vy;
						compressedObjArr[i].m = objectsArray[i].m;
						if (objectsArray[i].lock === true) { compressedObjArr[i].lock = true }; // If ojbect locked
						if (objectsArray[i].main_obj !== undefined) { compressedObjArr[i].main_obj = objectsArray[i].main_obj }; // If ojbect locked
					}
					compressedObjArr = JSON.stringify(compressedObjArr);
					this.workersJobDone = tasks.length;
					for (let i in tasks){
						this.#workerThreads[i].performance = performance.now();
						this.#workerThreads[i].postMessage({
							task: tasks[i], 
							objArr: compressedObjArr, 
							interactMode: interactMode, 
							timeSpeed: timeSpeed, 
							g: g, 
							gravitMode: +gravitMode, 
							collisionType: collisionType
						});

						// On worker message
						this.#workerThreads[i].onmessage = (e) => {
							//console.log(i, performance.now() - this.#workerThreads[i].lastPerformance);
							this.#workerThreads[i].performance = performance.now() - this.#workerThreads[i].performance;
							this.workersTime += this.#workerThreads[i].performance;
							this.workersJobDone --;
							this.collidedObjectsIdList.push(...e.data.collidedObjectsIdList);
							for (let i of e.data.task){
								e.data.objArr[i].vx += objectsArray[i].vx;
								e.data.objArr[i].vy += objectsArray[i].vy;
								objectsArray[i] = Object.assign(objectsArray[i], e.data.objArr[i]);
							}
							if (!this.workersJobDone){
								this.frameCounter ++;
								callback && callback(objectsArray, this.collidedObjectsIdList, interactMode, collisionType, timeSpeed, 'multiThread');
								if (allowCompute){
									allowCompute = false;
									this.frame();
								}
								this.collidedObjectsIdList = [];
								if (this.simulationsPerFrame - 1 > 0){
									this.simulationsPerFrame --;
									this.physicsMultiThreadCalculate(this.objArr, this.afterPhysics,this.interactMode.state, this.timeSpeed.state, this.g.state, this.gravitationMode.state, this.collisionMode.state);
								}
							}
						}
					}
				}
			}
		}
	}
	physicsCalculate = function (
		objectsArray = this.objArr, 
		callback = this.afterPhysics,
		interactMode = this.interactMode.state, 
		timeSpeed = this.timeSpeed.state, 
		g = this.g.state, 
		gravitMode = this.gravitationMode.state, 
		collisionType = this.collisionMode.state
	){
		let iterObjArr = objectsArray.length;
		for (let objectId = iterObjArr; objectId--;){
			iterObjArr --;
			calculate({
				objectsArray: objectsArray,
				objectId: +objectId,
				interactMode: interactMode,
				gravitMode: +gravitMode,
				g: g,
				timeSpeed: timeSpeed,
				collisionType: collisionType,
				collidedObjectsIdList: this.collidedObjectsIdList,
				toIteration: iterObjArr
			});
		}
		callback && callback(objectsArray, this.collidedObjectsIdList, interactMode, collisionType, timeSpeed, 'singleThread');
		this.collidedObjectsIdList = [];
	}
	// Runs after finish computing physics
	afterPhysics = (objArr, collidedObjectsIdList, interactMode, collisionType, timeSpeed, func) => {
		// After physics
		// Set values after collisions
		let deleteObjectList = this.collision(objArr, collidedObjectsIdList, interactMode, collisionType);
		this.deleteObject(deleteObjectList, objArr);

		this.addSelfVectors(objArr, timeSpeed);
		// if (0&&(simulationDone > 1)){
		// 	simulationDone --;
		// 	if (func === 'multiThread'){
		// 		this.physicsMultiThreadCalculate();
		// 	} else if (func === 'singleThread') {
		// 		this.physicsCalculate();
		// 	}
		// }
	}
	// Collision handler
	collision(objArr, collidedObjectsIdList, interactMode, collisionType){
		let deleteObjectList = [];
		for (let collidedObjectsId of collidedObjectsIdList){
			let [objA, objB] = [ objArr[collidedObjectsId[0]], objArr[collidedObjectsId[1]] ];

			if (collisionType == 0){ // Merge
				if (objB.m > 0){
					objA.color = this.mixColors(objA.color, objB.color, objA.m, objB.m);
				} else {
					if (objB.m + objA.m == 0){
						deleteObjectList.push(...collidedObjectsId);
						if ( collidedObjectsId.includes(+this.camera.Target) && objArr === this.objArr ) this.camera.setTarget();
						continue;
					}
				}
				if (!objA.lock){
					objA.vx = (objA.m*objA.vx+objB.m*objB.vx)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения
					objA.vy = (objA.m*objA.vy+objB.m*objB.vy)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения
				}

				objA.m = objA.m + objB.m; // Set new mass to objA
				// Change camera target
				if (collidedObjectsId[1] == this.camera.Target && objArr === this.objArr) this.camera.setTarget(collidedObjectsId[0]);
				// Add collided object to deleteObjectList
				deleteObjectList.push(collidedObjectsId[1]);
			} else if (collisionType == 1){ // Repulsion
				// let R = collidedObjectsId[2]; // The distance between objects
				let gvx = objA.vx + objB.vx;
				let gvy = objA.vy + objB.vy;
				let D = rad(objA.x, objA.y, objB.x, objB.y); // The distance between objects
				let v1 = this.gipot(objB.vx, objB.vy); // Scallar velocity
				let v2 = this.gipot(objA.vx, objA.vy); // Scallar velocity
				let vcos1 = v1 == 0?0:objB.vx/v1; // cos vx 1
				let vsin1 = v1 == 0?0:objB.vy/v1; // sin vy 1
				let vcos2 = v2 == 0?0:objA.vx/v2; // cos vx 2
				let vsin2 = v2 == 0?0:objA.vy/v2; // sin vy 2
				let ag1 = Math.atan2(vsin1, vcos1);
				let ag2 = Math.atan2(vsin2, vcos2);

				let cos = (objA.x - objB.x)/D;
				let sin = (objA.y - objB.y)/D;
				let fi = Math.atan2(sin, cos);

				let m1 = objB.m;
				let m2 = objA.m;
				// Object A new velocity
				if (!objA.lock){
					if (objB.lock) { m2 = 0; }
					objA.vx = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
					objA.vy = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				}
				// Object B new velocity
				if (!objB.lock){
					if (objA.lock) { m1 = 0; }
					objB.vx = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.cos(fi) + v1*Math.sin(ag1 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
					objB.vy = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.sin(fi) + v1*Math.sin(ag1 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				}
				const objARadius = Math.sqrt(Math.abs(objA.m)); // Object A radius
				const objBRadius = objA.m === objB.m ? objARadius : Math.sqrt(Math.abs(objB.m)); // Object B radius
				const rS = objARadius + objBRadius; // Both objects radiuses sum
				const mS = objA.m + objB.m; // Both objects mass sum
				let newD = rad(objA.x + objA.vx*this.timeSpeed.state, objA.y + objA.vy*this.timeSpeed.state, objB.x + objB.vx*this.timeSpeed.state, objB.y + objB.vy*this.timeSpeed.state); // The distance between objects with new position
				if (newD - rS <= 0){
					const rD = rS - D; // Total move
					const objAMov = objA.lock ? 0 : rD * (objB.m / mS); // Object A move
					const objBMov = rD - objAMov; // Object B move
					objA.x += objAMov * cos; objA.y += objAMov * sin;
					objB.x -= objBMov * cos; objB.y -= objBMov * sin;
				}
			} else if (collisionType == 2){ // None

			}
		}
		return deleteObjectList;
	}
	// Add objects vectors to objects
	addSelfVectors(objArr, timeSpeed){
		// Add the vectors
		for (let object of objArr){
			if (mov_obj != objArr.indexOf(object)){
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
		vx,
		vy,
		radius,
		mass,
		objLck = false,
		ob_col = '#ffffff',
		main_obj,
		objArr = this.objArr
	}){
		let svx = 0, svy = 0;
		let px = mouse.leftDownX, py = mouse.leftDownY;
		let newObjId = objArr.length;
		if (x === undefined && y === undefined){
			let mcx = this.mouse_coords[0] ? this.mouse_coords[0] - (this.mouse_coords[0] - mouse.leftUpX)/10 : mouse.leftUpX;
			let mcy = this.mouse_coords[1] ? this.mouse_coords[1] - (this.mouse_coords[1] - mouse.leftUpY)/10 : mouse.leftUpY;
			if (!objLck){
				svx = ((mouse.leftDownX-mcx)/30) * this.powerFunc(this.launchForce.state);
				svy = ((mouse.leftDownY-mcy)/30) * this.powerFunc(this.launchForce.state);	
			}
		} else {px = x; py = y;};

		if (((Math.abs(mouse.leftDownX-mouse.leftUpX) <= dis_zone && Math.abs(mouse.leftDownY-mouse.leftUpY) <= dis_zone) || (x && y)) && objArr[this.objIdToOrbit] && this.newObjCircularOrbit.state && !objLck) {
			let vel = this.forceToCircularOrbit(this.activCam.screenPix(px, 'x'), this.activCam.screenPix(py, 'y'), this.objIdToOrbit);
			svx = vel[0];
			svy = vel[1];
			if (!objArr[this.objIdToOrbit].lock){
				svx += objArr[this.objIdToOrbit].vx;
				svy += objArr[this.objIdToOrbit].vy;
			}
		}
		// New object velocity
		svx = vx !== undefined? vx : svx;
		svy = vy !== undefined? vy : svy;
		// Circular orbit correction
		px += vx === undefined ? svx/2*this.timeSpeed.state : 0;
		py += vy === undefined ? svy/2*this.timeSpeed.state : 0;
		// Add new objArr with parameters
		objArr[newObjId] = {
			x: this.activCam.screenPix(px, 'x'), // Position X
			y: this.activCam.screenPix(py, 'y'), // Position Y
			vx: svx, // Velocity X equals vx if given and svx if not
			vy: svy, // Velocity Y equals vy if given and svy if not
			m: mass, // Object mass via given radius || Radius
			color: ob_col,
			lock: objLck,
			trace: [],
			main_obj: main_obj
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
	forceToCircularOrbit(px, py, objId){
		if (this.objArr[objId]){
			const objToOrbMass = Math.abs(this.objArr[objId].m);
			let R = this.rad(this.camera.screenPix(px, 'x'), this.camera.screenPix(py, 'y'), this.camera.screenPix(this.objArr[objId].x, 'x'), this.camera.screenPix(this.objArr[objId].y, 'y'))*this.camera.animZoom;
			let V = Math.sqrt((objToOrbMass*5)*(R)/this.g.state);
			let a = this.objArr[objId].x - px;
			let b = this.objArr[objId].y - py;
			let sin = b/R, cos = a/R;
			let svx = -(sin/V)*objToOrbMass*5;
			let svy = (cos/V)*objToOrbMass*5;
			//if (this.objArr[objId].main_obj){
			//	let object = this.objArr[objId].main_obj;
			//	while (this.objArr[object].main_obj){
			//		svx -= this.objArr[object].vx;
			//		svx -= this.objArr[object].vy;
			//		object = this.objArr[object].main_obj;
			//	}
			//}
			if (this.newObjCreateReverseOrbit.state){
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
				let r = rad(mouse.x, mouse.y, this.camera.crd(this.objArr[i].x, 'x'), this.camera.crd(this.objArr[i].y, 'y'));
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
	rad(x1, y1, x2, y2){ return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)) }
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