export const USER_ID = process.env.USER_ID;
export const DRIVE_ID = process.env.DRIVE_ID;

export const code = `const d = document;
const j = JSON;
const l = localStorage;
function m() {
    const DEVICE_ID_KEY_IN_COOKIE = "cna";
    const user = j.parse(l.getItem("token") || "null");
    if (user === null) {
        alert("请先登录");
        return;
    }
    const cookies = p(d.cookie);
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
    const result_str = j.stringify(result);
    c(result_str);
    console.log("云盘信息已复制到粘贴板，请粘贴到新增云盘处");
    return result_str;
}
function p(cookie_str) {
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
function c(str) {
    const textArea = d.createElement("textarea");
    textArea.value = str;
    d.body.appendChild(textArea);
    textArea.select();
    d.execCommand("copy");
    d.body.removeChild(textArea);
}
m();`;

const code_prefix = "";
export const code_get_drive_token = `${code_prefix}var l=localStorage,j=JSON,d=document;function m(){var c=p(d.cookie),i="cna",u=j.parse(l.getItem("token")||"null");if(u===null){alert("请先登录");return}if(!c[i]){alert("请先登录");return}var t=u.access_token,a=u.avatar,d=u.default_drive_id,e=u.expire_time,n=u.nick_name,r=u.refresh_token,u=u.user_id,y=u.user_name,r={app_id:window.Global.app_id,access_token:t,avatar:a,drive_id:d,device_id:c[i],nick_name:n,refresh_token:r,aliyun_user_id:u,user_name:y};j=j.stringify(r);c(j);console.log("云盘信息已复制到粘贴板，请粘贴到新增云盘处");return j}function p(c){if(!c)return{};for(var t={},a=c.split("; "),i=0;i<a.length;i+=1){var e=a[i].split("=");t[e[0]]=e[1]}return t}function c(c){var t=d.createElement("textarea");t.value=c;d.body.appendChild(t);t.select();d.execCommand("copy");d.body.removeChild(t)}m();`;

export enum FileType {
  File = 1,
  Folder = 2,
}
