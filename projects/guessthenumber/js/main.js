let [min, attpt, max, mid] = [1n, 1, 100n, 50n]; // Init vars
// Set max number listener
document.querySelector('#maxNum').addEventListener('input', (e)=>{
    [min, attpt, max] = [1n, 1, BigInt(maxNum.value)];
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
            [max, min, attpt] = [BigInt(maxNum.value), 1n, 1];
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
                max = mid - 1n;
                findMid()
                break;}  
            case 'bigger': {
                min = mid + 1n;
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
    let max1 = max<2 ? 2n : max;
    mid = (min + max1)/2n;
}
// Calculate and send attempts throught max number
function getAttempts(){
    let numb = maxNum.value ? maxNum.value < 2 ? 2 : maxNum.value : 2;
    return 1+Math.floor(baseBigIntLog(2, numb));
}
// Get bigint Log
function log10(bigint) {
  if (bigint < 0) return NaN;
  const s = bigint.toString(10);
  return s.length + Math.log10("0." + s.substring(0, 15));
}
function bigIntLog(bigint) { return log10(bigint) * Math.log(10) }
function baseBigIntLog(base, bigint) { return bigIntLog(bigint) / Math.log(base) }