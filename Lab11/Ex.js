//This function checks inputs to see if it is a positive number and returns a true or false.

function isPosNum(q, returnErrors=false){
    errors = []; // assume no errors at first
    if(Number(q) != q) errors.push('Not a number!'); // Check if string is a number value
    if(q < 0) errors.push('Negative value!'); // Check if it is non-negative
    if(parseInt(q) != q) errors.push('Not an integer!'); // Check that it is an integer)

    return returnErrors ? errors : (errors.length == 0);
}

attributes = "Eaggon;36;36.5;-35.5;";
pieces = attributes.split(';');

function checkIt(item,index) {
    console.log(`part ${index} is ${(isPosNum(item)?'a':'not a')} quantity`);
}
pieces.forEach((item,index) => {
    console.log(`part ${index} is ${(isPosNum(item)?'a':'not a')} quantity`);
});