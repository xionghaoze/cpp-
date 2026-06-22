/**
 * 上下文变量导出
 */
var EVENT_TYPE = Enum.EVENT_TYPE
var userUtilsPro = userUtilsPro;
function runBg(context,w,h) {
    var STAR_COUNT = (w+h) / 8;
     const   STAR_SIZE = 3,
        STAR_MIN_SCALE = 0.2,
        OVERFLOW_THRESHOLD = 50;

    let scale = 1, // device pixel ratio
        width,
        height;

    let stars = [];

    let pointerX,
        pointerY;

    let velocity = { x: 0, y: 0, tx: -100, ty: 100, z: 0.0005 };

    let touchInput = false;
    var returnObj = {}


    function resize(w2,h2) {

        // scale = window.devicePixelRatio || 1;

        width =w2 * scale;
        height = h2 * scale;

        stars.forEach(placeStar);

    }

    function placeStar(star) {

        star.x = Math.random() * width;
        star.y = Math.random() * height;

    }
    function recycleStar(star) {

        let direction = 'z';

        let vx = Math.abs(velocity.x),
            vy = Math.abs(velocity.y);

        if (vx > 1 || vy > 1) {
            let axis;

            if (vx > vy) {
                axis = Math.random() < vx / (vx + vy) ? 'h' : 'v';
            }
            else {
                axis = Math.random() < vy / (vx + vy) ? 'v' : 'h';
            }

            if (axis === 'h') {
                direction = velocity.x > 0 ? 'l' : 'r';
            }
            else {
                direction = velocity.y > 0 ? 't' : 'b';
            }
        }

        star.z = STAR_MIN_SCALE + Math.random() * (1 - STAR_MIN_SCALE);

        if (direction === 'z') {
            star.z = 0.1;
            star.x = Math.random() * width;
            star.y = Math.random() * height;
        }
        else if (direction === 'l') {
            star.x = -OVERFLOW_THRESHOLD;
            star.y = height * Math.random();
        }
        else if (direction === 'r') {
            star.x = width + OVERFLOW_THRESHOLD;
            star.y = height * Math.random();
        }
        else if (direction === 't') {
            star.x = width * Math.random();
            star.y = -OVERFLOW_THRESHOLD;
        }
        else if (direction === 'b') {
            star.x = width * Math.random();
            star.y = height + OVERFLOW_THRESHOLD;
        }

    }
    returnObj.update = function () {

        velocity.tx *= 0.96;
        velocity.ty *= 0.96;

        velocity.x += (velocity.tx - velocity.x) * 0.8;
        velocity.y += (velocity.ty - velocity.y) * 0.8;

        stars.forEach((star) => {

            star.x += velocity.x * star.z;
            star.y += velocity.y * star.z;

            star.x += (star.x - width / 2) * velocity.z * star.z;
            star.y += (star.y - height / 2) * velocity.z * star.z;
            star.z += velocity.z;

            // recycle when out of bounds
            if (star.x < -OVERFLOW_THRESHOLD || star.x > width + OVERFLOW_THRESHOLD || star.y < -OVERFLOW_THRESHOLD || star.y > height + OVERFLOW_THRESHOLD) {
                recycleStar(star);
            }

        });

    }


    // var gradient = context.createRadialGradient(0, 0, 0, 0, 0, (width>height?width:height));
    // gradient.addColorStop(0, "#000000");
    // gradient.addColorStop(0.5, "#333");
    // gradient.addColorStop(1, "#000");
    // context.fillStyle = gradient;
    // context.fillRect(0, 0, width, height);
    // context.fillStyle = null;
    returnObj.render = function () {
        var size = (width>height?width:height)


        context.fillStyle = "#000000";
        context.fillRect(0, 0, width, height);
        context.fillStyle = null;
        var gradient = context.createRadialGradient(0, 0, 0, 0, 0,(width>height?width:height));
        gradient.addColorStop(0, "rgba(121, 68, 154, 0.13)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        context.fillStyle = null;

        var gradient = context.createRadialGradient(width*20/100, height*20/100, size*20/100, width*20/100, height*20/100, (width>height?width:height)*80/100);
        gradient.addColorStop(0, "rgba(41, 196, 255, 0.13)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        context.fillStyle = null;
        stars.forEach((star) => {
         
            context.beginPath();
            context.lineCap = 'round';
            context.lineWidth = STAR_SIZE * star.z * scale;
            context.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.random()) + ')';

            context.beginPath();
            context.moveTo(star.x, star.y);

            var tailX = velocity.x * 2,
                tailY = velocity.y * 2;

            // stroke() wont work on an invisible line
            if (Math.abs(tailX) < 0.1) tailX = 0.5;
            if (Math.abs(tailY) < 0.1) tailY = 0.5;

            context.lineTo(star.x + tailX, star.y + tailY);

            context.stroke();

        });

    }
    returnObj.updateStarts = function () {
        stars = []
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: 0,
                y: 0,
                z: STAR_MIN_SCALE + Math.random() * (1 - STAR_MIN_SCALE)
            });
        }
    }

    returnObj.resize = function(w,h){
        STAR_COUNT =  (w+h) / 8;
        returnObj.updateStarts()
        resize(w,h)
    }
    returnObj.velocity = velocity;
    return returnObj
}

