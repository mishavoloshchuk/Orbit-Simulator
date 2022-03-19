let [min, attpt, max, mid] = [1, 1, 100, 50]; // Init vars
// Set max number listener
document.querySelector('#maxNum').addEventListener('input', (e)=>{
    [min, attpt, max] = [1, 1, +e.target.value];
    attempt.innerHTML = "Спроба №: " + attpt + '/' + getAttempts(); 
    showNumb()
})
// Buttons listener
document.querySelector('.appInner').addEventListener('click', (e)=>{
    let elem = e.target.name;
    binarySearch(elem);
    // Buttons
    switch (elem) {
        case 'restart': {
            [max, min, attpt] = [+maxNum.value, 1, 1];
            showNumb()
            attempt.innerHTML = "Спроба №: " + attpt + '/' + getAttempts(); 
            break;}
    }  
    showNumb()
});
// Keyboard events listener
document.addEventListener('keydown', (e)=>{
    let key = e.keyCode;
    //console.log(key);
    switch (key) {
        case 37:{
            binarySearch('smaller');
            break;}
        case 39:{
            binarySearch('bigger');
            break;}
    }
})
// Algoritm of fast search
function binarySearch(comp){
    findMid()
    // Bigger and smaller buttons
    if ((comp == 'smaller' || comp == 'bigger') && attpt != getAttempts() ){
        switch (comp) {
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
    showNumb()
}
// Refresh number text
function showNumb(){
    findMid()
    askNum.innerHTML = mid+'?';
}
// Find middle number
function findMid(){
    let max1 = max<2 ? 2 : max;
    mid = Math.floor((min + max1)/2);
}
// Calculate and send attempts throught max number
function getAttempts(){
    let numb = maxNum.value ? +maxNum.value < 2 ? 2 : +maxNum.value : 2;
    return 1+Math.floor(getBaseLog(2, numb));
}
// Get Base Log
function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
}