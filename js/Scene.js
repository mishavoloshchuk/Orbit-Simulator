import UserInput from '/js/UserInput.js';
export default class Scene {
	mouse_coords = [false, false]; // used for accuracity mode when object creating (Press CTRL while creating object)
	mpos = [];

	fps_count = 0;
	fps_interval = 0;

	#workerThreads = []; // Threads workers

	objIdToOrbit = 0;

	constructor() {
		this.objArr = Array();

		this.dis_zone = 5;
		this.frameCounter = 0;

		this.collidedObjectsIdList = []; // Collisions list

		setInterval(()=>{
			if (this.showFPS.state){
				console.log('Physics FPS: ' + this.frameCounter);
			}
			this.frameCounter = 0;
		}, 1000);

		//Worker 
		this.logicalProcessors = window.navigator.hardwareConcurrency > 1 ?window.navigator.hardwareConcurrency - 1 : 1;
		// this.logicalProcessors = 1;
		//alert('CPU Threads count: ' + (this.logicalProcessors+1));

		if (window.Worker){
			this.workersJobDone = new Array(this.logicalProcessors).fill(true); // Thread job done
			// Create worker for almost (workerThreads - 1) each local CPU thread
			for (let i = this.logicalProcessors; i--;) {
				this.#workerThreads[i] = new Worker('js/worker.js');
			}

			this.physicsCalculate = (objectsArray = this.objArr)=>{
				if (this.workersJobDone.every(e => e == true)){
					let tasks = []; //new Array(this.logicalProcessors).fill(new Array()); // Distribute tasks by workers
					for (let i = this.logicalProcessors; i--;){ tasks[i] = [] }
					//let this.objArr = JSON.parse(JSON.stringify(objectsArray));
					for(let i in objectsArray){ 
						if (i == mov_obj) continue;
						tasks[i%this.logicalProcessors].push(+i); } // Make tasks for all worker threads
					let compressedObjArr = [];
					for (let i in this.objArr){
						compressedObjArr[i] = {};
						compressedObjArr[i].x = this.objArr[i].x;
						compressedObjArr[i].y = this.objArr[i].y;
						//compressedObjArr[i].vx = this.objArr[i].vx;
						//compressedObjArr[i].vy = this.objArr[i].vy;
						compressedObjArr[i].m = this.objArr[i].m;
						if (this.objArr[i].lck) { compressedObjArr[i].lck = this.objArr[i].lck }; // If ojbect locked
						if (this.objArr[i].main_obj !== undefined) { compressedObjArr[i].main_obj = this.objArr[i].main_obj }; // If ojbect locked
					}
					//compressedObjArr = JSON.stringify(compressedObjArr);
					for (let i in this.#workerThreads){
						this.workersJobDone[i] = false;
						this.#workerThreads[i].lastPerformance = performance.now();
						this.#workerThreads[i].postMessage( {threadID: i, task: tasks[i], objArr: compressedObjArr, interactMode: this.interactMode.state, timeSpeed: this.timeSpeed.state, g: this.g.state, gravitMode: +this.gravitationMode.state, collisionType: this.collisionMode.state} );

						// On worker message
						this.#workerThreads[i].onmessage = (e) => {
							//console.log(i, performance.now() - this.#workerThreads[i].lastPerformance);
							//this.#workerThreads[i].performance = performance.now() - this.#workerThreads[i].performance;
							this.workersJobDone[e.data.threadID] = true;
							this.collidedObjectsIdList.push(...e.data.collidedObjectsIdList);
							for (let i of e.data.task){
								e.data.objArr[i].vx += objectsArray[i].vx;
								e.data.objArr[i].vy += objectsArray[i].vy;
								objectsArray[i] = Object.assign(objectsArray[i], e.data.objArr[i]);
							}
							if (this.workersJobDone.every(thr => thr === true)){
								this.frameCounter ++;
								this.afterPhysics(objectsArray, this.collidedObjectsIdList);
								// this.frame();
							}
						}
					}
				}
			}
		} else {
			this.physicsCalculate = function (objArray = this.objArr){
				for (let objectId in objArray){
					calculate({
						objectsArray: objArray,
						objectId: objectId,
						interactMode: this.interactMode.state,
						gravitMode: this.gravitationMode.state,
						g: this.g.state,
						timeSpeed: this.timeSpeed.state,
						collisionType: this.collisionMode.state,
						collidedObjectsIdList: this.collidedObjectsIdList
					});
				}
				this.afterPhysics(objArray, this.collidedObjectsIdList);
			}
		}
	}
	afterPhysics(objArr, collidedObjectsIdList){
		// After physics
		// Set values after collisions
		let deleteObjectList = [];
		for (let collidedObjectsId of collidedObjectsIdList){
			let [objA, objB] = [ this.objArr[collidedObjectsId[0]], this.objArr[collidedObjectsId[1]] ];

			if (this.collisionMode.state == 0){ // Merge
				if (objB.m > 0){
					objA.color = this.mixColors(objA.color, objB.color, objA.m, objB.m);
				} else {
					if (objB.m + objA.m == 0){
						deleteObjectList.push(...collidedObjectsId);
						continue;
					}
				}
				if (!objA.lck){
					objA.vx = (objA.m*objA.vx+objB.m*objB.vx)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения
					objA.vy = (objA.m*objA.vy+objB.m*objB.vy)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения
				}

				objA.m = objA.m + objB.m; // Set new mass to objA

				deleteObjectList.push(collidedObjectsId[1]);
			} else if (this.collisionMode.state == 1){ // Repulsion
				let R = collidedObjectsId[2]; // The distance between objects
				// let R = rad(objA.x, objA.y, objB.x, objB.y); // The distance between objects
				let v1 = this.gipot(objB.vx, objB.vy); // Scallar velocity
				let v2 = this.gipot(objA.vx, objA.vy); // Scallar velocity
				let vcos1 = v1 == 0?0:objB.vx/v1; // cos vx 1
				let vsin1 = v1 == 0?0:objB.vy/v1; // sin vy 1
				let vcos2 = v2 == 0?0:objA.vx/v2; // cos vx 2
				let vsin2 = v2 == 0?0:objA.vy/v2; // sin vy 2
				let ag1 = Math.atan2(vsin1, vcos1);
				let ag2 = Math.atan2(vsin2, vcos2);

				let cos = (objA.x - objB.x)/R;
				let sin = (objA.y - objB.y)/R;
				let fi = Math.atan2(sin, cos);

				let m1 = objB.m;
				let m2 = objA.m;

				if (!objB.lck && this.interactMode.state != 1){
					if (!objA.lck){
						objA.vx = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
						objA.vy = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
					}
				} else {
						objA.vx = (( v2*Math.cos(ag2 - fi)*(-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
						objA.vy = (( v2*Math.cos(ag2 - fi)*(-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				}		
			} else if (this.collisionMode.state == 2){ // None

			}
		}
		this.deleteObject(...deleteObjectList);
		// End collision

		// Add the vectors
		for (let object of objArr){
			// Add vectors
			if (object.lck){ // If object locked
				object.vx = 0;
				object.vy = 0;
			} else {// If object not locked
				object.x += object.vx*this.timeSpeed.state;
				object.y += object.vy*this.timeSpeed.state;
			}
		}
		this.collidedObjectsIdList = [];
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
	}){
		let svx = 0, svy = 0;
		let px = mouse.leftDownX, py = mouse.leftDownY;
		let newObjId = this.objArr.length;
		if (x === undefined && y === undefined){
			let mcx = this.mouse_coords[0] ? this.mouse_coords[0] - (this.mouse_coords[0] - mouse.leftUpX)/10 : mouse.leftUpX;
			let mcy = this.mouse_coords[1] ? this.mouse_coords[1] - (this.mouse_coords[1] - mouse.leftUpY)/10 : mouse.leftUpY;
			if (!objLck){
				svx = ((mouse.leftDownX-mcx)/30) * this.powerFunc(this.launchForce.state);
				svy = ((mouse.leftDownY-mcy)/30) * this.powerFunc(this.launchForce.state);	
			}
		} else {px = x; py = y;};

		if (((Math.abs(mouse.leftDownX-mouse.leftUpX) <= dis_zone && Math.abs(mouse.leftDownY-mouse.leftUpY) <= dis_zone) || (x && y)) && this.objArr[this.objIdToOrbit] && this.newObjCircularOrbit.state && !objLck) {
			let vel = this.forceToCircularOrbit(scene.activCam.screenPix(px, 'x'), scene.activCam.screenPix(py, 'y'), this.objIdToOrbit);
			svx = vel[0];
			svy = vel[1];
			if (!this.objArr[this.objIdToOrbit].lck){
				svx += this.objArr[this.objIdToOrbit].vx;
				svy += this.objArr[this.objIdToOrbit].vy;
			}
		}
		// Add new object to objArr with parameters
		this.objArr[newObjId] = {
			x: this.activCam.screenPix(px, 'x'), // Position X
			y: this.activCam.screenPix(py, 'y'), // Position Y
			vx: (vx !== undefined? vx : svx), // Velocity X equals vx if given and svx if not
			vy: (vy !== undefined? vy : svy), // Velocity Y equals vy if given and svy if not
			m: mass, // Object mass via given radius || Radius
			color: ob_col,
			lck: objLck,
			trace: [],
			main_obj: this.objIdToOrbit
		};
		this.show_obj_count();

		return this.objArr[newObjId] ? true : false;
	}
	//Удаление объекта
	deleteObject(){
		let objectsToDelete = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)).sort( (a,b)=>b-a ); // Given objects ID's to delete, sorted
		for (let objectId of objectsToDelete){
			// Change main object in child objects before delete
			for (let obj of this.objArr){
				if (obj.main_obj == objectId){
					obj.main_obj = this.objArr[objectId].main_obj;
				}
			}
			if (objectId == mov_obj) mov_obj = NaN;
			if (objectId < mov_obj) mov_obj --;
			this.objArr.splice(objectId, 1);
			//return console.log(this.objArr);
			this.show_obj_count();
		}
	}
	show_obj_count(){
		document.querySelector('#object_count h2').innerHTML = 'Количество обьектов: ' + this.objArr.length;
	}
	//Необходимая скорость для круговой орбиты
	forceToCircularOrbit(px, py, objId){
		if (scene.objArr[objId]){
			let R = this.rad(scene.camera.screenPix(px, 'x'), scene.camera.screenPix(py, 'y'), scene.camera.screenPix(scene.objArr[objId].x, 'x'), scene.camera.screenPix(scene.objArr[objId].y, 'y'))*scene.camera.animZoom;
			let V = Math.sqrt((scene.objArr[objId].m*10)*(R)/this.g.state);
			let a = scene.objArr[objId].x - px;
			let b = scene.objArr[objId].y - py;
			let sin = b/R, cos = a/R;
			let svx = -(sin/V)*scene.objArr[objId].m*10;
			let svy = (cos/V)*scene.objArr[objId].m*10;
			//if (scene.objArr[objId].main_obj){
			//	let object = scene.objArr[objId].main_obj;
			//	while (scene.objArr[object].main_obj){
			//		svx -= scene.objArr[object].vx;
			//		svx -= scene.objArr[object].vy;
			//		object = scene.objArr[object].main_obj;
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
		let sel = [Infinity, '', 0];
		// Last object in array
		if (mode == 'last_created'){
			sel[1] = scene.objArr.length - 1;
		}
		// The nearest or the furthest object
		if (mode == 'nearest' || mode == 'furthest'){
			for (let i in scene.objArr){
				let r = rad(mouse.x, mouse.y, scene.camera.crd(scene.objArr[i].x, 'x'), scene.camera.crd(scene.objArr[i].y, 'y'));
				if (r < sel[0] && i!=not && mode == 'nearest'){
					sel[0] = r;
					sel[1] = i;
				} else 
				if (r > sel[2] && mode == 'furthest'){
					sel[2] = r;
					sel[1] = i;
				}
			}
		}
		// The most bigger object
		if (mode == 'biggest'){
			for(let i in scene.objArr){
				if (scene.objArr[i].m > sel[2]){
					sel[2] = scene.objArr[i].m;
					sel[1] = i;
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

	randomColor(rco) {
		let r = Math.floor(this.getRandomArbitrary(40, 255)),
			g = Math.floor(this.getRandomArbitrary(40, 255)),
			b = Math.floor(this.getRandomArbitrary(40, 255));

		r = r.toString(16); g = g.toString(16); b = b.toString(16);

		r = r.length < 2 ? '0'+r.toString(16) : r.toString(16);
		g = g.length < 2 ? '0'+g.toString(16) : g.toString(16);
		b = b.length < 2 ? '0'+b.toString(16) : b.toString(16);
		let color = '#' + r + g + b;
		//$('#col_select').attr({'value': color});
		// if (!rco){
		// 	$('.div_col_select').html('<input type=color class=col_select value='+color+
		// 		' id=col_select onchange="newObjColor = this.value; sessionStorage[\'newObjColor\'] = this.value;"\
		// 		 style="padding: 0; border: none; width: 76px; height: 30px;" onmouseout="this.blur();">');
		// }
		return color;
	}
}