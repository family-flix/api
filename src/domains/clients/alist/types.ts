export type DriveAlistPayload = {
  url: string;
  token: string;
  root_folder_id?: string;
};

export type AlistFileResp = {
  name: string;
  size: number;
  is_dir: boolean;
  modified: string;
  created: string;
  sign: string;
  thumb: string;
  type: number;
  hashinfo: string;
  hash_info: {
    sha1: string;
  };
};

export type DriveAlistProfile = {
  name: string;
};
