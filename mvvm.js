function XVue(options = {}) {
  // 将所有属性挂载到$options
  this.$options = options;
  // 挂载data
  var data = (this._data = this.$options.data);
  // 发布订阅
  this._dep = new Dep();

  // 将data属性，重新定义成可监听的属性
  addObserveData(data, this);

  // this 代理 this._data
  for (let key in data) {
    Object.defineProperty(this, key, {
      enumerable: true,
      get() {
        return this._data[key];
      },
      set(newVal) {
        this._data[key] = newVal;
      }
    });
  }

  // 初始化computed,call是实现 在initComputed this 还是访问当前对象
  initComputed.call(this);

  // 编译，替换标签元素绑定的数据
  new Compile(options.el, this);
}

// 初始化computed，具有缓存功能
function initComputed(){

  let vm = this;
  let computed = this.$options.computed;

  Object.keys(computed).forEach(function(key){
    
    // 将hello方法当成属性挂到vm中
    Object.defineProperty(vm,key,{
      enumerable:true,
      // 简写
      // get: typeof computed[key] == 'function' ? computed[key] : computed[key].get,
      get: function(){
        // 使用 call 是为了设置computed的this的作用域，默认是指向window的，需要指向到当前xvue对象 
        if (typeof computed[key] == 'function'){
          return computed[key].call(vm);
        }
        // 不懂下面这是什么操作
        // else{
        //   return computed[key].call(vm).get;
        // }
      },
      set(){}
    })
  })
}

// 编译，替换标签元素绑定的数据
function Compile(el, vm) {
  // 获取真实节点
  vm.$el = document.querySelector(el);
  // 创建虚拟节点，方便处理多个dom节点数据，提高性能
  let fragment = document.createDocumentFragment();
  // 将app内容移到虚拟节点中去,移过去真实dom节点就没了
  while ((child = vm.$el.firstChild)) {
    fragment.appendChild(child);
  }

  // 获取绑定属性的正则 {{name}}
  let propReg = /(\{\{(.+?)\}\})/;

  // 替换属性值
  function replace(fragment) {
    Array.from(fragment.childNodes).forEach(function(element) {
      // 是否有子节点，递归处理
      if (element.childNodes && element.childNodes.length > 0) {
        replace(element);
      }

      // nodeType:{1:元素节点，2:属性节点，3:文本节点}
      if (element.nodeType == 3) {
        // 文本属性的替换
        replaceText(element,vm);
      }else if(element.nodeType == 1){
        // 获取元素节点中的属性
        Array.from(element.attributes).forEach(function(attr){
          // 数据双向绑定
          if (attr.name == 'v-model'){
            let exp = attr.nodeValue;

            let keyArray = exp.split(".");

            // 添加input事件
            element.addEventListener('input',function(event){
              
              let newVal = this.value;

              // 重新赋值
              let _val = vm;
              let i=0;
              Array.from(keyArray).forEach(function(key) {
                
                // 获取 a.b.c 中 最后 a.b 再去赋值
                if (i == keyArray.length - 1){
                  _val[key] = newVal;
                  return;
                }

                _val = _val[key];
                i++;
              });
            })
            
            // 遍历获取子属性的值
            let _val = vm;
            Array.from(keyArray).forEach(function(key) {
              _val = _val[key];
            });

            // 赋值
            element.value = _val;
          }
        })
      }
    });
  }
  replace(fragment);

  // 将虚拟节点添加到页面
  vm.$el.appendChild(fragment);
}

// 文本属性的替换
function replaceText(element,vm){
  
  // 获取绑定属性的正则 {{name}}
  let propReg = /(\{\{(.+?)\}\})/;
  if (propReg.test(element.textContent)) {
    // console.log(RegExp.$1,RegExp.$2);

    // {{name}}
    let template = RegExp.$1;
    let text = element.textContent;

    // 遍历获取子属性的值
    let keyArray = RegExp.$2.split(".");
    let _val = vm;
    Array.from(keyArray).forEach(function(key) {
      _val = _val[key];
    });

    // 替换属性内容
    element.textContent = text.replace(template, _val);

    // 添加订阅
    vm._dep.addSub(vm, RegExp.$2, function(newVal) {
      console.log(newVal, "有数据更新");
      element.textContent = text.replace(template, newVal);
    });
  }
}

// 构建监听属性
function addObserveData(obj, vm) {
  for (const key in obj) {
    // 缓存原有的值
    let value = obj[key];

    // 递归处理子对象
    if (typeof obj[key] === "object") {
      addObserveData(obj[key], vm);
    }

    // 定义响应属性
    let _value;
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      get: function() {
        return _value;
      },
      set: function(newVal) {
        if (newVal === _value) {
          return;
        }
        _value = newVal;

        // 通知更新
        vm._dep.notify();
      }
    });

    // 重新赋值
    obj[key] = value;
  }
}

// ------- 发布订阅模式
function Dep() {
  this.subs = [];
}

// 添加订阅
Dep.prototype.addSub = function(vm, prorArray, fn) {
  let watcher = new Watcher(vm, prorArray, fn);
  this.subs.push(watcher);
};
// 清空订阅
Dep.prototype.clear = function(obj) {
  this.subs.clear();
};
// 通知订阅对象
Dep.prototype.notify = function() {
  // 遍历通知
  this.subs.forEach(function(obj) {
    // 获取最新的值
    let keyArray = obj.prorArray.split(".");
    let _newVal = obj.vm;
    Array.from(keyArray).forEach(function(key) {
      _newVal = _newVal[key];
    });
    // 更新
    obj.update(_newVal);
  });
};

// 观察者，订阅参数对象,实现通过这个类创建的实例都有 update 方法
function Watcher(vm, prorArray, fn) {
  this.vm = vm;
  this.prorArray = prorArray;
  this.fn = fn;
}
Watcher.prototype.update = function(newVal) {
  if (this.fn) {
    this.fn(newVal);
  }
};
