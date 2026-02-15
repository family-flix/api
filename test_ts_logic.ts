
const original_filename = "知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧";
let cur_filename = ".1080.1080"; // Based on debug output

const remove_multiple_dot = () => {
    cur_filename = cur_filename.replace(/[\.]{2,}/g, "`").replace(/^\.{0,1}/, "");
};

remove_multiple_dot();
console.log("After remove_multiple_dot:", cur_filename);

const name_regexp = /[0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[ \.\-&!,'（）：！？～×－0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[）0-9a-zA-Z!！？－\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]/;

const match = cur_filename.match(name_regexp);
console.log("Match:", match ? match[0] : "null");
