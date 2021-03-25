require("./products_data.js");

var num_products = 5;

var item_count = 1;

while(item_count <= (num_products/2)){
    console.log(`${item_count}. ${eval('name' + item_count)}`);
    item_count++
}
console.log("That's all we have!")