require("./products_data.js");

for (var item_count = 1; eval("typeof name"+item_count) != 'undefined'; item_count++) {
    console.log(`${item_count}. ${eval('name' + item_count)}`);
}
console.log("That's all we have!")