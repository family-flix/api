
const name_regexp_str = "[\\u0400-\\u04FF\\u0800-\\u4e00\\u4e00-\\u9fa5\\uac00-\\ud7a30-9a-zA-Z]{1,}[ \\.\\-&!,'（）：！？～×－\\u0400-\\u04FF\\u0800-\\u4e00\\u4e00-\\u9fa5\\uac00-\\ud7a30-9a-zA-Z]{1,}[）\\u0400-\\u04FF\\u0800-\\u4e00\\u4e00-\\u9fa5\\uac00-\\ud7a30-9a-zA-Z!！？－]";
const name_regexp = new RegExp(name_regexp_str);

const input = "1080.1080";
const match = input.match(name_regexp);
console.log(`Input: ${input}, Match: ${match ? match[0] : "null"}`);
