
const resolution_regexp = /（{0,1}(360|720|1080|2160)[pPiI]）{0,1}/;

const test1 = "1080";
console.log(`Testing '${test1}' with resolution regex:`, resolution_regexp.test(test1));

const test2 = "1080p";
console.log(`Testing '${test2}' with resolution regex:`, resolution_regexp.test(test2));

const test3 = "1080P";
console.log(`Testing '${test3}' with resolution regex:`, resolution_regexp.test(test3));

const test4 = "（1080p）";
console.log(`Testing '${test4}' with resolution regex:`, resolution_regexp.test(test4));
