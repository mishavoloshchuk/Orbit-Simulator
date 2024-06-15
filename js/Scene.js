export class Body {
	constructor ({
		pos = [0, 0], 
		vel = [0, 0], 
		m = 10, 
		color = "#FFFFFF", 
		lock = false, 
		parentObj = undefined
	}) {
		[this.x, this.y] = pos;
		[this.vx, this.vy] = vel;
		this.m = m;
		this.updateRadius();
		this.color = color;
		this.lock = lock;
		this.parentObj = parentObj;
		this.trace = [];
	}

	// Get object radius from mass
	updateRadius(){
		this.r = Math.pow(Math.abs(this.m), 1/2);
	}
}

export default class Scene {
	objArr = Array(); // Scene objects array
	objIdToOrbit = null; // The ID of the object around which the new object will orbit

	//Создание нового объекта
	addNewObject({
		pos = [],
		screenPos = [],
		vel = [],
		mass = ui.newObjMass.state,
		objLck = ui.newObjLock.state,
		color = ui.newObjColor.state,
		parentObj = this.objIdToOrbit,
		circularOrbit = false,
		callback
	}){
		const objArr = this.objArr;
		const newObjId = objArr.length; // The ID of a new object

		// If received a screen coordinates convert it to a world coordinates
		if (screenPos.length){
			pos = camera.screenPix2(...screenPos);
		}

		const newObj = new Body ({
			pos: pos, // Position
			vel: vel, // Velocity
			m: mass, // Object mass
			color: color, // Object color
			lock: objLck, // Object locked (boolean)
			trace: [], // Array of trace points (traces mode 2-3)
			parentObj: parentObj // Affects in interaction mode 1 (interact with only main objecgt)
		});

		let newVel, centerOfMass;
		const mainObj = objArr[parentObj];

		// Creation relative to
		if (ui.creationRelativeTo.state == 0){
			centerOfMass = this.getCenterOfMass();
			// Lock, if more than 50% of global mass made by locked objects
			centerOfMass.lock = objArr.reduce((mSum, obj) => obj.lock ? mSum + obj.m : mSum, 0) / centerOfMass.m > 0.5;
		} else {
			if (mainObj){
				centerOfMass = mainObj;
			} else {
				centerOfMass = this.getCenterOfMass([]);
				centerOfMass.lock = false;
			}
		}
		
		// Circular orbit
		if (circularOrbit && centerOfMass.m > 0) {
			if (newObj.m + centerOfMass.m === 0 && newObj.m !== 0){ // Spawn object with negative mass that equals to the total positive mass of all objects
				newVel = [0, 0];
			} else {
				// Force to circular orbit
				const m = centerOfMass.lock ? 0 : mass;
				newVel = this.forceToCircularOrbit({...newObj, m: m}, centerOfMass);
			}
		} else {
			newVel = vel;
		}

		[newObj.vx, newObj.vy] = newVel;
	
		if (circularOrbit){
			// Circular orbit correction
			newObj.x += newVel[0] / 2 * ui.timeSpeed.state;
			newObj.y += newVel[1] / 2 * ui.timeSpeed.state;

			// Circular orbit relative to the center of mass
			if (!centerOfMass.lock && ui.interactMode.state == 0){
				newObj.vx += centerOfMass.vx;
				newObj.vy += centerOfMass.vy;
			}
		}

		// Add new object to objArr with parameters
		objArr[newObjId] = newObj;

		// Movement compensation
		if (ui.movementCompencation.state && !centerOfMass.lock && ui.interactMode.state == 0 && centerOfMass.m > 0){ // If enabled
			let centerOfMassAfter = ui.creationRelativeTo.state == 0 ? this.getCenterOfMass() : this.getCenterOfMass([newObj, centerOfMass]);
			const cvx = centerOfMass.vx - centerOfMassAfter.vx;
			const cvy = centerOfMass.vy - centerOfMassAfter.vy;

			if (ui.creationRelativeTo.state == 0){ // If object creation is relative to the center of mass
				compensate(objArr);
			} else { // If object creation is relative to main object
				if (mainObj && !mainObj.lock) {
					compensate([newObj, mainObj]);
				}
			}
			function compensate (objArr){
				for (let obj of objArr){
					obj.vx += cvx;
					obj.vy += cvy;
				}
			}
		}

		physics.pullOutFromEachOther(objArr);
		// Run callback after an object have been created
		callback && callback(newObjId);
		// If object created return its ID, else return false
		return objArr[newObjId] ? newObjId : false;
	}
	//Удаление объекта
	deleteObject(objects, eachObjectCallback = this.delObjectCallback.bind(this)){
		const objArr = this.objArr;
		let objectsToDelete;
		if (Array.isArray(objects)){
			objectsToDelete = objects.sort((a, b) => b - a); // Given objects ID's to delete
		} else {
			objectsToDelete = [objects]; // If given not an array
		}
		let deletedObjectsList = [];
		for (let objectId of objectsToDelete){
			// Change main object in child objects before delete
			for (let obj of objArr){
				if (obj.parentObj == objectId){
					obj.parentObj = objArr[objectId].parentObj;
				}
			}
			deletedObjectsList = deletedObjectsList.concat(objArr.splice(objectId, 1));
			eachObjectCallback && eachObjectCallback(objectId);
		}
		return deletedObjectsList;
	}
	delObjectCallback(objectId){
		camera.Target = UtilityMethods.getIdAfterArrChange([objectId], camera.Target);
		if (camera.Target === null) camera.setTarget();
		this.objIdToOrbit = UtilityMethods.getIdAfterArrChange([objectId], this.objIdToOrbit, this.objectSelect('biggest'));
		mov_obj = UtilityMethods.getIdAfterArrChange([objectId], mov_obj);
		swch.editObjId = UtilityMethods.getIdAfterArrChange([objectId], swch.editObjId);

		renderer.allowFrameRender = true;
		this.show_obj_count(); // Set objects counter indicator
	}
	// Show number of objects
	show_obj_count(){
		document.querySelector('#object_count_value').innerHTML = this.objArr.length;
	}

