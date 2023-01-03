importScripts('physics.js');
let objectsArray, interactMode, timeSpeed, gravitMode, g, collisionType, collidedObjectsIdList;
onmessage = function (e) {
	objectsArray = JSON.parse(e.data.objArr);
	interactMode = e.data.interactMode;
	timeSpeed = e.data.timeSpeed;
	gravitMode = e.data.gravitMode;
	g = e.data.g;
	collisionType = e.data.collisionType;
	collidedObjectsIdList = []; // Array of objects IDs to delete
	// console.log(e.data.task)
	for (let objectId of e.data.task){
		// objectsArray[objectId].vx = objectsArray[objectId].vy = 0;
		calculate({
			objectsArray: objectsArray,
			objectId: objectId,
			interactMode: interactMode,
			gravitMode: gravitMode,
			g: g,
			timeSpeed: timeSpeed,
			collisionType: collisionType,
			collidedObjectsIdList
		});
	}

	// Sent optimized objects array
	// var messageObjArr = [];
	// for (let objId of e.data.task){
	// 	let ob = objectsArray[objId];
	// 	messageObjArr[objId] = {vx: ob.vx, vy: ob.vy, m: ob.m};
	// }
	let messageObjArr = objectsArray.map((obj, objId) => {obj.id = objId; return obj}).filter(obj => obj.vx || obj.vy);
	postMessage({
		objArr: messageObjArr,
		// task: e.data.task,
		collidedObjectsIdList: collidedObjectsIdList
	});
}