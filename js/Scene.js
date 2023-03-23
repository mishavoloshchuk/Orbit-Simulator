export default class Scene {
	objArr = Array(); // Scene objects array
	objIdToOrbit = null; // The ID of the object around which the new object will orbit

	constructor() {
		//
	}
	//Создание нового объекта
	addNewObject({
		x,
		y,
		screenX,
		screenY,
		vx,
		vy,
		mass = ui.newObjMass.state,
		objLck = ui.newObjLock.state,
		color = ui.newObjColor.state,
		main_obj = this.objIdToOrbit,
		circularOrbit = false,
		callback
	}){
		const objArr = this.objArr;
		const newObjId = objArr.length; // The ID of a new object

		// If received a screen coordinates convert it to a world coordinates
		if (screenX !== undefined && screenY !== undefined){
			[x, y] = camera.screenPix2(screenX, screenY);
		}

		const newObj = {
			x: x, // Position X
			y: y, // Position Y
			vx: vx, // Velocity X 
			vy: vy, // Velocity Y 
			m: mass, // Object mass
			r: this.getRadiusFromMass(mass), // Object radius
			color: color, // Object color
			lock: objLck, // Object locked (boolean)
			trace: [], // Array of trace points (traces mode 2-3)
			main_obj: main_obj // Affects in interaction mode 1 (interact with only main objecgt)
		};

		let velX, velY, centerOfMass;
		const mainObj = objArr[main_obj];

		// Creation relative to
		if (ui.creationRelativeTo.state == 0){
			centerOfMass = this.getCenterOfMass();
			// Lock, if more than 50% of global mass maked by locked objects
			centerOfMass.lock = objArr.reduce((mSum, obj) => obj.lock ? mSum + obj.m : mSum, 0) / centerOfMass.m > 0.5;
		} else {
			if (mainObj){
				centerOfMass = mainObj;
			} else {
				centerOfMass = this.getCenterOfMass([]);
				centerOfMass.lock = false;
			}
		}

		if (circularOrbit) {
			if (newObj.m + centerOfMass.m === 0 && newObj.m !== 0){
				[velX, velY] = [0, 0];
			} else {
				// Force to circular orbit
				const m = centerOfMass.lock ? 0 : mass;
				[velX, velY] = this.forceToCircularOrbit({...newObj, m: m}, centerOfMass);
			}
		} else {
			[velX, velY] = [vx, vy];
		}

		[newObj.vx, newObj.vy] = [velX, velY];

	
		if (!centerOfMass.lock && ui.interactMode.state == 0){
			newObj.vx += centerOfMass.vx;
			newObj.vy += centerOfMass.vy;
		}
	
		// Circular orbit correction
		if (circularOrbit){
			newObj.x += velX / 2 * ui.timeSpeed.state;
			newObj.y += velY / 2 * ui.timeSpeed.state;
		}

		// Add new object to objArr with parameters
		objArr[newObjId] = newObj;

		// Movement compensation
		if (ui.movementCompencation.state && !centerOfMass.lock && ui.interactMode.state == 0){ // If enabled
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
		camera.Target = getIdAfterArrChange([objectId], camera.Target);
		if (camera.Target === null) camera.setTarget();
		this.objIdToOrbit = getIdAfterArrChange([objectId], this.objIdToOrbit, this.objectSelect('biggest'));
		mov_obj = getIdAfterArrChange([objectId], mov_obj);
		swch.editObjId = swch.editObjId == objectId ? null : swch.editObjId;

		renderer.allowFrameRender = true;
		this.show_obj_count(); // Set objects counter indicator
	}
	// Show number of objects
	show_obj_count(){
		document.querySelector('#object_count_value').innerHTML = this.objArr.length;
	}

	makeCopy (){
		const newScn = new Scene();
		for (let key in this){
			const prop = this[key];
			if (typeof prop !== 'function'){
				newScn[key] = JSON.parse(JSON.stringify(prop));
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
	// Get object radius
	getRadius(objId){
		return this.objArr[objId].r;
	}
	// Get object radius from mass
	getRadiusFromMass(mass){
		return Math.pow(Math.abs(mass), 1/2);
	}
	// Get exponential value if value bigger than 1
	expVal(F, round = 1000){
		let val = F > 1 ? Math.pow(F, 8) : F;
		return Math.round(val * round) / round;
	}
	// Get random range
	getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	// Reset preview screen positions
	resetPrevScreenPositions(){
		for (let obj of this.objArr){
			obj.prevScreenX = obj.prevScreenY = undefined;
		}
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

		return "#" + this._mixColors(c1, c2, Math.abs(m1), Math.abs(m2));
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