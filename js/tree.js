var MAX_NUM = 7; //A-G一共7个
var SPACEX = 53; // 距离
var SPACEY = 49; // 距离
/**
 * 树结点
 * @param {对应数目} num 
 * @param {左结点} left 
 * @param {右结点} right 
 * @param {子树的深度} depth 
 * @param {序号，对应x坐标} order
 * @param {层号，对应y坐标} layer
 * @param {字母} letter
 * @param {对应svg的实体} g
 */
class treeNode{
    constructor(num, left, right, depth) {
        this.num = num;
        this.left = left;
        this.right = right;
        this.depth = depth;
    }
    /**
     * 在画纸中创建结点
     * @param {画纸} svg 
     * @param {分界线} spliter 
     * @param {居中X偏移量} offsetX 
     * @param {居中Y偏移量} offsetY 
     */
    create_node(svg, spliter, offsetX, offsetY) {
        //console.log(this.order, this.layer, this.letter);
        let x = (this.order + offsetX) * SPACEX + 30;
        let y = (this.layer + offsetY) * SPACEY + 30;
        let circle = svg.paper.circle(x, y, 0).addClass('huffman-node');
        let text = svg.paper.text(x, y+5, (this.num).toString()).addClass('huffman-font');
        let g = svg.g(circle, text);
        if (this.letter) {
            let letter = svg.paper.text(x+35, y+15, this.letter).addClass('huffman-letter');
            g.add(letter);
        }
        g.insertAfter(spliter);
        this.g = g;
    }

    /**
     * 在画纸中创建线条
     * @param {画纸} svg 
     * @param {分界线} spliter 
     */
    create_line(svg, spliter) {
        let x = +this.g[0].attr('cx');
        let y = +this.g[0].attr('cy');
        let x1 = +this.left.g[0].attr('cx');
        let y1 = +this.left.g[0].attr('cy');
        let x2 = +this.right.g[0].attr('cx');
        let y2 = +this.right.g[0].attr('cy');
        this.left_line = svg.paper.line(x,y,x1,y1).addClass('line').insertBefore(spliter);
        this.right_line = svg.paper.line(x,y,x2,y2).addClass('line').insertBefore(spliter);
       
        let angle = Math.floor(Snap.angle(x,y,x1,y1));
        let rad = Snap.rad(angle);
        let sign = (90 < angle && angle < 270) ? -1 : 1;
        let x3 = (x1+x)/2+8*Math.sin(rad)*sign;
        let y3 = (y1+y)/2-8*Math.cos(rad)*sign;
        let newAngle = (sign === -1) ? angle-180 : angle;
        this.left_text = svg.text(x3, y3, '0').attr({
            transform: `rotate(${newAngle} ${x3},${y3})`
        }).addClass('line-font hidden');
        
        angle = Math.floor(Snap.angle(x,y,x2,y2));
        rad = Snap.rad(angle);
        sign = (90 < angle && angle < 270) ? -1 : 1;
        x3 = (x2+x)/2+8*Math.sin(rad)*sign;
        y3 = (y2+y)/2-8*Math.cos(rad)*sign;
        newAngle = (sign === -1) ? angle-180 : angle;
        this.right_text = svg.text(x3, y3, '1').attr({
            transform: `rotate(${newAngle} ${x3},${y3})`
        }).addClass('line-font hidden');
     
    }
    /**
     * 非叶结点进行隐藏
     */
    hide() {
        this.g[0].removeClass('select').removeClass('visited').addClass('hidden');
        this.g[1].addClass('hidden');
        this.left_line.removeClass('connect').removeClass('visited').addClass('hidden');
        this.left_text.addClass('hidden');
        this.right_text.addClass('hidden');
        this.right_line.removeClass('connect').removeClass('visited').addClass('hidden');
        this.left.g[0].removeClass('select').removeClass('visited');
        this.right.g[0].removeClass('select').removeClass('visited');
        // 原先是visited的
        if(this.left.left_line && this.left.left_line.hasClass('visited')) {
            this.left.g[0].addClass('visited');
        }
        if(this.right.right_line && this.right.right_line.hasClass('visited')) {
            this.right.g[0].addClass('visited');
        }
        return this;
    }

    /**
     * 非叶结点进行显示
     */
    show() {
        this.g[0].removeClass('hidden');
        this.g[1].removeClass('hidden');
        this.left_line.removeClass('hidden');
        this.right_line.removeClass('hidden');
        return this;
    }

