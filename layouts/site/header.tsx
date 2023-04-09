import { useRouter } from "next/router";

const navigation: { name: string; href: string }[] = [
  // { name: "功能", href: "/" },
  // { name: "订阅", href: "/price" },
  // { name: "帮助中心", href: "/help" },
  // { name: "关于我们", href: "/about" },
];

const SiteHeader = (props: { user: null }) => {
  const { user } = props;

  const router = useRouter();

  return (
    <div className="header relative z-12">
      <div className="relative py-6 px-4 shadow sm:px-6 lg:px-8">
        <nav
          className="relative flex items-center justify-between sm:h-10"
          aria-label="Global"
        >
          <div className="logo flex items-center flex-grow flex-shrink-0 lg:flex-grow-0">
            <div className="flex items-center justify-between w-full md:w-auto">
              <a href="#">
                <span className="sr-only">Funzm</span>
              </a>
            </div>
          </div>
          <div className="flex items-center hidden md:block md:ml-10 md:pr-4 md:space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                className="inline font-medium text-gray-500 cursor-pointer hover:text-gray-900"
                href={item.href}
              >
                {item.name}
              </a>
            ))}
            {user ? (
              <div
                className="inline-flex rounded bg-gray-100 p-2 px-4 items-center font-medium text-green-600 cursor-pointer hover:text-green-500 dark:bg-gray-800"
                onClick={() => {
                  router.push({
                    pathname: "/dashboard",
                  });
                }}
              >
                个人中心
              </div>
            ) : (
              <div>
                <div className="inline font-medium text-green-600 cursor-pointer hover:text-green-500">
                  登录
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default SiteHeader;
