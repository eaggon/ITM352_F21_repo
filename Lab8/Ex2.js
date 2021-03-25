require("./products_data.js");

var num_products = 5;

var item_count = 0;

while(item_count++ < (num_products)){
    if((item_count >= 0.25*num_products) && (item_count <= 0.75*num_products)){
        console.log(`Don’t ask for anything else!`);
        process.exit();
    }
    console.log(`${item_count}. ${eval('name' + item_count)}`);
}
console.log("That's all we have!")