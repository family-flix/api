export type ApplicationState = {
  root_path: string;
  //   env: {};
  //   args: {
  //     port: number;
  //   };
  env: {
    OUTPUT_PATH: string;
    PORT: string;
    WEAPP_SECRET: string;
    WEAPP_ID: string;
    VOICE_RECOGNIZE_SECRET_ID: string;
    VOICE_RECOGNIZE_SECRET_KEY: string;
    SHORT_LINK_USERNAME: string;
    SHORT_LINK_PASSWORD: string;
  };
  args: {
    port: number;
  };
};
