var max = 100;
let min, mid, attpt;
min = 1;
attpt = 1;
// Set max number listener
document.querySelector('#maxNum').addEventListener('input', (e)=>{
    [min, attpt] = [1, 1];
    max = +e.target.value;
    attempt.innerHTML = "Спроба №: " + attpt + '/' + getAttempts(); 
    showNumb()
})

// Buttons listener
document.querySelector('.appInner').addEventListener('click', (e)=>{
    let elem = e.target.name;
    findMid()
    
    if ((elem == 'smaller' || elem == 'bigger') && attpt != getAttempts() ){
        switch (elem) {
            case 'smaller': {
                max = mid - 1;
                findMid()
                break;}  
            case 'bigger': {
                min = mid + 1;
                findMid()
                break;}
        }

        attpt ++;

        attempt.innerHTML = "Спроба №: " + attpt + '/' + getAttempts(); 
    }

    switch (elem) {
        case 'restart': {
            [max, min, attpt] = [+maxNum.value, 1, 1];
            showNumb()
            attempt.innerHTML = "Спроба №: " + attpt + '/' + getAttempts(); 
            break;}
    }
    
    showNumb()
});

function showNumb(){
    findMid()
    askNum.innerHTML = mid+'?';
}
function findMid(){
    let max1 = max<2 ? 2 : max;
    mid = Math.floor((min + max1)/2);
}
function getAttempts(){
    let numb = maxNum.value ? +maxNum.value < 2 ? 2 : +maxNum.value : 2;
    return 1+Math.floor(getBaseLog(2, numb));
}
function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
}

function optiFind(numb, arr){
	var min, max, mid, guess;
	max = arr.length-1;
	min = 0;

	while (min <= max){
		mid = Math.floor((min + max)/2);
		guess = arr[mid];
		if (guess == numb){
			return mid;
		} else if (guess > numb){
			max = mid - 1;
		} else {
			min = mid + 1;
		}

	}
	return NaN;
}