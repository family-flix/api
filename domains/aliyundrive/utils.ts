import crypto from "crypto";

export async function prepare_upload_file(
  file_buffer: Buffer,
  options: {
    token: string;
    upload_chunk_size?: number;
  }
) {
  const { token, upload_chunk_size = 10 * 1024 * 1024 } = options;
  async function get_part_info_list(fileSize: number) {
    const num_parts = Math.ceil(fileSize / upload_chunk_size);
    const part_info_list = [];
    for (let i = 1; i <= num_parts; i++) {
      part_info_list.push({ part_number: i });
    }
    return part_info_list;
  }
  async function get_proof_code(file_buffer: Buffer) {
    const md5_val = crypto.createHash("md5").update(Buffer.from(token, "utf8")).digest("hex");
    const md5_int = BigInt(`0x${md5_val.slice(0, 16)}`);
    const offset = parseInt((md5_int % BigInt(file_buffer.length)).toString(), 10);
    const bytes_to_read = Math.min(8, file_buffer.length - offset);
    const file_partial_buffer = file_buffer.slice(offset, offset + bytes_to_read);
    return Buffer.from(file_partial_buffer).toString("base64");
  }
  async function get_content_hash(file_buffer: Buffer) {
    const content_hash = crypto.createHash("sha1");
    for (let offset = 0; offset < file_buffer.length; offset += upload_chunk_size) {
      const segment = file_buffer.slice(offset, offset + upload_chunk_size);
      content_hash.update(segment);
    }
    const contentHashValue = content_hash.digest("hex").toUpperCase();
    return contentHashValue;
  }

  const file_size = file_buffer.length;
  const content_hash = await get_content_hash(file_buffer);
  const proof_code = await get_proof_code(file_buffer);
  const part_info_list = await get_part_info_list(file_size);
  const body = {
    part_info_list,
    //     type: "file",
    size: file_size,
    content_hash,
    //       content_hash_name: "sha1",
    proof_code,
    //     proof_version: "v1",
  };
  return body;
}
