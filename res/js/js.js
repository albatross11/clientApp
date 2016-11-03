m={};
m.cutImage = function(obj){this.loadImg(obj);};
m.cutImage.prototype = {
    'def_opt':{
      'dom':'ss',
      'imgSrc':null,
      'ratio':3/4,//false, 
      'oldImgW':0
    },
    'it':null,
    'IsPC':function(){
      var userAgentInfo = navigator.userAgent;  
      var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");  
      var flag = true;  
      for (var v = 0; v < Agents.length; v++) {  
        if (userAgentInfo.indexOf(Agents[v]) > 0) { flag = false; break; }  
      }  
      return flag; 
    },
    'loadImg':function(obj){  //初始化加载
      if(typeof(obj.dom)==undefined) return false;
      if( $('#'+obj.dom).size()==0) return false;
      if(typeof(obj.isImgMax)== undefined) obj.isImgMax = false;
      if(typeof(obj.width)== undefined) obj.width = 320;
      if(typeof(obj.height)== undefined) obj.height = 320*15.2/10.2;
      this.def_opt.ratio = 320/(320*15.2/10.2);

      this._seldef(obj);  //参数过滤
      //var jcrop_api; 
      if( typeof(obj.maxWidth) == undefined ){ obj.maxWidth= 320; }
      if( typeof(obj.maxHeight) == undefined ){ obj.maxHeight= 320*15.2/10.2; }
      var container = $$(obj.dom), 
      src = obj.imgSrc,
      options = {
          maxWidth:600,
          maxHeight: 600*15.2/10.2,
          onPreLoad: function(){ container.style.background = "url('http://images.cnblogs.com/cnblogs_com/cloudgamer/169629/o_loading.gif') no-repeat center center "; },
          onLoad: function(){ container.style.backgroundImage = ""; },
          onError: function(err){ container.style.backgroundImage = ""; alert(err); }
      };
      $('#'+obj.dom).css({'width':obj.width, 'height':obj.height, 'position':'relative'});
      this.it =  new ImageTrans( container, options );
      this.it.domid = obj.dom;
      this.it.maxWidth = obj.maxWidth;
      this.it.maxHeight = obj.maxHeight;
      this.it.container=container;
      //this.jcrop_api = jcrop_api;
      this.it.load(src);   
      if(obj.isMark!=false){
        this.imgMark(this, obj);
      }
      if(obj.isImgMax){
        $('#'+obj.dom).find('img').css({'maxWidth':obj.width});
        $('#'+obj.dom).find('img').css({'maxHeight':obj.height});
      }else {
        //$('#'+obj.dom).find('img').css({'maxWidth':'100%'});
        //$('#'+obj.dom).find('img').css({'maxHeight':'100%'});
        $('#'+obj.dom).find('img').css({'minWidth':obj.width});
        $('#'+obj.dom).find('img').css({'minHeight':obj.height});
      } 
      this.r_rotation();
      return this;
    }, 
    'imgMark':function(cutimg, obj){  //裁剪框加载
      var  mark=[]; 
      var  markW=$('#'+obj.dom).width()/2;
      var  markH=markW*obj.ratio;
      var  markL=$('#'+obj.dom).width()/2;
      var  markT=$('#'+obj.dom).height()/2;  
      var  mark1=markL-markW/2;
      var  mark2=markT-markH/2;
      var  mark3=markL+markW/2;
      var  mark4=markT+markH/2;
      
      if(obj.mark1 == undefined || obj.mark1 == '' ){  
        obj.mark1=mark1;
      } 
      if(obj.mark2 == undefined || obj.mark2 ==  ''){
        obj.mark2=mark2;
      }
      if(obj.mark3 == undefined || obj.mark3 ==  ''){
        obj.mark3=mark3;
      }
      if(obj.mark4 == undefined || obj.mark4 ==  ''){
        obj.mark4=mark4;
      }
      m.cutImg.mark1=obj.mark1;
      m.cutImg.mark2=obj.mark2;
      m.cutImg.mark3=obj.mark3;
      m.cutImg.mark4=obj.mark4;  

       //创建裁剪框
      $('#'+obj.dom).Jcrop({  
        aspectRatio: obj.ratio,  
        allowSelect: false,
        setSelect:[m.cutImg.mark1,m.cutImg.mark2,m.cutImg.mark3,m.cutImg.mark4], 
        handleSize:20,
        onSelect:val,
        allowResize:obj.allowResize,
        minSize:obj.minSize
      },function(){ 
          val; 
          cutimg.jcrop_api=this;
          console.log(cutimg.jcrop_api);
      });  
      function val(c){ 
         cutimg.mark = c; 
      }
      //return mark;
    }, 
    'r_rotation':function(){  //
      // 删除缩放事件
      var wheel = $$B.firefox ? "DOMMouseScroll" : "mousewheel";
      this.wheel=wheel; 
      if(this.IsPC()){
        $$E.removeEvent( this.it.container, wheel, this.it._mzZoom );
      }else {  
        $$E.removeEvent( this.it.container, 'pinching', this.it._pZoom );  
      }  
    },
    //删除旋转事件
    'r_touchstart':function(){ 
      var touchstart = 'ontouchstart' in document ? 'touchstart' : 'mousedown' ;  
      $$E.removeEvent( this.it.container, touchstart, this.it.r_mrSTART );
    },
    //调用旋转事件
    'rotationBtn':function(obj){    
        var touchstart = 'ontouchstart' in document ? 'touchstart' : 'mousedown' ;  
        $$E.addEvent( this.it.container, touchstart, this.it.r_mrSTART );  
    },
    //删除移动事件
    'm_remove':function(){ 
      var touchstart = 'ontouchstart' in document ? 'touchstart' : 'mousedown' ;  
      $$E.removeEvent( this.it.container, touchstart, this.it.m_mrSTART );
    },
    //调用移动事件
    'm_add':function(obj){    
        var touchstart = 'ontouchstart' in document ? 'touchstart' : 'mousedown' ;  
        $$E.addEvent( this.it.container, touchstart, this.it.m_mrSTART );  
    },
    //调用缩放事件
    'scalingBtn':function(obj){ 
      this.jcrop_api.disable();  
        if(this.IsPC()){
          $$E.addEvent( this.it.container, this.wheel, this.it._mzZoom );
        }else { 
          $$E.addEvent( this.it.container, 'pinching', this.it._pZoom ); 
        }
        obj.dom.removeClass('on');  
    },
    '_seldef':function(opt){ 
      for (k in this.def_opt) {
        if (typeof(opt[k])=="undefined"){
          opt[k]=this.def_opt[k];
        }
      };
      return opt; 
    },
    'save':function(){
      var data = {};
      //裁剪框
      data.mark = this.mark;

      //图片初始缩放比例、宽、高
      data.imgData = this.it.imgData;
      //图片偏移
      data.imgData.offset = {'x':this.it.offsetX, 'y':this.it.offsetY};
      data.image = $(this.it._img).attr('src');
      //后期缩放比例
      data.imgData.afterZoom = this.it._x =  this.it._y;
      data.imgData.zoom = data.imgData.afterZoom*data.imgData.initZoom;

      //处理相框宽度  高度
      data.box = {};
      // data.box.clientHeight = this.it._clientHeight;
      // data.box.clientWidth = this.it._clientWidth;
      data.box.height = this.it._clientHeight;
      data.box.width = this.it._clientWidth;

      //旋转角度值
      data.imgData.radian = this.it._radian;
      data.imgData.radianc = this.it._radian/Math.PI*180;

      //以窗口图片为中心点  图片左上角坐标 (m, n)
      var m= -(data.imgData.naturalWidth*data.imgData.zoom/2);
      var n= data.imgData.naturalHeight*data.imgData.zoom/2;
      var theta= -this.it._radian;
      
      //以窗口图片为中心点  旋转后的左上点坐标(x, y);
      var  x = Math.cos(theta) * m + (-Math.sin(theta)) * n;
      var  y = Math.sin(theta) * m + Math.cos(theta) * n;
      //console.log('(',m, n,')---->(', x, y, ')');

      //以窗口图片为中心点  图片左下坐标 (m1, n1)
      var m1= -(data.imgData.naturalWidth*data.imgData.zoom/2);
      var n1= -(data.imgData.naturalHeight*data.imgData.zoom/2);
      var theta= -this.it._radian;

      //以窗口图片为中心点  旋转后的左下坐标(x1, y1);
      var  x1 = Math.cos(theta) * m1 + (-Math.sin(theta)) * n1;
      var  y1 = Math.sin(theta) * m1 + Math.cos(theta) * n1; 
      //console.log('(', m1, n1,')---->(', x1, y1, ')');

       //旋转生成图片虚拟左上新点  坐标(newx, newy)
      // var newx = x1+data.box.clientWidth/2;
      // var newy = -y+(data.box.clientHeight/2);
      var newx = -Math.abs(x1);//+data.box.clientWidth/2;
      var newy = Math.abs(y);//+(data.box.clientHeight/2);
       //console.log(newx, newy)
      
 
      //计算新矩形图片的宽高  nW  nH
      // var nW = Math.abs(newx-data.box.clientWidth/2)*2;
      // var nH = Math.abs(newy-data.box.clientHeight/2)*2;
      var nW = Math.abs(newx)*2;
      var nH = Math.abs(newy)*2;
      // console.log(nW, nH);
      //console.log(data);
      //新图片虚拟左上点相对于窗口坐标
      data.imgData.newx = newx+data.box.width/2;  //boxW  boxH
      data.imgData.newy = -(newy-data.box.height/2);//-(data.box.height/2-newy);

      //console.log(data);
      return data;
    }
};
m.cutImg = {
  'loadImg':function(obj){
    return new m.cutImage(obj);
  }
};