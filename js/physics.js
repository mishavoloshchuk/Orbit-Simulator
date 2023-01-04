// Physics calculations
function calculate({ 
	objectsArray, 
	objectId, 
	interactMode, 
	gravitMode, 
	g, 
	timeSpeed, 
	collisionType, 
	collidedObjectsIdList,
	multiThread = true
}){
	let innerIterator = function (object2Id) {
		const obj2 = objectsArray[object2Id];

		const S = rad(obj.x, obj.y, obj2.x, obj2.y); // The distance between objects

		const collType = collision(obj, obj2, objectId, object2Id, S, collisionType, interactMode, collidedObjectsIdList);

		const sin = (obj2.y - obj.y)/S; // Sin
		const cos = (obj2.x - obj.x)/S; // Cos
		let vector;
		if(collType === false){
			// Physics vector calculation
			vector = gravity_func(sin, cos, S, gravitMode, obj2.m, obj.m, timeSpeed, g);
		} else if (collisionType == 2 && collType !== false){
			// Physics vector calculation
			vector = gravity_func(sin, cos, S, gravitMode, obj2.m, obj.m, timeSpeed, g*Math.pow(collType, 3));
		}
		if (vector !== undefined){
			// Add calculated vectors to object 1
			obj.vx += vector[0];
			obj.vy += vector[1];
			// Add calculated vectors to object 2
			if (multiThread === false){
				obj2.vx -= vector[2];
				obj2.vy -= vector[3];
			}
		}	
	}

	const obj = objectsArray[objectId];
	if (interactMode === '0'){
		if (multiThread === true){
			for (let object2Id = objectsArray.length; object2Id--;){
				if (object2Id === objectId) continue;
				innerIterator(object2Id);
			}
		} else {
			for (let object2Id = objectId; object2Id--;){
				// console.log(objectId, object2Id)
				innerIterator(object2Id);
			}
		}
	} else
	if (interactMode === '1' && obj.main_obj !== undefined ){
		const object2Id = obj.main_obj;
		const obj2 = objectsArray[object2Id];

		const S = rad(obj.x, obj.y, obj2.x, obj2.y); // The distance between objects

		const collType = collision(obj, obj2, objectId, object2Id, S, collisionType, interactMode, collidedObjectsIdList);

		if(!obj.lock && collType === false){
			const sin = (obj2.y - obj.y)/S;
			const cos = (obj2.x - obj.x)/S;
			// Physics vector calculation
			const vector = gravity_func(sin, cos, S, gravitMode, obj2.m, timeSpeed, g);
			obj.vx += vector[0];
			obj.vy += vector[1];
			// if (obj.main_obj !== undefined){
			// 	obj.x += objectsArray[obj.main_obj].vx || 0;
			// 	obj.y += objectsArray[obj.main_obj].vy || 0;
			// }
		}
	}
};
// Collision
function collision(objA, objB, objAId, objBId, S, collisionType, interactMode, collidedObjectsIdList){
	const radiusSum = Math.sqrt(Math.abs(objA.m)) + Math.sqrt(Math.abs(objB.m));
	if (S - radiusSum <= 0){
		if (collisionType == 0){ // Collision type: merge
			if (interactMode === '0'){
				collidedObjectsIdList.push([objAId, objBId]); // Send the collised objects
				return 1;
			} else if (interactMode === '1') {
				collidedObjectsIdList.push([objBId, objAId]);
			}
		} else
		if (collisionType == 1){ // Collision type: repulsion
			collidedObjectsIdList.push([objAId, objBId]); // Send the collised objects
			return 1;
		} else
		if (collisionType == 2){ // Collision type: none
			return S/radiusSum;
		}
		return 1;
	} else { return false }
}
//Функции притяжения
function gravity_func(sin, cos, S, gravitMode, mass1, mass2, timeSpeed, g){
	let kff, vx, vy;
	//Обратно-пропорционально квадрату расстояния
	if (gravitMode === 1){  // The gravitMode variable must be a number
		kff = g * timeSpeed * 5;
		vx = kff*(cos/(S*S));
		vy = kff*(sin/(S*S));
	} else
	//Обранто-пропорционально кубу расстояния
	if (gravitMode === 0){
		kff = g * timeSpeed * 500;
		vx = kff*(cos/(S*S*S));
		vy = kff*(sin/(S*S*S));
	} else
	//Обранто-пропорционально расстоянию
	if (gravitMode === 2){
		kff = g * timeSpeed * 0.05;
		vx = kff*(cos/S);
		vy = kff*(sin/S);
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
		vx = kff*(cos*S);
		vy = kff*(sin*S);
	}
	//Отправить вектор
	return [vx*mass1, vy*mass1, vx*mass2, vy*mass2];
}

function rad(x1, y1, x2, y2) { return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)) }