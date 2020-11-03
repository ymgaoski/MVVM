// 发布订阅模式
function Dep(){
  this.subs = [];
}

// 添加订阅
Dep.prototype.addSub = function(fn){

  let watcher = new Watcher(fn);
  this.subs.push(watcher);
}
// 清空订阅
Dep.prototype.clear = function(obj){
  this.subs.clear();
}
// 通知订阅对象
Dep.prototype.notify = function(){
  // 遍历通知
  this.subs.forEach(function(obj){
    obj.update();
  })
}

// 订阅参数对象,实现通过这个类创建的实例都有 update 方法
function Watcher(fn){
  this.fn = fn;
}
Watcher.prototype.update = function(){
  if (this.fn){
    this.fn();
  }
}