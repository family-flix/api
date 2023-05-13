require("dotenv").config();
import { store } from "@/store";

(async () => {
  // const name = '女武神';
  // const sql = `SELECT
  // tv.id,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.poster_path,searched_tv.first_air_date
  // FROM tv
  // LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id
  // WHERE searched_tv.name LIKE '%女武神%' OR searched_tv.original_name LIKE '%女武神%' AND tv.searched_tv_id != '' AND tv.hidden != 1;`;
  //   const fields =
  //     "tv.id,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.poster_path,searched_tv.first_air_date";
  //   let sql = `SELECT ${fields}
  //   	FROM tv LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id
  //   	WHERE searched_tv.name LIKE '%${name}%' AND tv.hidden != 1;`;
  //   const r = await store.operation.get(sql);
  const names = ["X 许你万家灯火 [2023][32集持续更新中]", "4K"];
  const target_name = names[0];
  const parent_names = names.slice(1);
  const parent_names_str = parent_names
    .map((n) => {
      return `'${n}'`;
    })
    .join(", ");
  console.log(target_name, parent_names);
  const sql = `WITH RECURSIVE cte AS (
	SELECT *, 0 AS level
	FROM folder
	WHERE name = '${target_name}'
	UNION ALL
	SELECT f.*, c.level + 1
	FROM folder f
	JOIN cte c ON f.parent_file_id = c.file_id
	WHERE c.level < ${names.length - 1}
	  AND f.name IN (${parent_names_str})
      )
      SELECT *
	FROM cte
	WHERE level = ${names.length - 1}
      `;
  const r = await store.operation.get(sql);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
})();