/**
 * 标题绘制逻辑
 * @param {*} context 
 * @param {*} w 
 * @param {*} h 
 * @returns 
 */
function runTitle(context,w,h){
    var BLOCK_SIZE = 10;
    var BYTE_OFFSET = 4;
    var width =w ;
    var height = h    
    function getTextTexture(text, fontSize) {
        var canvasEl = document.createElement("canvas");
        var context = canvasEl.getContext('2d');
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'left';
        context.textBaseline = 'top';
        context.font = "bold " + fontSize + "px Arial";
        var width = context.measureText(text).width;
        canvasEl.width = width
        canvasEl.height = fontSize
        var context = canvasEl.getContext('2d');
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'left';
        context.textBaseline = 'top';
        context.font = "bold " + fontSize + "px Arial";
        context.fillText(text, 0, 0);
        
        return context.getImageData(0, 0, width, fontSize);
    }
    function getParticles(texture) {
        
        var result = [];
        for (var i = 0; i < texture.width / BLOCK_SIZE; i++) {
            for (var j = 0; j < texture.height / BLOCK_SIZE; j++) {
                var offset = Math.floor(j * BLOCK_SIZE * texture.width + i * BLOCK_SIZE + BLOCK_SIZE / 2) * BYTE_OFFSET;
                if (texture.data[offset]) {
                    var offset=  140
                    if(width<=800){
                        offset = 60
                    }
                    var endPos = {
                    x: i * BLOCK_SIZE + (width - texture.width) / 2,
                    y: j * BLOCK_SIZE + (height - texture.height) / 2-offset }
                    var fh = (userUtilsPro.rand()>0.5?1:-1)
                result.push(new Particle({
                    x:endPos.x ,y:endPos.y+fh*userUtilsPro.randBetween(100,300)
                },endPos));

                }
            }
        };
        return result;
    }
    function Particle(a,b){
        this.start = a
        this.end = b
        this.startColor = [100,200,50,1.0]
        this.endColor = [255,50,255,1.0]
        this.t = 0
        this.x = 0
        this.y = 0
        this.isEnd = false;
        this.tMult = 5/ userUtilsPro.pointsDis(this.start, this.end)
        this.getColor = function(){
            var t = this.t;
            var r =  userUtilsPro.oneBezier(this.startColor[0],this.endColor[0], t)
            var g =  userUtilsPro.oneBezier(this.startColor[1],this.endColor[1], t)
            var b =  userUtilsPro.oneBezier(this.startColor[2],this.endColor[2], t)
            var a =  userUtilsPro.oneBezier(this.startColor[3],this.endColor[3], t)
            return "rgba("+r+","+g+","+b+","+1.0+")"
        }
        this.update = function(){
            if (this.t >= 1) {
                
                this.t = 0
                this.isEnd  = true
              } else {
                if (this.t + this.tMult <= 1) {
                  this.t += this.tMult
                } else {
                  this.t = 1
                }
            }
            if(!this.isEnd ){
                this.x = userUtilsPro.oneBezier(this.start.x, this.end.x, this.t)
                this.y = userUtilsPro.oneBezier(this.start.y, this.end.y, this.t)
            }
          
        }
        this.draw = function(ctx){
            ctx.save();
            // context.translate(particle.x, particle.y);
            ctx.beginPath();
            ctx.stroke
            ctx.lineWidth =1
            ctx.fillStyle = this.getColor()
            ctx.arc(this.x,this.y,BLOCK_SIZE/2,0,2*Math.PI)
            // ctx.arc(positions[i].x, positions[i].y, 10, 10);
            ctx.fill();
            // ctx.stroke();
            ctx.restore();
        }
    }
    var texture = getTextTexture("阻止传送",140)
    var particles = getParticles(texture);
    return {
        render:function(){
            for(var i = 0;i<particles.length;i++){
                particles[i].draw(context)
            }
        },
        resize(w,h){
            width = w;
            height = h
            particles = getParticles(texture);
            this.update()
            this.render()
        },
        update:function(){
            for(var i = 0;i<particles.length;i++){
                particles[i].update(context)
            }
        }
    }
}

