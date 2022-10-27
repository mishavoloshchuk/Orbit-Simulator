// Physics calculations
function calculate({ 
	objectsArray, 
	objectId, 
	interactMode, 
	gravitMode, 
	g, 
	timeSpeed, 
	collisionType, 
	collidedObjectsIdList
}){
	let obj = objectsArray[objectId];
	//obj.vx = obj.vy = 0;
	if (interactMode === '0'){//(switcher.ref_Interact == 0 && !switcher.pause2 && !bodyEmpty){
		for (let object2Id = objectsArray.length; object2Id--;){
			if (object2Id === objectId){ continue; } // Skip itself
			let obj2 = objectsArray[object2Id];

			let S = rad(obj.x, obj.y, obj2.x, obj2.y); // The distance between objects

			let collType = collision(obj, obj2, objectId, object2Id, S, collisionType, interactMode, collidedObjectsIdList);

			if(obj.lck !== true && collType === false){
				let sin = (obj2.y - obj.y)/S; // Sin
				let cos = (obj2.x - obj.x)/S; // Cos
				// Physics vector calculation
				let vector = gravity_func(sin, cos, S, gravitMode, obj2.m, timeSpeed, g);
				obj.vx += vector[0]; // Add calculated vectors
				obj.vy += vector[1]; // Add calculated vectors
			} else if (collisionType == 2 && collType !== false){
				let sin = (obj2.y - obj.y)/S; // Sin
				let cos = (obj2.x - obj.x)/S; // Cos
				// Physics vector calculation
				let vector = gravity_func(sin, cos, S, gravitMode, obj2.m, timeSpeed, g*Math.pow(collType, 3));
				obj.vx += vector[0]; // Add calculated vectors
				obj.vy += vector[1]; // Add calculated vectors				
			}
		}
	} else
	if (interactMode === '1' && obj.main_obj !== undefined ){
		let object2Id = obj.main_obj;
		let obj2 = objectsArray[object2Id];

		let S = rad(obj.x, obj.y, obj2.x, obj2.y); // The distance between objects

		let collType = collision(obj, obj2, objectId, object2Id, S, collisionType, interactMode, collidedObjectsIdList);

		if(!obj.lck && collType === false){
			let sin = (obj2.y - obj.y)/S;
			let cos = (obj2.x - obj.x)/S;
			// Physics vector calculation
			let vector = gravity_func(sin, cos, S, gravitMode, obj2.m, timeSpeed, g);
			obj.vx += vector[0];
			obj.vy += vector[1];
		}
	}
};
// Collision
function collision(objA, objB, objAId, objBId, S, collisionType, interactMode, collidedObjectsIdList){
	let radiusSum = Math.sqrt(Math.abs(objA.m)) + Math.sqrt(Math.abs(objB.m));
	if (S - radiusSum <= 0){
		if (collisionType == 0){ // Collision type: merge
			if (interactMode === '0'){
				if (objA.m >= objB.m){
					if (objA.m != objB.m || objAId < objBId){ // Fix the same mass bug (only multithread bug)
						
						collidedObjectsIdList.push([objAId, objBId]); // Send the collised objects

						return 1;
					}
				}				
			} else if (interactMode === '1') {
				collidedObjectsIdList.push([objBId, objAId]);
			}
		} else
		if (collisionType == 1){ // Collision type: repulsion
			collidedObjectsIdList.push([objAId, objBId]); // Send the collised objects and distance between them
			return 1;
		} else
		if (collisionType == 2){ // Collision type: none
			return S/radiusSum;
		}
		return 1;
	} else { return false }
}
//Функции притяжения
function gravity_func(sin, cos, S, gravitMode, mass, timeSpeed, g){
	let kff, vx, vy;
	//Обратно-пропорционально квадрату расстояния
	if (gravitMode === 1){  // The gravitMode variable must be a number
		kff = g*mass*10*timeSpeed;
		vx = kff*(cos/(S*S));//(obj2.x-obj.x)/10000;//~1;
		vy = kff*(sin/(S*S));//(obj2.y-obj.y)/10000;//~-0.522;
	} else
	//Обранто-пропорционально кубу расстояния
	if (gravitMode === 0){
		kff = g*mass*1000*timeSpeed;
		vx = kff*(cos/(S*S*S));
		vy = kff*(sin/(S*S*S));
	} else
	//Обранто-пропорционально расстоянию
	if (gravitMode === 2){
		kff = g*mass*0.1*timeSpeed;
		vx = kff*(cos/S);
		vy = kff*(sin/S);
	} else
	//Постоянное притяжение
	if (gravitMode === 3){
		kff = g*mass*0.001*timeSpeed;
		vx = kff*(cos);
		vy = kff*(sin);
	} else
	//Пропорционально расстоянию
	if (gravitMode === 4){
		kff = g*mass*0.00001*timeSpeed;
		vx = kff*(cos*S);
		vy = kff*(sin*S);
	}
	//Отправить вектор
	return [vx, vy];
}

function rad(x1, y1, x2, y2) { return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)) }