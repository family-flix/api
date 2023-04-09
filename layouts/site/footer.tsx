const WebsiteFooter = () => {
  return (
    <div className="bg-gray-900">
      <div className="w-full py-8 px-4 text-gray-100 text-center md:mx-auto md:w-260 md:p-10">
        <div className="inline-flex items-center justify-between">
          <div className="inline-block space-x-4 text-sm text-gray-300 md:text-md">
            {/* <p className="inline-block cursor-pointer">
		    <a className="text-gray-300" href="/changelog" target="_blank">
		      过去与未来
		    </a>
		  </p> */}
            {/* <p className="inline-block cursor-pointer">
		    <a className="text-gray-300" href="/help" target="_blank">
		      帮助文档
		    </a>
		  </p> */}
            {/* <p className="inline-block cursor-pointer">问题反馈</p>
		  <p className="inline-block cursor-pointer">联系我们</p> */}
            {/* <img
              className="w-48 h-48"
              src="https://static.ltaoo.work/litao-qrcode.png"
            /> */}
          </div>
        </div>
        <div className="block mt-12 text-center text-gray-400">
          <a
            href="https://beian.miit.gov.cn"
            className="text-gray-400"
            target="_blank"
            rel="noreferrer"
          >
            <div>浙ICP备2021007841号-2</div>
          </a>
          <div>Copyright © 2021-2023 funzm.com All Rights Reserved</div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteFooter;