    /**
     * 高亮
     * this结点是新合成的
     * 
     * 非叶结点本身
     * 左右结点
     * 左右线
     * 
     * 表示当前访问的结点
     * 
     */
    hight_light() {
        this.g[0].removeClass('visited').addClass('select');
        this.left_line.removeClass('visited').addClass('connect');
        this.right_line.removeClass('visited').addClass('connect');
        this.left.g[0].removeClass('visited').addClass('select');
        this.right.g[0].removeClass('visited').addClass('select');
        return this;
    }
    /**
     * 去高亮
     * this结点是已存在的
     * 
     * 表示已经访问过
     */
    darken() {
        this.g[0].removeClass('select').removeClass('visited');
        this.left_line.removeClass('connect').addClass('visited');
        this.right_line.removeClass('connect').addClass('visited');
        this.left.g[0].addClass('visited');
        this.right.g[0].addClass('visited');
        return this;
    }

    /**
     * 完成过后，呈现整棵树
     * 没有其他标记
     */
    normalize() {
        this.g[0].removeClass('select').removeClass('visited').removeClass('hidden');
        this.g[1].removeClass('hidden');
      
        if(this.left_line) {
            this.left_text.removeClass('hidden');
            this.left_line.removeClass('connect').removeClass('visited').removeClass('hidden');
        }
        if(this.right_line) {
            this.right_text.removeClass('hidden');
            this.right_line.removeClass('connect').removeClass('visited').removeClass('hidden');
        }
        return this;
    }

    /**
     * 非叶结点，去除分支上的0和1
     * 去除0和1
     */
    hide_code() {
        this.left_text.addClass('hidden');
        this.right_text.addClass('hidden');
        return this;
    }

}


