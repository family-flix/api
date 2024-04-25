/**
 * 获取指定时间内新增影视剧
 */
import dayjs from "dayjs";

import { CollectionTypes, MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parseJSONStr, r_id } from "@/utils";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  //   const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  console.log("Start");
  //   const r = await store.prisma.$queryRaw`
  // SELECT DISTINCT m1.*
  // FROM play_history_v2 m1
  // JOIN media m2 ON m1.id = m2.media_id
  // JOIN (
  //     SELECT model2_id, MAX(created) AS max_created
  //     FROM media_source
  //     GROUP BY media_id
  // ) m3_max ON m2.id = m3_max.media_id
  // LEFT JOIN media_source m3 ON m2.media_source_id = m3.id AND m3.created = m3_max.max_created
  // WHERE m1.updated < COALESCE(m3.created, '1970-01-01')
  // `;
  const r = await store.prisma.$queryRaw`
SELECT DISTINCT m1.*, m4.*
FROM PlayHistoryV2 m1 
JOIN ( 
  SELECT 
      m2.id as media_id, 
      MAX(m3.created) AS max_media_source_created,
      m2.profile_id
  FROM 
      Media m2 
  JOIN 
      MediaSource m3 ON m2.id = m3.media_id 
  GROUP BY 
      m2.id 
) latest_media_source
ON m1.media_id = latest_media_source.media_id 
JOIN MediaProfile m4 ON latest_media_source.profile_id = m4.id
WHERE m1.updated < latest_media_source.max_media_source_created 
ORDER BY m1.updated DESC 
LIMIT 10;
  `;
//   const r = await store.prisma.$queryRaw`
// SELECT m2.id as media_id, MAX(m3.created) AS max_media_source_created
// FROM Media m2
// JOIN MediaSource m3 ON m2.id = m3.media_id
// GROUP BY m2.id
// `;
  //   const r = await store.prisma.$executeRaw`
  // SELECT m1.* FROM play_history_v2 m1
  // JOIN (
  // SELECT
  // 	m2.model1_id,
  // 	m3.created AS max_model3_created
  // FROM
  // 	model2 m2
  // JOIN (
  // 	SELECT
  // 	model3.*,
  // 	ROW_NUMBER() OVER (PARTITION BY model2_id ORDER BY created DESC) as row_num
  // 	FROM
  // 	model3
  // ) m3
  // ON m2.model3_id = m3.id AND m3.row_num = 1
  // ) m2_latest
  // ON m1.id = m2_latest.model1_id
  // WHERE m1.updated < m2_latest.max_model3_created`;
  console.log(r);
  console.log("Success");
}

main();
