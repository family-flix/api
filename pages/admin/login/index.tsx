/**
 * @file 用户登录
 */
import { useRouter } from "next/router";

import { user } from "@/domains/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginPage = () => {
  const router = useRouter();

  return (
    <div className="center center--top">
      <div className="space-y-4 w-[480px]">
        <h1 className="h1 text-center">登录 AVIDEO</h1>
        <div className="mt-8">
          <Input
            placeholder="请输入邮箱"
            onChange={(event) => {
              user.input_email(event.target.value);
            }}
          />
        </div>
        <div>
          <Input
            placeholder="请输入密码"
            type="password"
            onChange={(event) => {
              user.input_password(event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1">
          <Button
            className="block"
            onClick={async () => {
              const resp = await user.login();
              if (resp.error) {
                return;
              }
              router.push("/admin");
            }}
          >
            登录
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
