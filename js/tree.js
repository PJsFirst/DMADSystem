class treeNode{
    constructor(num, left, right, depth) {
        this.num = num;
        this.left = left;
        this.right = right;
        this.depth = depth;
    }
}
//A-G一共7个
var MAX_NUM = 7;
$(function() {
    // ------------------------------------------------------- //
    // Sidebar
    // ------------------------------------------------------ //
    $('.sidebar-toggler').on('click', function () {
        $('.sidebar').toggleClass('shrink show');
    });
    $('[data-toggle="tooltip"]').tooltip();
    $('#keyboard').delegate('button', 'click', keys_press);
    $('#delete_btn').click(delete_btn_press);
    $('#clear_btn').click(clear_btn_press);
    $('#begin_huff_btn').click(cal_huffman_tree);

    // 虚拟电脑屏幕
    let screen = $('#computer');

    // 结点
    let head = null;
    let nodeSet = []; // 目前结点
    let order = 0; // 中序遍历的序号
    let nodeOrder = [];

    /**
     * 虚拟按键按下，A-G
     * 
     * A的ASCII码是65
     */
    function keys_press() {
        let index = $(this).index();
        let c = String.fromCharCode((65 + index))
        let html = screen.html().trim();
        screen.html(html+c);
    }

    /**
     * 虚拟删除键按下
     */
    function delete_btn_press() {
        let html = screen.html().trim();
        if (html) {
            html = html.slice(0, html.length-1);
        }
        screen.html(html);
    }

    /**
     * 虚拟清空键按下
     */
    function clear_btn_press() {
        screen.html('');
    }

    /**
     * 计算huffman树
     */
    function cal_huffman_tree() {
        let text = screen.html();
        if (text === null) {
            alert('文本不能为空');
            return;
        }
        // 统计个数
        let arr = new Array(MAX_NUM).fill(0);
        for(let i = 0; i < text.length; i++) {
            arr[text[i].charCodeAt(0)-65]++;
        }
        arr.forEach(item => {
            if (item) {
                let node = new treeNode(item, null, null, 0);
                nodeSet.push(node);
            }
        })      
        while(nodeSet.length > 1) {
            nodeSet.sort((a,b) => a.num-b.num);
            let left = nodeSet.shift();
            let right = nodeSet.shift();
            let dep = left.depth > right.depth ? left.depth : right.depth;
            let node = new treeNode(left.num+right.num, left, right, dep+1);
            nodeSet.push(node);
        }
        head = nodeSet.shift();
        inorder_travel(head);
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
     * 中序遍历
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
})