$(function() {
    // ------------------------------------------------------- //
    // Sidebar
    // ------------------------------------------------------ //
    $('.sidebar-toggler').on('click', function () {
        $('.sidebar').toggleClass('shrink show');
    });
    $('[data-toggle="tooltip"]').tooltip();

    $('#range-input').delegate('input', 'input', change_range);
    $('#num-input').delegate('input', 'focus', focus_num_input);
    $('#num-input').delegate('input', 'change', change_num);
    $('#begin_huff_btn').click(begin_btn_pressed);
    $('#example_menu').delegate('div','click',load_example);
    
    var screen = $('#computer'); // 虚拟电脑屏幕
    var svg = Snap("#svg");
    var spliter = Snap('#spliter');
    var ranges = $('#range-input').children(); // 进度条
    var inputs = $('#num-input').children(); // 进度条对应的数字
 
    var head = null; // 顶点
    var nodeSet = []; // 目前结点
    var order = 0; // 中序遍历的序号，对应x坐标
    var nodes = []; // 叶结点
    var nodeOrder = []; // 按照构造顺序，保存非叶结点
    var nodeQueue = []; // 用于广度遍历，得到y坐标
    var step = 0; // 当前步数
    var state = 0; // 0表示尚未开始 1表示已开始 2表示要重新开始
    var darkFlag = false; // false表示要暗化
    /**
     * 点击进度条
     */
    function change_range(e) {
        let index = $(this).index();
        let value = +e.target.value;
        if (value === 100) {
            value -= 1;
        }
        inputs[index].value = value;
        // 修改了权重，图无效
        state = 2;
        $('#last_huff_btn').addClass('disabled').unbind('click');
        $('#next_huff_btn').addClass('disabled').unbind('click');
    }

    /**
     * onfocus
     * 不允许通过键盘输入
     */
    function focus_num_input() {
        this.blur();
    }

    /**
     * 点击数目加减
     */
    function change_num(e) {
        let index = $(this).index();
        let value = e.target.value;
        ranges[index].value = value;
        // 修改了权重，图无效
        state = 2;
        $('#last_huff_btn').addClass('disabled').unbind('click');
        $('#next_huff_btn').addClass('disabled').unbind('click');
    }

    /**
     * 按下开始键
     * 
     * 状态
     * 0: 算法未开始，图上没有任何东西，按下后将创建
     * 1: 算法已开始，图上有结点，按下将重新开始
     * 2: 因为修改了文字的原因，图中结点无效，按下将清除原先的状态和结点，再重新开始
     */
    function begin_btn_pressed() {
        if (state === 0) {
            if(cal_huffman_tree()){
                state = 1;
            }
        } else if (state === 1) {
            step = 0;
            darkFlag = false;
            nodeOrder.forEach(item => {
                item.hide();
            })
        } else if (state === 2) {
            nodeOrder.forEach(item => {
                item.g.remove();
                item.left_line.remove();
                item.right_line.remove();
                item.left_text.remove();
                item.right_text.remove();
            })
            nodes.forEach(item => {
                item.g.remove();
            })
            if (cal_huffman_tree()) {
                state = 1;
            }

        }
    }

    /**
     * 计算huffman树
     */
    function cal_huffman_tree() {
        step = 0;
        // 统计个数
        let arr = new Array(MAX_NUM).fill(0);
        for(let i = 0; i < inputs.length; i++) {
            arr[i] = +inputs[i].value;
        }
 
        if (arr.every(item => item === 0)) {
            alert('请先调整字母权重哦');
            return false;
        }
        // 重置状态
        head = null;
        nodeSet = []; 
        order = 0;
        nodes = [];
        nodeOrder = [];
        nodeQueue = [];
        darkFlag = false;
        // 新创结点
        arr.forEach((item,index) => {
            if (item) {
                let node = new treeNode(item, null, null, 0);
                node.letter = String.fromCharCode(65+index);
                nodeSet.push(node);
                nodes.push(node);
            }
        })      
        while(nodeSet.length > 1) {
            nodeSet.sort((a,b) => a.num-b.num);
            let left = nodeSet.shift();
            let right = nodeSet.shift();
            let dep = left.depth > right.depth ? left.depth : right.depth;
            let node = new treeNode(left.num+right.num, left, right, dep+1);
            nodeOrder.push(node);
            nodeSet.push(node);
        }
        head = nodeSet.shift();
        breadth_travel();
        inorder_travel(head);
        create_nodes();
        $('#next_huff_btn').unbind('click').click(next_huff_step).removeClass('disabled');
        $('#last_huff_btn').unbind('click').click(last_huff_step).removeClass('disabled');
        return true;
    }

    /**
     * 下一步
     */
    function next_huff_step() {
        if (step === nodeOrder.length) {
            [...nodes,...nodeOrder].forEach(item => {
                item.normalize();
            })
            return;
        }
        if (darkFlag) {
            nodeOrder[step-1].darken();
            darkFlag = false;
        } else {
            nodeOrder[step].show().hight_light();
            step++;
            darkFlag = true;
        }
        // if (step !== 0) {
        //     nodeOrder[step-1].darken();
        // }
        // nodeOrder[step].show().hight_light();
        // step++;
    }

    /**
     * 上一步
     * 
     * 如果是最后一步，则要隐藏0和1
     * 
     * step-1的结点要隐藏
     * [0..step-2]的结点已访问
     */
    function last_huff_step() {
        
        if(step === 0) {
            return;
        }
        if (step === nodeOrder.length) {
            nodeOrder.forEach(item => {
                item.hide_code();
            })
        }
        nodeOrder[step-1].hide();
        if (step > 1) {    
            for (let i = 0; i < step-1; i++) {
                nodeOrder[i].darken();
            }
        } 
        darkFlag = false;
        step--;
    }
    /**
     * 对结点排序
     * 
     * 左子树权重小于右子树
     * 权重相同的，选较矮的
     */
    function sort_node(a, b) {
        if (a.num === b.num) {
            return a.depth - b.depth;
        }
        return a.num - b.num;
    }

    /**
     * 广度遍历
     * 得到y坐标
     */
    function breadth_travel() {
        if (head === null) {
            return;
        }
        nodeQueue.push(head);
        head.layer = 0;
        let n = 1; // 保存此层个数
        while (nodeQueue.length) {
            let num = 0;
            for (let i = 0; i < n; i++) {
                let node = nodeQueue.shift();
                if (node.left) {
                    node.left.layer = node.layer + 1;
                    nodeQueue.push(node.left);
                    num++;
                }
                if (node.right) {
                    node.right.layer = node.layer + 1;
                    nodeQueue.push(node.right);
                    num++;
                }
            }
            n = num;
        }
    }

    /**
     * 中序遍历
     * 得到x坐标
     * 
     * @param {顶点} head 
     */
    function inorder_travel(head) {
        if (head === null) {
            return;
        }
        head.left && inorder_travel(head.left);
        head.order = order++;
        
        //console.log(head.order, head.num);
        head.right && inorder_travel(head.right);
    }

    /**
     *  创建结点
     */
    function create_nodes() {
        let offsetX = MAX_NUM - nodes.length;
        let offsetY = Math.ceil((MAX_NUM-1-head.depth)/2);
        //console.log(offsetX, offsetY);
        [...nodeOrder,...nodes].forEach(item => {
            item.create_node(svg, spliter, offsetX, offsetY);
        })
        nodeOrder.forEach(item => {
            item.create_line(svg, spliter);
            item.hide();
        })
    }

    /**
     * 导入一些事例
     */
    function load_example() {
        let index = $(this).index();
        if(state === 1) {
            $('#next_huff_btn').addClass('disabled').unbind('click');
            $('#last_huff_btn').addClass('disabled').unbind('click');
            state = 2;
        }
        let examples = [
            [8,14,10,4,18,0,0],
            [5,20,30,15,26,12,20],
            [1,2,3,4,5,0,0],
            [1,2,4,8,16,32,64]
        ];
        examples[index].forEach((item, i) => {
            inputs[i].value = item;
            ranges[i].value = item;
        })
        //导入后开始
        begin_btn_pressed();

    }

   
})