/**
 * 打开场景逻辑
 */
Game.on(EVENT_TYPE.OPEN_LOADED_SCENEED, function (s) {

    var sb = Game.getSceneSbRect()
    var startBg = userUtilsPro.createCvsTexture()
    Game.addNowSceneUiChild(startBg)
  
    Game.set("startBg", startBg)
    Game.set("resize",function(){
        var sb = Game.getSceneSbRect()
        var offset = 0
        if(sb.width<800){
            offset = 80
        }
        startBtn.con.x = sb.width / 2 - startBtn.con.width / 2
        startBtn.con.y = sb.height / 2 - startBtn.con.height / 2 - 40+offset
        selectBtn.con.x = sb.width / 2 - selectBtn.con.width / 2
        selectBtn.con.y = sb.height / 2 - selectBtn.con.height / 2 + 10+offset
        startBg.setCvsWidth(sb.width)
        startBg.setCvsHeight(sb.height)
    })
    var startBtn = Game.createImageButton("plist_comm_none2_btn.png", "plist_comm_none2_btn.png", "开始游戏", 150, 40,
    {
        txtOffsetY:-2
    })
    // // Game.addNowSceneUiChild(startBtn.con)
    // startBtn.con.x = sb.width / 2 - startBtn.con.width / 2
    // startBtn.con.y = sb.height / 2 - startBtn.con.height / 2 - 40
 
    startBtn.txt.style.fill=0xffffff
    var selectBtn = Game.createImageButton("plist_comm_none2_btn.png", "plist_comm_none2_btn.png", "选项", 150, 40,  {
        txtOffsetY:-2
    })
    // Game.addNowSceneUiChild(selectBtn.con)
    // selectBtn.con.x = sb.width / 2 - selectBtn.con.width / 2
    // selectBtn.con.y = sb.height / 2 - selectBtn.con.height / 2 + 10


   Game.get("resize")()
    selectBtn.txt.style.fill=0xffffff

  
    var ctx = startBg.getCtx()
    var bgControllerObj = runBg(ctx)
    bgControllerObj.resize(sb.width,sb.height)
    
    // window.bgControllerObj = bgControllerObj
    var firstAdd = false;
    var titleObj = runTitle(ctx)
    titleObj.resize(sb.width,sb.height)
    Game.set("bgControllerObj",bgControllerObj)
    Game.set("titleObj",titleObj)
    function addInfo(){
        firstAdd = true
        Game.addNowSceneUiChild(startBtn.con)
        Game.addNowSceneUiChild(selectBtn.con)
        // 初始隐藏开始按钮，代码提交通过后才显示
        if (!codePassed) {
            startBtn.con.visible = false;
        }
    }
    var timmer = Game.setIntervalGame(function(){
        ctx.clearRect( 0, 0, sb.width,sb.height );
        bgControllerObj.update();
        bgControllerObj.render()
     
        if(firstAdd){
            titleObj.update()
            titleObj.render()
        }
        startBg._update()
        if( !firstAdd&&parseInt(bgControllerObj.velocity.tx) === 0&&parseInt(bgControllerObj.velocity.ty )=== 0){
            addInfo()
        }
    },0)

    // ===== 代码提交验证系统 =====
    var codePassed = false;
    var sidebarEl = null;
    try {
        sidebarEl = document.getElementById("quiz-sidebar");
    } catch(e) {}

    if (sidebarEl) {
        sidebarEl.innerHTML = '';

        // 标题
        var gateTitle = document.createElement("h2");
        gateTitle.textContent = "📝 提交代码";
        gateTitle.style.cssText = "margin:0 0 8px;font-size:18px;color:#e94560;font-weight:bold;";
        sidebarEl.appendChild(gateTitle);

        // 题目描述
        var gateDesc = document.createElement("div");
        gateDesc.innerHTML = '<p style="margin:0 0 6px;">请编写 C++ 代码，声明一个 <code style="color:#f39c12;">int</code> 类型的变量 <code style="color:#f39c12;">towerLevel</code> 并将其初始化为 <code style="color:#f39c12;">1</code>。</p><p style="color:#aaa;font-size:12px;margin:0;">💡 提示：<code style="color:#53a8b6;">int towerLevel = 1;</code></p>';
        gateDesc.style.cssText = "margin-bottom:12px;font-size:14px;line-height:1.6;color:#e0e0e0;padding:8px;background:rgba(15,52,96,0.5);border-radius:4px;border-left:3px solid #533483;";
        sidebarEl.appendChild(gateDesc);

        // 代码输入框
        var gateTextarea = document.createElement("textarea");
        gateTextarea.id = "start-code-textarea";
        gateTextarea.placeholder = "在此输入 C++ 代码...";
        gateTextarea.spellcheck = false;
        gateTextarea.style.cssText = "width:100%;height:130px;background:#0d1117;color:#c9d1d9;border:1px solid #0f3460;padding:8px;font:13px 'Consolas','Courier New',monospace;resize:vertical;border-radius:4px;outline:none;box-sizing:border-box;line-height:1.5;";
        sidebarEl.appendChild(gateTextarea);

        // 提交按钮
        var gateSubmitBtn = document.createElement("button");
        gateSubmitBtn.textContent = "提交代码 (Ctrl+Enter)";
        gateSubmitBtn.style.cssText = "margin-top:8px;width:100%;padding:10px;background:#e94560;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;transition:background .2s;";
        gateSubmitBtn.onmouseover = function() { gateSubmitBtn.style.background = "#ff6b81"; };
        gateSubmitBtn.onmouseout = function() { gateSubmitBtn.style.background = "#e94560"; };
        sidebarEl.appendChild(gateSubmitBtn);

        // 反馈区域
        var gateFeedback = document.createElement("div");
        gateFeedback.id = "start-code-feedback";
        gateFeedback.style.cssText = "margin-top:10px;padding:10px;border-radius:4px;font-size:13px;line-height:1.5;display:none;word-break:break-word;";
        sidebarEl.appendChild(gateFeedback);

        // 通过后提示区域
        var gateSuccessHint = document.createElement("div");
        gateSuccessHint.id = "start-code-success-hint";
        gateSuccessHint.style.cssText = "margin-top:12px;padding:12px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.4);border-radius:6px;color:#2ecc71;text-align:center;font-size:14px;display:none;";
        gateSuccessHint.innerHTML = '✅ 代码验证通过！<br><span style="font-size:12px;color:#aaa;">请在右侧点击「开始游戏」进入</span>';
        sidebarEl.appendChild(gateSuccessHint);

        // 验证函数
        function validateStartCode(code) {
            // 预处理：去除注释和字符串
            var processed = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            processed = processed.replace(/"([^"\\]|\\.)*"/g, '""');
            processed = processed.replace(/'([^'\\]|\\.)*'/g, "''");
            var failures = [];
            if (processed.indexOf('int') === -1) failures.push('需要使用 int 类型声明变量');
            if (processed.indexOf('towerLevel') === -1) failures.push('变量名应为 towerLevel');
            if (processed.indexOf('=') === -1) failures.push('需要使用 = 进行初始化赋值');
            if (processed.indexOf('1') === -1) failures.push('初始值应为 1');
            return { passed: failures.length === 0, failures: failures };
        }

        // 提交处理
        var gateSubmitting = false;
        function handleGateSubmit() {
            if (gateSubmitting) return;
            var code = gateTextarea.value;
            if (!code.trim()) {
                gateFeedback.style.display = 'block';
                gateFeedback.style.background = 'rgba(231,76,60,0.15)';
                gateFeedback.style.color = '#e74c3c';
                gateFeedback.style.border = '1px solid rgba(231,76,60,0.3)';
                gateFeedback.innerHTML = '❌ 请输入代码后再提交';
                return;
            }
            gateSubmitting = true;
            gateSubmitBtn.disabled = true;
            gateSubmitBtn.textContent = "验证中...";
            gateSubmitBtn.style.background = "#888";
            gateSubmitBtn.style.cursor = "wait";

            setTimeout(function() {
                var result = validateStartCode(code);
                if (result.passed) {
                    codePassed = true;
                    gateFeedback.style.display = 'block';
                    gateFeedback.style.background = 'rgba(46,204,113,0.15)';
                    gateFeedback.style.color = '#2ecc71';
                    gateFeedback.style.border = '1px solid rgba(46,204,113,0.3)';
                    gateFeedback.innerHTML = '✅ 代码验证通过！';
                    gateSubmitBtn.disabled = true;
                    gateSubmitBtn.style.background = '#2ecc71';
                    gateSubmitBtn.textContent = '✓ 已通过';
                    gateSubmitBtn.style.cursor = 'not-allowed';
                    gateTextarea.disabled = true;
                    gateTextarea.style.opacity = '0.7';
                    gateSuccessHint.style.display = 'block';
                    // 显示开始按钮
                    startBtn.con.visible = true;
                    // 高亮闪烁提示
                    var blinkCount = 0;
                    var blinkInterval = setInterval(function() {
                        blinkCount++;
                        if (blinkCount >= 6) {
                            clearInterval(blinkInterval);
                            startBtn.con.alpha = 1;
                        } else {
                            startBtn.con.alpha = blinkCount % 2 === 0 ? 1 : 0.5;
                        }
                    }, 300);
                } else {
                    gateFeedback.style.display = 'block';
                    gateFeedback.style.background = 'rgba(231,76,60,0.15)';
                    gateFeedback.style.color = '#e74c3c';
                    gateFeedback.style.border = '1px solid rgba(231,76,60,0.3)';
                    gateFeedback.innerHTML = '❌ 请修正以下问题：<br>' + result.failures.map(function(f) { return '&#10007; ' + f; }).join('<br>');
                    gateSubmitting = false;
                    gateSubmitBtn.disabled = false;
                    gateSubmitBtn.textContent = "提交代码 (Ctrl+Enter)";
                    gateSubmitBtn.style.background = "#e94560";
                    gateSubmitBtn.style.cursor = "pointer";
                }
            }, 100);
        }

        gateSubmitBtn.onclick = handleGateSubmit;

        // Ctrl+Enter 快捷键
        gateTextarea.addEventListener("keydown", function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleGateSubmit();
            }
        });

        // 聚焦时不暂停游戏，保持游戏区域可操作
        // 键盘事件在全局处理器中已正确处理
    }
    // ===== 代码提交验证系统结束 =====

    startBtn.con.onClick = function () {
        // 安全检查：代码未通过时不允许进入
        if (!codePassed) {
            if (gateFeedback) {
                gateFeedback.style.display = 'block';
                gateFeedback.style.background = 'rgba(231,76,60,0.15)';
                gateFeedback.style.color = '#e74c3c';
                gateFeedback.style.border = '1px solid rgba(231,76,60,0.3)';
                gateFeedback.innerHTML = '⚠️ 请先在左侧提交代码，通过验证后才能开始游戏';
            }
            return;
        }
        bgControllerObj.velocity.z = 0.04
        Game.setTimeout(function(){
            Game.loadServerScene("scene/selectALevel.json")
        },500)
    }

 
    Game.set("timmer1",timmer)
})

/**
 * 改变窗口大小
 */
Game.on(EVENT_TYPE.RESIZE,function(){
    var sb = Game.getSceneSbRect()
    Game.get("bgControllerObj").resize(sb.width,sb.height)
    Game.get("titleObj").resize(sb.width,sb.height)
    Game.get("resize")()
})


/**
 * 关闭场景逻辑
 */
Game.on(EVENT_TYPE.CLOSE_SCENE, function () {
    Game.clearTimeGame(Game.get("timmer1"))
    Game.set("resize",null)
    Game.get("startBg").destroy()
    Game.destory()
})