	makeCopy(){
		const newScn = new Scene();
		for (let key in this){
			if (key === "objArr") {
				newScn.objArr = this.objArr.map((body) => Object.assign(Object.create(Object.getPrototypeOf(body)), body));
				continue;
			}
			const prop = this[key];
			if (typeof prop !== 'function'){
				newScn[key] = UtilityMethods.deepClone(prop);
			}

		}
		return newScn;
	}
	// Force to circular orbit
	forceToCircularOrbit(objA, objB){
		if (objB === undefined) return [0, 0];

		// If mass sum equals zero
		if (objA.m + objB.m === 0) objA.m = -objA.m;
		const massCenter = this.getCenterOfMass([objA, objB]);

		// Distance between objA and center of mass
		const D = dist(objA.x, objA.y, massCenter.x, massCenter.y);

		if (D <= 0) return [0, 0];

		const V = Math.sqrt(ui.g.value * Math.abs(objB.m) / D * 5);
		const a = massCenter.x - objA.x;
		const b = massCenter.y - objA.y;
		const sin = b/D, cos = a/D;
		let svx = -sin * V;
		let svy = cos * V;

		if (ui.newObjCreateReverseOrbit.state){
			svx = -svx;
			svy = -svy;
		}

		return [svx, svy];
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
				let r = dist(mouse.x, mouse.y, ...renderer.crd2(this.objArr[i].x, this.objArr[i].y));
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
	// Get senter of mass
	getCenterOfMass(objArr = this.objArr){
		// Center of mass parameters
		const centerOfMass = {
			x: 0, y: 0, // Pos
			vx: 0, vy: 0, // Vel
			m: 0 // Mass
		};

		// Return zero center mass if objArr length is zero
		if (objArr.length == 0) return centerOfMass;

		// Mass
		centerOfMass.m = objArr.reduce((mSum, obj) => {
			return mSum + obj.m;
		}, 0);
		let mSum = centerOfMass.m;
		const absMassSum = objArr.reduce((absMSum, obj) => {
			return absMSum + Math.abs(obj.m);
		}, 0);

		if (mSum === 0 && absMassSum === 0) return centerOfMass;

		if (mSum === 0 && mSum !== absMassSum) centerOfMass.m = mSum = absMassSum;

		for (let obj of objArr){
			// Center of mass position
			centerOfMass.x += obj.x * obj.m;
			centerOfMass.y += obj.y * obj.m;

			// Center of mass velocity
			const kff = obj.m / mSum;
			centerOfMass.vx += obj.vx * kff;
			centerOfMass.vy += obj.vy * kff;
		}
		// Divide position by mass sum
		centerOfMass.x /= mSum;
		centerOfMass.y /= mSum;

		return centerOfMass;
	}
	// Get object radius from mass
	getRadiusFromMass(mass){
		return Math.pow(Math.abs(mass), 1/2);
	}

	addObjects = function(count = 100){
		for (let i = 0; i < count; i++){
		  	addFrameBeginTask(()=>{ 
				scene.addNewObject({...newObjParams,
					screenPos: [Math.random() * innerWidth, Math.random() * innerHeight],
				});
			});
		}
	}
}