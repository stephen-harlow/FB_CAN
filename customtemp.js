function Service(bar) {
  // always initialize all instance properties
  this.actions = []
  this.name = bar; // default value
}
function Service(name, action, price, format){
  this.name = name;
  this.actions = [];
  this.actions.push({
    act: action,
    price: price,
    form: format
  });

}
// class methods
Service.prototype.addAction = function(newAct) {
  var matching = this.actions.filter(function(item) {
    return item.act == newAct.actions[0].act;
  })[0];
};
// export the class
module.exports = Foo;
