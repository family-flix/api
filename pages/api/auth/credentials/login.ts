/**
 * @file 凭证登录
 */
import { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
// import { serialize } from "cookie";

// import { compare } from "@/lib/models/password";
// import { findUserByEmail } from "@/lib/models/user";
// import { encode } from "@/next-auth/jwt";
// import { INCORRECT_PASSWORD } from "@/lib/constants";
// import { DEFAULT_MAX_AGE, TOKEN_NAME } from "@/next-auth/constants";

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).required(),
});

export default async function provideCredentialsLoginService(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const credentials = req.body;
  try {
    await schema.validateAsync(credentials);
    const { email, password } = credentials;
    // authorize credentials
    // console.log('[]find user by email', email)
    const user = await findUserByEmail(email);
    // console.log('[]find user by email', email, user)
    if (!user) {
      return resp(400, res);
    }
    const isMatch = await compare(user.credential, password);
    if (!isMatch) {
      return resp(INCORRECT_PASSWORD, res);
    }

    // check permission or blacklist to prevent login.

    // generate jwt and set cookie
    const defaultToken = {
      id: user.id,
    };
    // console.log('[]before encode', defaultToken)
    const token = await encode({
      token: defaultToken,
      secret: process.env.SECRET,
    });

    const cookie = serialize(TOKEN_NAME, token, {
      maxAge: DEFAULT_MAX_AGE,
      expires: new Date(Date.now() + DEFAULT_MAX_AGE * 1000),
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "lax",
    });

    res.setHeader("Set-Cookie", cookie);
    resp(null, res);
  } catch (err) {
    resp(1000, res, err.message);
  }
}
