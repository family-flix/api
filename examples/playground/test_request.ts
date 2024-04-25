import axios from "axios";

async function main() {
  const r = await axios.post(
    "https://api.aliyundrive.com/adrive/v3/file/list",
    {
      all: false,
      parent_file_id: "6404b656fbfa4b3295504e6b89ae138aadddb102",
      drive_id: "528581012",
      limit: 20,
      marker:
        "WyI2NDA0YjY1NmZiZmE0YjMyOTU1MDRlNmI4OWFlMTM4YWFkZGRiMTAyIiwibiIsIm4iLDEsMCwiV29tYW4uSW4uQS5GYW1pbHkuT2YuU3dvcmRzbWFuLjIwMTQuRVAwNC5XRUItREwuNEsuSDI2NC5BQUMtTVlaLm1wNCIsIjY0MDRiNjU3MTYyZWVmYWNmN2E4NDAwOGE0YTE4MGNkZjQ3MzVkNGQiXQ==",
      order_by: "name",
      order_direction: "DESC",
      image_thumbnail_process: "image/resize,w_256/format,jpeg",
      image_url_process: "image/resize,w_1920/format,jpeg/interlace,1",
      url_expire_sec: 14400,
      video_thumbnail_process: "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
    },
    {
      headers: {
        authority: "api.aliyundrive.com",
        Host: "api.aliyundrive.com",
        Cookie:
          "_nk_=t-2213376065375-52; _tb_token_=5edd38eb839fa; cookie2=125d9fb93ba60bae5e04cf3a4f1844ce; csg=7be2d6ea; munb=2213376065375; t=cc514082229d35fa6e4cb77f9607a31a; isg=BPv7iSICHO8ckiBhqmD_qx8rgNtlUA9S5UNxz-241_oRTBsudSCfohmeYGIC92dK; l=Al1dbs-eO-pLLQIH1VDqMyQKbSJXe5HM; cna=XiFcHCbGiCMCAX14pqXhM/U9",
        "content-type": "application/json; charset=UTF-8",
        accept: "*/*",
        "x-umt": "xD8BoI9LPBwSmhKGWfJem6nHQ7xstNFA",
        "x-sign":
          "izK9q4002xAAJGGHrNSHxqaOJAfmJGGEYjdc0ltNpMTdx5GeaXDSRaCtwKwEG0Rt2xgVv6dPLJBixqXoMb0l07OzsyxxtGGEYbRhhG",
        "x-canary": "client=iOS,app=adrive,version=v4.1.3",
        "x-sgext":
          "JAdnylkEyyzme4p+deZ0j8pS+lbpVvxQ/FXpVvhV6UT7Uf1R/Fb7X/5V6Vf6V/xX+lf6V/pX+lf6V/pE+kT6RPpX6Vf6V/pE+kT6RPpE+kT6RPpE+kT6RPpX+lf6",
        "accept-language": "en-US,en;q=0.9",
        "x-mini-wua":
          "iMgQmyQ0xADdEBzKwoGPtradgjIKF60kuQM769eBYB2c50VY3P9sTHE9tE0cGiP5vuxcym4QSf7t9oByybyv6yjXYIVOyToCAp95eIvBq5wBbCWvYsWC59frqvGYDlw7wmbOPxp04i3dZUs3Af6Y2dQDY+TG5eOUXMeaMAT7qFkinOA==",
        "user-agent":
          "AliApp(AYSD/4.1.3) com.alicloud.smartdrive/4.1.3 Version/16.3 Channel/201200 Language/en-CN /iOS Mobile/iPhone12,3",
        referer: "https://www.aliyundrive.com/",
        origin: "https://www.aliyundrive.com/",
        authorization:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NDk0Y2QwYTBmNGY0OGJmOTA3NWYzMjE3NGE3OTQ4YiIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwicEpaSW5OSE4yZFpXazhxZ1wiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJGSUxFLkFMTFwiLFwiVklFVy5BTExcIixcIlNIQVJFLkFMTFwiLFwiU1RPUkFHRS5BTExcIixcIlNUT1JBR0VGSUxFLkxJU1RcIixcIlVTRVIuQUxMXCIsXCJCQVRDSFwiLFwiQUNDT1VOVC5BTExcIixcIklNQUdFLkFMTFwiLFwiSU5WSVRFLkFMTFwiLFwiU1lOQ01BUFBJTkcuTElTVFwiXSxcInJvbGVcIjpcInVzZXJcIixcInJlZlwiOlwiXCIsXCJkZXZpY2VfaWRcIjpcIjExMjhmNmRjNTJhMjRlZmNiMWI5OGJmYjkzZmMwNjQ4XCJ9IiwiZXhwIjoxNjc5OTg4MjAxLCJpYXQiOjE2Nzk5ODA5NDF9.Rfb7DPTfuoMbyBblfpcAwogNGjQ-mVOmiiIOHxsLB0x6Use7c9sABg7pMRPwuEW5SXb7yxHkpc0yTXMZ3sp5V9U88EHzsK2Mm_pVRshNiGLjlkeQijTHPMVi6LtBzbRrMIkXlSRmnJaTH81gpahgZZF-jWbSSrQgXdr-z4LnjLk",
        "x-device-id": "ucJ7HMyJ3WUCAXPuK4KozD7F",
        "x-signature":
          "f4b7bed5d8524a04051bd2da876dd79afe922b8205226d65855d02b267422adb1e0d8a816b021eaf5c36d101892180f79df655c5712b348c2a540ca136e6b22001",
      },
    }
  );
  console.log(r.data);
}

main();
