
var MAX_NUM = 15;
/**
 * DOM完成后绑定相关的事件
 */


$(function () {    

    // ------------------------------------------------------- //
    // Sidebar
    // ------------------------------------------------------ //
    $('.sidebar-toggler').on('click', function () {
        $('.sidebar').toggleClass('shrink show');
    });
    $('[data-toggle="tooltip"]').tooltip();
 

    // 顶点到各点的最短距离
    var distances = new Array(MAX_NUM).fill(0);
    // 访问过的结点
    var visitedNodes = new Array(MAX_NUM).fill(false);

    // 连通分量辅助数组
    var nodeSet = new Array(MAX_NUM).fill(0);
    // 线
    var lineSet = [];
    // 第几步
    var step = 0;
    // 记录开头
    var head = null;
    // 记录线,线中记录着原始的距离，应是不变的
    var lines = new Array(MAX_NUM).fill(undefined).map(()=>new Array(MAX_NUM).fill(null));
    // 记录结点
    var nodes = new Array();
    var svg = Snap("#svg");
    // 记录所选结点
    var selectedNode = null;
    // 记录所选线
    var selectedLine = null;
    // 记录算法进行时所访问的线(pri, kru)
    var visitingLine = null;
    // 记录算法正在访问的结点(dij)
    var visitingNode = -1;
    var updateNodes = [];
    // 分割线
    var spliter = Snap("#spliter");
    // 结点个数
    var textNum = 0;
    var startX = 100, startY = 100;
    // 移动时所记录
    var startLines = [];
    var endLines = [];
    // 伪代码框
    var pcodes = $('.pcode').children();
    var pstep = 0;
    
   
    set_btn_listener();
    $('#example_menu').delegate('div', 'click', load_example);
    $('#help_btn').click(load_help_img);

    /**
     * 图论的三个算法
     * 在重置和开始时使用
     * 为确保只绑定一次click
     * 添加前先移除
     */
    function set_btn_listener() {
        $('#add_btn').unbind('click').click(add_btn_click).removeClass('disabled');
        $('#delete_circle_btn').unbind('click').click(delete_circle_btn_click).removeClass('disabled');
        $('#delete_line_btn').unbind('click').click(delete_line_btn_click).removeClass('disabled');
        $('#clear_btn').unbind('click').click(reset).removeClass('disabled');
        
        // dijstra
        $('#begin_dij_btn').unbind('click').click(begin_dij_btn_click);
        $('#set_head_btn').unbind('click').click(set_head_listener).removeClass('disabled');
        // prim
        $('#begin_pri_btn').unbind('click').click(begin_pri_btn_click);
        // kruskal
        $('#begin_kru_btn').unbind('click').click(begin_kru_btn_click);       
    }
   
    /**
     * 增加一个节点事件处理函数
     */
    function add_btn_click() {
        var circle = svg.circle(startX, startY, 0);
        var text = svg.text(startX, startY+5, (textNum).toString());
        circle.addClass('circle-node');
        text.addClass('circle-font');
        var g = svg.g(circle, text);
        g.data('drag_flag', false);
        g.attr('data-num', textNum);
        if (textNum === 0) {
            head = g;
        } else if (textNum >= MAX_NUM) {
            return;
        }
        // 距离表里增加一项
        add_node_to_table(textNum); 
        textNum++;
        nodes.push(g);
        g.drag(dragMove,dragStart, dragEnd).click(circle_click);
    }

    /**
     * 删除尾结点事件处理函数
     */ 
    function delete_circle_btn_click() {
        if (textNum === 0) {
            return;
        } else {            
            textNum--;
            // 删除表中最后一个元素
            $('#distance-table').children().last().remove();
            // 尾结点恰好是所选结点
            if (selectedNode === nodes[textNum]) {
                selectedNode = null;
            }
            // 尾结点恰好是顶点
            // 顶点默认变为第一个
            if (head === nodes[textNum]) {
                head = textNum === 0 ? null : nodes[0];
                reset_table();
            }

            nodes[textNum].remove();
            nodes.pop();
            // 删除结点相连的线
            for (let i = 0; i < textNum; i++) {
                if (lines[textNum][i]) {
                    lines[textNum][i].remove();
                    lines[textNum][i] = null;
                    lines[i][textNum] = null;
                }
            }
            
        }
    }

    /**
     * 删除虚线事件处理函数
     */ 

    function delete_line_btn_click() {
        if (selectedLine === null) {
            return;
        } else {
            let start = +selectedLine.attr('data-start');
            let end = +selectedLine.attr('data-end');
            selectedLine.remove();
            lines[start][end] = null;
            lines[end][start] = null;
            selectedLine = null;
            reset_table();
        }
    }

    /**
     * 清空重置
     * - 清除结点
     * - 清除线
     * - 消除表格
     * - 重新绑定按钮事件
     * - 去除上一步下一步按钮
     * - 重置状态
     * - 取消高亮
     */
    function reset() {    
        for (let i = 0; i < textNum; i++) {
            nodes[i].remove();
            for (let j = 0; j < textNum; j++) {
                if (lines[i][j]) {
                    lines[i][j].remove();
                }
            }
        }
        $('#distance-table').children().remove();
        set_btn_listener();
        remove_last_and_next_listener();   
        distances = new Array(MAX_NUM).fill(0);
        visitedNodes = new Array(MAX_NUM).fill(false);
        nodeSet = new Array(MAX_NUM).fill(0);
        lineSet = [];
        step = 0;
        head = null;
        lines = new Array(MAX_NUM).fill(undefined).map(()=>new Array(MAX_NUM).fill(null));
        nodes = new Array();
        selectedNode = null;
        selectedLine = null;
        textNum = 0;
        updateNodes = [];
        pcode_highligt_at(-1);
    }

    /**
     * 选中结点后设置顶点
     *  - 更新距离表
     */
    function set_head_listener() {

        if (selectedNode === null) {
            return;
        } else {
            head = selectedNode;
            step = 0;
            reset_table();
        }
    }

    /**
     * 允许中断算法，对图进行修改
     * 但算法状态重置
     * 
     * - 去除点和线的样式
     * - 添加点和线的点击事件
     * - 去除下一步和上一步的事件处理
     */
    function modify_graph() {
  
        nodes.forEach(item => {
            item.click(circle_click);
            item[0].removeClass('visited').removeClass('visiting').removeClass('update');
        })
        get_line_set();
        lineSet.forEach(item => {
            item.click(line_click);
            item[0].removeClass('connect').removeClass('not-select').removeClass('update');
        })
        add_listener();
        remove_last_and_next_listener();
        selectedNode = null;
        selectedLine = null;
        step = 0;
        visitedNodes = new Array(MAX_NUM).fill(false);
        nodeSet = new Array(MAX_NUM).fill(0);
        updateNodes = [];
        reset_table();
        pcode_highligt_at(-1);
        // 之后移除这个按钮的事件
        $('#modify_btn').unbind('click');
    }

    /**
     * 监听backspace
     * keypress不能监听
     */
    $(document).keydown(function(e) {
        //console.log(event.keyCode);
        if (event.keyCode === 8) {
            if (selectedLine) {
                if (selectedLine.data('first_click')) {
                    // 第一次按
                    selectedLine.data('first_click', false);
                    selectedLine[1].node.innerHTML = '0';
                    selectedLine.attr('data-distance', 0);
                } else {
                    let s = selectedLine[1].node.innerHTML;
                    let str = s.substr(0, s.length-1);
                    if (str) {
                        selectedLine[1].node.innerHTML = str;
                        selectedLine.attr('data-distance', +str);
                    } else {
                        // 为空
                        selectedLine[1].node.innerHTML = '0';
                        selectedLine.attr('data-distance', 0);
                    }
                }
                // 更新表
                let head_num = +head.attr('data-num');
                let start = +selectedLine.attr('data-start');
                let end = +selectedLine.attr('data-end');
                if (start === head_num || end === head_num) {
                    let table_tr = $('#distance-table').find('td');
                    if(table_tr.length) {
                        table_tr[start === head_num ? end : start].innerHTML = selectedLine.attr('data-distance');
                    }  
                }  
            }
        }
    })

    /**
     * 监测键盘输入
     * 这里是对数字0-9的监听
     */
    $(document).keypress(function(e) {
        //console.log(event.keyCode);
        let num = event.keyCode - 48;
        if (selectedLine === null || num < 0 || num > 9) {
            return;
        } else {
            if (selectedLine.data('first_click')) {
                // 重置数字
                selectedLine.data('first_click', false);
                selectedLine[1].node.innerHTML = num.toString();
                selectedLine.attr('data-distance', num);
            } else {
                // 接着输入
                if(selectedLine[1].node.innerHTML === '0') {
                    selectedLine[1].node.innerHTML = num.toString();
                } else {
                    selectedLine[1].node.innerHTML += num;
                }
                selectedLine.attr('data-distance', parseInt(selectedLine[1].node.innerHTML));
            }
            // 更新表
            let head_num = +head.attr('data-num');
            let start = +selectedLine.attr('data-start');
            let end = +selectedLine.attr('data-end');
            if (start === head_num || end === head_num) {
                let table_tr = $('#distance-table').find('td');
                if(table_tr.length) {
                    table_tr[start === head_num ? end : start].innerHTML = selectedLine.attr('data-distance');
                }  
            }  
        }
        
    })

    /**
     * 结点点击事件
     * 若判定为拖拉，就不要继续处理
     * 若已点一次，则取消点击
     * 若已点了别的点，则新增连线
     */
    function circle_click(e) {
        //console.log(this.data('drag_flag'))
        if (this.data('drag_flag')) {
            e.stopPropagation();
            this.data('drag_flag', false);
            return;
        }
        if (this === selectedNode) {
            //取消点击
            selectedNode = null;
            this[0].toggleClass('select')
           
        } else {
            if (selectedNode !== null) {
                
                let x = +selectedNode.attr('data-num');
                let y = +this.attr('data-num');
                if (lines[x][y]) {
                    // 已存在连线
                    return;
                } else {
                    //新增连线
                    console.log('add line');
                    let x1 = parseInt(selectedNode[0].attr('cx'));
                    let y1 = parseInt(selectedNode[0].attr('cy'));
                    let x2 = parseInt(this[0].attr('cx'));
                    let y2 = parseInt(this[0].attr('cy'));
                    var l = svg.paper.line(x1, y1, x2, y2).addClass("line");
                    let angle = Math.floor(Snap.angle(x2,y2,x1,y1));
                    let rad = Snap.rad(angle);
                    //console.log(angle)
                    // 新增默认距离
                    let sign = (90 < angle && angle < 270) ? -1 : 1;
                    let x3 = (x1+x2)/2+8*Math.sin(rad)*sign;
                    let y3 = (y1+y2)/2-8*Math.cos(rad)*sign;
                    let newAngle = (sign === -1) ? angle-180 : angle;
                    var d = svg.text(x3, y3, '1').attr({
                        transform: `rotate(${newAngle} ${x3},${y3})`
                    })
                    d.addClass('line-font');
                    var g = svg.g(l, d);
                    g.insertBefore(spliter);
                    let start = +selectedNode.attr('data-num');
                    let end = +this.attr('data-num');
                    g.attr("data-start", start).attr("data-end", end).attr("data-distance", 1).data("first_click", false);
                    lines[start][end] = lines[end][start] = g;
                    g.click(line_click);
                    // 更新距离
                    let head_num = +head.attr('data-num');
                    if (start === head_num || end === head_num) {
                        let table_tr = $('#distance-table').find('td');
                        if (table_tr.length) {
                            table_tr[start === head_num ? end : start].innerHTML = 1;
                        }        
                    }                
                }
                selectedNode[0].toggleClass('select');
                selectedNode = null;
            } else {
                //点击选中
                console.log('click');
                selectedNode = this;
                this[0].toggleClass('select')
            }
        }
        
    }
    /**
     * 开始拉动，记录位置
     * @param {鼠标x} x 
     * @param {鼠标y} y 
     * @param {事件} evt 
     */
    function dragStart(x, y, evt) {
        startX = parseInt(this[0].attr('cx'));
        startY = parseInt(this[0].attr('cy'));
        let n = +this.attr('data-num');
        startLines = []; // 保存x1、y1为移动点的线
        endLines = []; // 保存x2、y2为移动点的线
        for (let i = 0; i < textNum; i++){
            if (lines[n][i] == null) {
                continue;
            } else {
                let l = lines[n][i];
                if (l[0].attr('x1') == startX && l[0].attr('y1') == startY) {
                    startLines.push(l);
                }
                if (l[0].attr('x2') == startX && l[0].attr('y2') == startY) {
                    endLines.push(l);
                }
            }
        }
        
    }
    /**
     * 位移时说明不是点击
     * @param {水平位移} dx 
     * @param {垂直位移} dy 
     * @param {事件} evt 
     */
    function dragMove(dx, dy, x, y, evt) {
        let newX = startX + dx;
        let newY = startY + dy;
        
        if (newX < 0) {
            newX = 0;
        }
        if (newX > 640) {
            newX = 640;
        }

        if (newY > 360) {
            newY = 360;
        }
        
        if (newY < 0) {
            newY = 0;
        }

        startLines.forEach((item) => {
            item[0].attr({x1: newX, y1: newY});
            let x2 = parseInt(item[0].attr('x2'));
            let y2 = parseInt(item[0].attr('y2'));
            let angle = Math.floor(Snap.angle(x2,y2,newX,newY));
            let rad = Snap.rad(angle);
            //console.log(angle);
            let sign = (90 < angle && angle < 270) ? -1 : 1;
            let x3 = (newX+x2)/2+8*Math.sin(rad)*sign;
            let y3 = (newY+y2)/2-8*Math.cos(rad)*sign;
            let newAngle = (sign === -1) ? angle+180 : angle;
            item[1].attr({
                x: x3,
                y: y3,
                transform: `rotate(${newAngle} ${x3},${y3})`
            })
        })
        endLines.forEach((item) => {
            item[0].attr({x2: newX, y2: newY})
            let x1 = parseInt(item[0].attr('x1'));
            let y1 = parseInt(item[0].attr('y1'));
            let angle = Math.floor(Snap.angle(newX,newY,x1,y1));
            let rad = Snap.rad(angle);
            //console.log(angle)
            let sign = (90 < angle && angle < 270) ? -1 : 1;
            let x3 = (x1+newX)/2+8*Math.sin(rad)*sign;
            let y3 = (y1+newY)/2-8*Math.cos(rad)*sign;
            let newAngle = (sign === -1) ? angle-180 : angle;
            item[1].attr({
                x: x3,
                y: y3,
                transform: `rotate(${newAngle} ${x3},${y3})`
            })
        })
        
        this[0].attr({cx: newX, cy: newY});
        this[1].attr({x: newX, y: (newY+5)});      
        this.data('drag_flag', true)
    }

    function dragEnd(e) {
        startX = 100;
        startY = 100;
    }

    /**
     * 选中一条线
     */

    function line_click() {
        this[0].toggleClass('select');
        this[1].toggleClass('select')
        // 取消点击
        if (this === selectedLine) {
            selectedLine = null;
        } else {
            // 点了第二条线
            if (selectedLine !== null) {
                selectedLine[0].toggleClass('select');
                selectedLine[1].toggleClass('select');
            }
            selectedLine = this;
            // 第一次点，输入数据时重置
            selectedLine.data('first_click', true);
        }
    }

    /**
     * 添加一项时，向表里增加
     * @param {第几项} num 
     */
    function add_node_to_table(num) {
        var table = $("#distance-table");
        var html = '<tr><th>' +  num;
        if (num !== 0) {
            html += '</th><td>&infin;</td></tr>';
        } else {
            html += '<span class=\'header\'>header</span></th><td>0</td></tr>';
        }
        table.html(table.html()+html);
    }

    /**
     * 更新距离表
     * 在设置顶点和开始算法和删除虚线和修改现图时用到
     * 
     * - 初始化数据距离表和视图距离表
     * - 初始化所有结点为未访问
     * - 初始化访问列表
     * - 删除访问样式
     */
    function reset_table() {
        if (textNum === 0) return;
        var table_tr = $('#distance-table').find('tr');
        if (table_tr.length === 0) return;
        let head_num = +head.attr('data-num');
        for (let i = 0; i < textNum; i++) {
            // 距离表初始化为0，因此不用管
            if (head_num === i) {
                table_tr[i].innerHTML = `<th>${i}<span class='header'>header</span></th><td>0</td>`;
                continue;
            }
            visitedNodes[i] = false;
            nodes[i][0].removeClass('visited').removeClass('visiting');
            if (lines[head_num][i] === null) {
                distances[i] = Number.MAX_SAFE_INTEGER;
                table_tr[i].innerHTML = `<th>${i}</th><td>&infin;</td>`;
            } else {
                distances[i] = +lines[head_num][i].attr('data-distance');
                table_tr[i].innerHTML = `<th>${i}</th><td>${distances[i]}</td>`;
            }   
        }
    }

    /**
     * 算法开始前得到线的一维数组
     */
    function get_line_set() {
        let lSet = new Set();
        for (let i = 0; i < textNum; i++) {
            for (let j = 0; j < textNum; j++) {
                if (lines[i][j]) {
                    lSet.add(lines[i][j]);
                    lines[i][j][0].removeClass('connect').removeClass('visiting').removeClass('visited');
                }      
            }
        }
        lineSet = [...lSet];
    }
    /**
     * dijstra
     * 算法开始事件处理函数
     */
    function begin_dij_btn_click() {
        // 没有结点
        if (head === null) {
            return;
        } else {
            var head_num = +head.attr('data-num');
            head[0].addClass('visited');
            visitedNodes[head_num] = true;
        }
        // 删除所有选中的
        if (selectedNode !== null) {
            selectedNode[0].removeClass('select');
            selectedNode = null;
        }
        if (selectedLine !== null) {
            selectedLine[0].removeClass('select');
            selectedLine[1].removeClass('select');
            selectedLine = null;
        }
        get_line_set();
        remove_listener();
        $('#last_dij_btn').unbind('click').click(last_dij_step).removeClass('disabled');
        $('#next_dij_btn').unbind('click').click(next_dij_step).removeClass('disabled');
        $('#modify_btn').unbind('click').click(modify_graph).removeClass('disabled');
        // 上一步时
        if (updateNodes.length) {
            updateNodes.forEach(i => {
                nodes[i][0].removeClass('update');
                lines[visitingNode][i][0].removeClass('update');
            })
        }
        step = 0;
        updateNodes = [];
        reset_table();
        pcode_highligt_at(1);    
    }

    /**
     * dijstra
     * 执行算法的下一步
     */
    function next_dij_step() {
        // 下一步是更新距离表
        // 添加标签 “update”
        // 修改标签 “visiting->visited”
        if (pstep === 2) {
            let s = visitingNode;
            let table_tr = $('#distance-table').find('tr');
            nodes[s][0].removeClass('visiting').addClass('visited');
            var head_num = +head.attr('data-num');
            let m = Number.MAX_SAFE_INTEGER;
            for (let j = 0; j < textNum; j++) {
                if (!visitedNodes[j] && lines[s][j] && distances[j] - (+lines[s][j].attr('data-distance')) > distances[s]) {
                    let dist = distances[s] + (+lines[s][j].attr('data-distance'));
                    let th = `<th>${j}<span class='update'>update</span></th>`;
                    let td = `<td>${distances[j]===m?'&infin;':distances[j]}&rarr;${distances[s]}+${(+lines[s][j].attr('data-distance'))}=${dist}</td>`
                    distances[j] = dist;
                    table_tr[j].innerHTML = th + td;
                    lines[s][j][0].addClass('update');
                    nodes[j][0].addClass('update');
                    updateNodes.push(j);
                } else if (visitedNodes[j] && j !== head_num ) {
                    let str = `<th>${j}<span class='visited'>visited</span></th><td>${distances[j]}</td>`;
                    table_tr[j].innerHTML = str;
                }
            }
            pcode_highligt_at(3);
            return;
        } else if (pstep === 4) {
            return;
        }
        
        let table_tr = $('#distance-table').find('tr');
        updateNodes.forEach(item => {
            table_tr[item].innerHTML = `<th>${item}</th><td>${distances[item]}</td>`;
            nodes[item][0].removeClass('update');
            lines[item][visitingNode][0].removeClass('update')
        })
        let next_node = -1;
        let min = Number.MAX_SAFE_INTEGER;
        updateNodes = [];
        for (let j = 0; j < textNum; j++) {
            if (!visitedNodes[j] && distances[j] <= min) {
                min = distances[j];
                next_node = j;
            }
        }
        if (next_node !== -1) {
            pcode_highligt_at(2);
            visitingNode = next_node;   
            table_tr[next_node].innerHTML = `<th>${next_node}<span class='visiting'>visiting</span></th><td>${distances[next_node]}</td>`;
            nodes[next_node][0].addClass('visiting');
            visitedNodes[next_node] = true;
            // 更新
            step++;
        } else {
            pcode_highligt_at(4);
        }
    }

    /**
     * dijstra
     * 回到算法的前一步
     */
    function last_dij_step() {
        let n = --step;
        begin_dij_btn_click();  
        while(step < n) {
            next_dij_step();
        }

    }
    /**
     * 检查是否连通
     */
    function check_if_graph_connect() {
        if (textNum <= 1) {
            return false;
        }
        // 记录线
        get_line_set();
        // 判断是否是完全连通
        let connectFlag = new Array(textNum).fill(false);
        lineSet.forEach((item) => {
            connectFlag[+item.attr('data-start')] = true;
            connectFlag[+item.attr('data-end')] = true;
        })
        if(!connectFlag.every(item => item)) {         
            return false;
        }
        return true;
    }

    /**
     * 伪代码高亮
     * @param {第几步高亮}} step 
     */
    function pcode_highligt_at(step) {
        if (step >= pcodes.length) return;
        if (step === -1) {
            if (pstep !== -1) {
                $(pcodes[pstep]).removeClass('select');
            }
            pstep = -1;
            return;
        }
        if (pstep === -1) {
            pstep = step;
            $(pcodes[pstep]).addClass('select');
        } else {
            $(pcodes[pstep]).removeClass('select');
            pstep = step;
            $(pcodes[pstep]).addClass('select');
        }
        
    }

    /**
     * prim
     * 算法开始事件处理函数
     */
    function begin_pri_btn_click() {
        step = 0;
        if(!check_if_graph_connect()) {
            alert('存在未连通的结点');
            return;
        }
        // 去除按钮
        remove_listener();
        // 点了开始后才能点下一步上一步
        $('#next_pri_btn').unbind('click').click(next_pri_step).removeClass('disabled');
        $('#last_pri_btn').unbind('click').click(last_pri_step).removeClass('disabled');
        // 点了开始后才能点击修改原图按钮
        $('#modify_btn').unbind('click').click(modify_graph).removeClass('disabled');
        // 删除所有选中的
        if (selectedNode !== null) {
            selectedNode[0].removeClass('select');
            selectedNode = null;
        }
        if (selectedLine !== null) {
            selectedLine[0].removeClass('select');
            selectedLine[1].removeClass('select');
            selectedLine = null;
        }
        
        // 随机选一个点
        let randNum = Math.floor(Math.random()*textNum);
        head = nodes[randNum];
        visitedNodes.fill(false);
        visitedNodes[randNum] = true;
        nodes.forEach(item => {
            item[0].removeClass('visited').removeClass('visiting');
            if (item === head) {
                item[0].addClass('visiting');
            }
        })
        lineSet.forEach(item => {
            item[0].removeClass('not-select').removeClass('connect').removeClass('visited').removeClass('visiting');
        })
        pcode_highligt_at(1);
    }


    /**
     * prim
     * 执行算法的下一步
     */
    function next_pri_step() {
        
        lineSet.forEach(item => {
            if (item[0].hasClass('visiting')) {
                item[0].removeClass('visiting').addClass('connect');
            }
            if (item[0].hasClass('not-select')) {
                item[0].removeClass('not-select');
            }
        })
        // 记录是否是合并的步骤
        let flag = false;
        nodes.forEach(item => {
            if (item[0].hasClass('visiting')) {
                flag = true;
                item[0].removeClass('visiting').addClass('visited');
            }
        })
        if (step === textNum - 1 && !flag) {
            // 最后一步
            lineSet.forEach(item => {
                if (!item[0].hasClass('connect')) {
                    item[0].addClass('visited');
                }
            })
            pcode_highligt_at(5);
            return;
        }
        if (flag) {
            step === 0 && pcode_highligt_at(2);
            step !== 0 && pcode_highligt_at(4);
            return;
        } else {
            pcode_highligt_at(3);
        }
        
        
        let nextLine = null;
        // 保存符合条件的线，但不是最短的
        let nextlines = [];
        lineSet.forEach((item,index) => {
            let start = +item.attr('data-start');
            let end = +item.attr('data-end');
            if (visitedNodes[start] ^ visitedNodes[end]) {
                // 这些是可选的
                nextlines.push(item);
                // 选出最短的
                if (nextLine === null) {
                    nextLine = item;         
                } else {
                    if (+item.attr('data-distance') < +nextLine.attr('data-distance')) {
                        nextLine = item;
                    }
                }
            }
        })
        let start = +nextLine.attr('data-start');
        let end = +nextLine.attr('data-end');
        nextLine[0].addClass('visiting');
        if (visitedNodes[start]) {
            // 说明end是新增的一端
            visitedNodes[end] = true;
            nodes[end][0].addClass('visiting');
        } else {
            visitedNodes[start] = true;
            nodes[start][0].addClass('visiting');
        }

        nextlines.forEach(item => {
            if (item !== nextLine) {
                item[0].addClass('not-select');
            }
        })

        step++;
    }

    /**
     * prim
     * 回到算法的前一步
     * 重置所有参数
     */
    function last_pri_step() {
        let s = step-1;
        step = 0;
        visitedNodes.fill(false);
        nodes.forEach(item => {
            item[0].removeClass('visited').removeClass('visiting');
        })
        get_line_set();
        let head_num = +head.attr('data-num');
        lineSet.forEach(item => {
            item[0].removeClass('not-select').removeClass('connect').removeClass('visited').removeClass('visiting');
            if (item.attr('data-start') === head_num || item.attr('data-end') === head_num) {
                item[0].addClass('not-select');
            }
        })
        visitedNodes[head_num] = true;
        head[0].addClass('visiting');
        while(step < s) {
            next_pri_step();
        }
        next_pri_step();
        pcode_highligt_at(2);
    }

    /**
     * kruskal
     * 算法开始事件处理函数
     */
    function begin_kru_btn_click() {

        step = 0;
    
        // 记录线，用于排序
        if(!check_if_graph_connect()) {
            alert('存在未连通的结点');
            return;
        }
        // 去除一些事件处理函数
        remove_listener();
        // 点击开始后才可以点击下一步和上一步
        $('#next_kru_btn').unbind('click').click(next_kru_step).removeClass('disabled');
        $('#last_kru_btn').unbind('click').click(last_kru_step).removeClass('disabled');
        // 点击开始后才可以修改原图
        $('#modify_btn').unbind('click').click(modify_graph).removeClass('disabled');

        // 对线进行排序
        lineSet.sort((a, b) => {
            return +a.attr('data-distance') - (+b.attr('data-distance'));
        })
        
        // 删除所有选中的
        if (selectedNode !== null) {
            selectedNode[0].removeClass('select');
            selectedNode = null;
        }
        if (selectedLine !== null) {
            selectedLine[0].removeClass('select');
            selectedLine[1].removeClass('select');
            selectedLine = null;
        }
        // 将每个点形成自身分量 
        for (let i = 0; i < textNum; i++) {
            nodeSet[i] = i;
            nodes[i][0].removeClass('visited').removeClass('visiting');
        }
        visitingLine = null;
        pcode_highligt_at(0);
        //next_kru_step();
    }

    /**
     * kruskal
     * 执行算法的下一步
     * 
     */
    function next_kru_step() {
        if (pstep === 1) {
            let x = nodeSet[+visitingLine.attr('data-start')];
            let y = nodeSet[+visitingLine.attr('data-end')]; 
            nodes[+visitingLine.attr('data-start')][0].removeClass('visiting').addClass('visited');
            nodes[+visitingLine.attr('data-end')][0].removeClass('visiting').addClass('visited');
            // 处于不同的连通分量
            if (x != y) {
                visitingLine[0].removeClass('visiting').addClass('connect');
                pcode_highligt_at(2);
                // 将统一连通
                nodeSet = nodeSet.map((item)=> item===x ? y : item);  
            } else {
                visitingLine[0].removeClass('visiting').addClass('visited');
                pcode_highligt_at(3);
            }
            
            return;
        }
        if(step < lineSet.length) {
            visitingLine = lineSet[step];
            visitingLine[0].addClass('visiting');
            nodes[+visitingLine.attr('data-start')][0].removeClass('visited').addClass('visiting');
            nodes[+visitingLine.attr('data-end')][0].removeClass('visited').addClass('visiting');
            pcode_highligt_at(1);
            step++;  
        } else if (step === lineSet.length) {
            // 结束
            // 这里是为了返加上一步时能够到最后一条线
            step++;
            pcode_highligt_at(4);
        }
    }

    /**
     * kruskal
     * 回到算法的前一步
     */
    function last_kru_step() {
        let s = step - 1;
        step = 0;
        visitingLine = null;
        pcode_highligt_at(0);
        lineSet.forEach(item => {
            item[0].removeClass('connect').removeClass('visiting').removeClass('visited');
        })
        for (let i = 0; i < textNum; i++) {
            nodeSet[i] = i;
            nodes[i][0].removeClass('visited').removeClass('visiting');
        }
        while(step < s) {
            next_kru_step();
        }
        
    }

    /**
     * 算法开始后
     * - 不能修改结点
     *      - 不允许增加
     *      - 不允许删除
     *      - 不允许设置起点
     *      - 不允许点中
     * - 不允许修改距离值
     *      - 不允许选中
     *      - 允许移动
     */
    function remove_listener() {
        $('#add_btn').unbind('click').addClass('disabled');
        $('#delete_circle_btn').unbind('click').addClass('disabled');
        $('#delete_line_btn').unbind('click').addClass('disabled');
        
        $('#set_head_btn').unbind('click').addClass('disabled');
        nodes.forEach(item => {
            item.unclick();
        })
        lineSet.forEach(item => {
            item.unclick();
        })   
    }

    /**
     * 重新添加按钮
     * 
     * 在导入图例、修改图时使用
     */
    function add_listener() {
        $('#add_btn').unbind('click').click(add_btn_click).removeClass('disabled');
        $('#delete_circle_btn').unbind('click').click(delete_circle_btn_click).removeClass('disabled');
        $('#delete_line_btn').unbind('click').click(delete_line_btn_click).removeClass('disabled');      
        $('#set_head_btn').unbind('click').click(set_head_listener).removeClass('disabled');
        
    }

    /**
     * 取消上一步和下一步按钮
     * 
     * 在导入图例、修改图时使用
     */
    function remove_last_and_next_listener() {
        $('#last_pri_btn').unbind('click').addClass('disabled');     
        $('#next_pri_btn').unbind('click').addClass('disabled');            
        $('#last_kru_btn').unbind('click').addClass('disabled');     
        $('#next_kru_btn').unbind('click').addClass('disabled');       
        $('#last_dij_btn').unbind('click').addClass('disabled');     
        $('#next_dij_btn').unbind('click').addClass('disabled');
    }

    /**
     * 点击后示例后，加载相应资源
     * 
     */
    function load_example(e) {
        let file_name = e.target.dataset.source;
        Snap.load(`./static/${file_name}`, function(graph) {
            // 删除子元素
            this.children().forEach(item => {
                item.remove()
            })
            // 初始化数据
            distances = new Array(MAX_NUM).fill(0);
            visitedNodes = new Array(MAX_NUM).fill(false);
            nodeSet = new Array(MAX_NUM).fill(0);
            lineSet = [];
            step = 0;
            lines = new Array(MAX_NUM).fill(undefined).map(()=>new Array(MAX_NUM).fill(null));
            nodes = new Array();
            selectedNode = null;
            selectedLine = null;
            textNum = 0;
            head = null;
            $("#distance-table").html('');
            // graph.node是documentfragment类型
            // 构造新图   
            graph.node.childNodes.forEach(item => {
                item = Snap(item)
                if (item.attr('data-distance')) {
                    let distance = +item.attr('data-distance');
                    let start = +item.attr('data-start');
                    let end = +item.attr('data-end');
                    //console.log(start, end);
                    let g = svg.paper.g(item.children()[0], item.children()[1]);
                    g.attr('data-distance', distance).attr('data-end', end).attr('data-start', start).data('first_click', false).click(line_click);
                    lines[start][end] = g;
                    lines[end][start] = g;
                    
                } else if (item.attr('data-num')) {
                    add_node_to_table(textNum); 
                    textNum++;
                    let n = +item.attr('data-num');    
                    let g = svg.paper.g(item.children()[0], item.children()[1]);
                    g.attr('data-num', n).click(circle_click).drag(dragMove, dragStart, dragEnd);
                   
                    nodes.push(g);
                } else {       
                    // 先复制一份
                    // 不然导致documentfragment更新
                    // 遍历出错
                    let c = item.clone()
                    if (c.type === 'line') {
                        spliter = c;
                    }
                    
                    svg.append(c);
                }
            })
            head = nodes[0];
            reset_table();
            // 恢复一些按钮的状态
            add_listener();
            remove_last_and_next_listener();
        }, svg);     
    }

     /**
     * 实现图片懒加载
     * 当点击“帮助”时才加载图片
     */
    function load_help_img() { 
        let imgs = $('.help')
        for (let i = 0; i < imgs.length; i++) {
            if ($(imgs[i]).attr('src')) {
                continue;
            } else {
                $(imgs[i]).attr('src',imgs[i].dataset.src)
            }
        }
        
    }
    
});


// Cookies.set('active', 'true');
