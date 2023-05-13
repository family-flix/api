export const USER_ID = process.env.USER_ID;
export const DRIVE_ID = process.env.DRIVE_ID;

export const code = `const oo = document;
const jj = JSON;
const ll = localStorage;
function m() {
    const DEVICE_ID_KEY_IN_COOKIE = "cna";
    const user = jj.parse(ll.getItem("token") || "null");
    if (user === null) {
        alert("请先登录");
        return;
    }
    const cookies = pp(oo.cookie);
    const device_id = cookies[DEVICE_ID_KEY_IN_COOKIE];
    if (!device_id) {
        alert("请先登录");
        return;
    }
    const {access_token, avatar, default_drive_id, expire_time, nick_name, refresh_token, user_id, user_name, } = user;
    const result = {
        app_id: window.Global.app_id,
        access_token,
        avatar,
        drive_id: default_drive_id,
        device_id,
        nick_name,
        refresh_token,
        aliyun_user_id: user_id,
        user_name,
    };
    const result_str = jj.stringify(result);
    cc(result_str);
    console.log("云盘信息已复制到粘贴板，请粘贴到新增云盘处");
    return result_str;
}
function pp(cookie_str) {
    if (!cookie_str) {
        return {};
    }
    const result = {};
    const key_and_values = cookie_str.split("; ");
    for (let i = 0; i < key_and_values.length; i += 1) {
        const [key,value] = key_and_values[i].split("=");
        result[key] = value;
    }
    return result;
}
function cc(str) {
    const textArea = oo.createElement("textarea");
    textArea.value = str;
    oo.body.appendChild(textArea);
    textArea.select();
    oo.execCommand("copy");
    oo.body.removeChild(textArea);
}
m();`;

const code_prefix = "";
// 压缩后的代码
export const code_get_drive_token = `${code_prefix}const oo=document,jj=JSON,ll=localStorage;function m(){const e=jj.parse(ll.getItem("token")||"null");if(null===e)return void alert("请先登录");const o=pp(oo.cookie).cna;if(!o)return void alert("请先登录");const{access_token:n,avatar:t,default_drive_id:r,expire_time:i,nick_name:c,refresh_token:a,user_id:l,user_name:s}=e,d={app_id:window.Global.app_id,access_token:n,avatar:t,drive_id:r,device_id:o,nick_name:c,refresh_token:a,aliyun_user_id:l,user_name:s},u=jj.stringify(d);return cc(u),console.log("云盘信息已复制到粘贴板，请粘贴到新增云盘处"),u}function pp(e){if(!e)return{};const o={},n=e.split("; ");for(let e=0;e<n.length;e+=1){const[t,r]=n[e].split("=");o[t]=r}return o}function cc(e){const o=oo.createElement("textarea");o.value=e,oo.body.appendChild(o),o.select(),oo.execCommand("copy"),oo.body.removeChild(o)}m();`;

export enum FileType {
  File = 1,
  Folder = 2,
}
