// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import jwt_decode from "jwt-decode";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  if (!authorization) {
    return e("please login");
  }
  const decoded = jwt_decode(authorization);
  // const payload = jwt.verify(authorization, "");
  res.status(200).json({ code: 0, msg: "", data: decoded });
}
