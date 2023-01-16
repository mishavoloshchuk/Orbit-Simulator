// Physics calculations
function calculate({ 
	objectsArray, 
	object1Id, 
	interactMode, 
	gravitMode, 
	g, 
	timeSpeed, 
	collisionType, 
	collidedObjectsIdList
}){
	const obj1 = objectsArray[object1Id];
	if (interactMode === 0){
		for (let object2Id = object1Id; object2Id--;){
			// console.log(object1Id, object2Id)
			const obj2 = objectsArray[object2Id];

			const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
			const sin = (obj2.y - obj1.y)/D; // Sin
			const cos = (obj2.x - obj1.x)/D; // Cos
			let vector;

			const radiusSum = Math.sqrt(Math.abs(obj1.m)) + Math.sqrt(Math.abs(obj2.m));
			if (D - radiusSum <= 0){
				if (collisionType === 2){ // Collision type: none
					vector = gravity_func(sin, cos, D, gravitMode, obj2.m, obj1.m, timeSpeed, g*Math.pow(D/radiusSum, 3));
				}
				collidedObjectsIdList.push([object1Id, object2Id]); // Send the collised objects
				return 1;
			} else { 
				// Physics vector calculation
				vector = gravity_func(sin, cos, D, gravitMode, obj2.m, obj1.m, timeSpeed, g);
			}

			if (vector !== undefined){
				// Add calculated vectors to object 1
				obj1.vx += vector[0];
				obj1.vy += vector[1];
				// Add calculated vectors to object 2
				obj2.vx -= vector[2];
				obj2.vy -= vector[3];
			}
		}
	} else
	if (interactMode === 1 && obj1.main_obj !== undefined ){
		const object2Id = obj1.main_obj;
		const obj2 = objectsArray[object2Id];

		const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects

		const collType = collision(obj1, obj2, object1Id, object2Id, D, collisionType, interactMode, collidedObjectsIdList);

		if(!obj1.lock && collType === false){
			const sin = (obj2.y - obj1.y)/D;
			const cos = (obj2.x - obj1.x)/D;
			// Physics vector calculation
			const vector = gravity_func(sin, cos, D, gravitMode, obj2.m, timeSpeed, g);
			obj1.vx += vector[0];
			obj1.vy += vector[1];
			// if (obj1.main_obj !== undefined){
			// 	obj1.x += objectsArray[obj1.main_obj].vx || 0;
			// 	obj1.y += objectsArray[obj1.main_obj].vy || 0;
			// }
		}
	}
};
// Collision
function gpuCollision(objAPos, objAVel, objAMass, objALock, objBPos, objBVel, objBMass, objBLock, objAId, objBId, D, collisionType, timeSpeed, interactMode){
	let objNewPosVel = [objAPos[0], objAPos[1], objAVel[0], objAVel[1]];
	// if (collisionType === 0){ // Collision type: merge
	// 	return [0.0, 0.0, 0.0, 0.0];
	// 	if (interactMode === '0'){
	// 		if (objAMass > objBMass || (objAMass === objBMass && objAId > objBId)){ // If objA mass bigger than objB mass or id is bigger
	// 			return true;
	// 		}
	// 	} else if (interactMode === '1') {
	// 		collidedObjectsIdList.push([objBId, objAId]);
	// 	}
	// } else
	if (collisionType === 1){ // Collision type: repulsion
		// var v1 = gipot(obj.vx, obj.vy); // Scallar velocity
		// var v2 = gipot(obj2.vx, obj2.vy); // Scallar velocity
		// var vcos1 = v1 == 0?0:obj.vx/v1;// cos vx 1
		// var vsin1 = v1 == 0?0:obj.vy/v1;// sin vy 1
		// var vcos2 = v2 == 0?0:obj2.vx/v2;// cos vx 2
		// var vsin2 = v2 == 0?0:obj2.vy/v2;// sin vy 2
		// var ag1 = Math.atan2(vsin1, vcos1);
		// var ag2 = Math.atan2(vsin2, vcos2);

		// var cos = (obj2.x - obj.x)/R;
		// var sin = (obj2.y - obj.y)/R;
		// var fi = Math.atan2(sin, cos);

		// var m1 = obj.m;
		// var m2 = obj2.m;

		// if (!obj.lck && switcher.Interact != 1){
		// 	if (!obj2.lck){
		// 		ob_arr[obj2_name].vx = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
		// 		ob_arr[obj2_name].vy = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
		// 	}
		// } else {
		// 	ob_arr[obj2_name].vx = (( v2*Math.cos(ag2 - fi)*(-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
		// 	ob_arr[obj2_name].vy = (( v2*Math.cos(ag2 - fi)*(-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
		// }
		// return 'repulsion';

		let v1 = gipot(objAVel[0], objAVel[1]); // Scallar velocity
		let v2 = gipot(objBVel[0], objBVel[1]); // Scallar velocity
		let vcos1 = 0;//v1 === 0 ? 0 : objAVel[0]/v1; // cos vx 1
		let vsin1 = 0;//v1 === 0 ? 0 : objAVel[1]/v1; // sin vy 1
		let vcos2 = 0;//v2 === 0 ? 0 : objBVel[0]/v2; // cos vx 2
		let vsin2 = 0;//v2 === 0 ? 0 : objBVel[1]/v2; // sin vy 2
		if (v1 !== 0){
			vcos1 = objAVel[0]/v1;
			vsin1 = objAVel[1]/v1;
		}
		if (v2 !== 0){
			vcos2 = objBVel[0]/v2;
			vsin2 = objBVel[1]/v2;
		}
		let ag1 = Math.atan(vsin1, vcos1);
		let ag2 = Math.atan(vsin2, vcos2);

		let cos = (objBPos[0] - objAPos[0])/D;
		let sin = (objBPos[1] - objAPos[1])/D;
		let fi = Math.atan(sin, cos);

		let m1 = objAMass;
		let m2 = objBMass;
		// Object A new velocity
		if (objALock === 0){
			if (objBLock === 1) { m1 = 0; }
			objNewPosVel[2] = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.cos(fi) + v1*Math.sin(ag1 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
			objNewPosVel[3] = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.sin(fi) + v1*Math.sin(ag1 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
		}
		const vel2 = [0.0, 0.0];
		// Object B new velocity
		if (objBLock === 0){
			if (objALock === 1) { m2 = 0; }
			vel2[0] = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
			vel2[1] = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
		}

		const objARadius = Math.sqrt(Math.abs(objAMass)); // Object A radius
		const objBRadius = objAMass === objBMass ? objARadius : Math.sqrt(Math.abs(objBMass)); // Object B radius
		const rS = objARadius + objBRadius; // Both objects radiuses sum
		let newD = dist(objAPos[0] + objNewPosVel[2]*timeSpeed, objAPos[1] + objNewPosVel[3]*timeSpeed, objBPos[0] + objBVel[0]*timeSpeed, objBPos[1] + objBVel[1]*timeSpeed); // The distance between objects with new position
		if (newD - rS <= 0){
			const mS = objAMass + objBMass; // Both objects mass sum
			const rD = rS - D; // Total move
			const objAMov = objALock === 1 ? 0 : rD * (objBMass / mS); // Object A move
			// const objBMov = objBLock === 1 ? 0 : rD - objAMov; // Object B move
			objNewPosVel[0] -= objAMov * cos; objNewPosVel[1] -= objAMov * sin;
			//objB.x -= objBMov * cos; objB.y -= objBMov * sin;
		}
		// return objNewPosVel;
	}
	return objNewPosVel;
}
//Функции притяжения
function gravity_func(sin, cos, D, gravitMode, mass1, mass2, timeSpeed, g){
	let kff = 0.0, vx = 0.0, vy = 0.0;
	//Обратно-пропорционально квадрату расстояния
	if (gravitMode === 1){  // The gravitMode variable must be a number
		kff = g * timeSpeed * 5;
		vx = kff*(cos/(D*D));
		vy = kff*(sin/(D*D));
	} else
	//Обранто-пропорционально кубу расстояния
	if (gravitMode === 0){
		kff = g * timeSpeed * 500;
		vx = kff*(cos/(D*D*D));
		vy = kff*(sin/(D*D*D));
	} else
	//Обранто-пропорционально расстоянию
	if (gravitMode === 2){
		kff = g * timeSpeed * 0.05;
		vx = kff*(cos/D);
		vy = kff*(sin/D);
	} else
	//Постоянное притяжение
	if (gravitMode === 3){
		kff = g * timeSpeed * 0.0005;
		vx = kff*(cos);
		vy = kff*(sin);
	} else
	//Пропорционально расстоянию
	if (gravitMode === 4){
		kff = g * timeSpeed * 0.000005;
		vx = kff*(cos*D);
		vy = kff*(sin*D);
	}
	//Отправить вектор
	return [vx*mass1, vy*mass1, vx*mass2, vy*mass2];
}

function dist(x1, y1, x2, y2) { 
	return Math.sqrt((x1 - x2)*(x1 - x2) + (y1 - y2)*(y1 - y2));
}