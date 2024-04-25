export type XunleiDrivePayload = {
  account: string;
  token: string;
  root_folder_id?: string;
};

export type XunleiDriveFileResp = {
  /** 创建时间 2024-02-02 00:04:37 */
  createDate: string;
  /** 文件类型？ 1文件 0文件夹 */
  fileCata: number;
  /** 如果是文件夹，会有改字段，表示文件夹内的文件数 */
  fileCount: number;
  /** 缩略图 */
  icon: {
    largeUrl: string;
    smallUrl: string;
  };
  /** 文件/文件夹 id。文件 id 是18位字符串，文件夹是数字 */
  id: string;
  parentId: string;
  lastOpTime: string;
  md5: string;
  /** 媒体文件类型 3mp4  */
  mediaType: number;
  /** 文件名称 */
  name: string;
  rev: string;
  /** 文件大小 */
  size: number;
  starLabel: number;
};

export type XunleiDriveProfile = {
  name: string;
};
